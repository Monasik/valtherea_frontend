import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_PAYMENT_WEBHOOK_BODY_LIMIT_BYTES = 128 * 1024;

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

const UNSAFE_RESPONSE_HEADERS = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

function getBackendBaseUrl() {
  if (process.env.BACKEND_INTERNAL_URL) {
    return process.env.BACKEND_INTERNAL_URL.replace(/\/+$/, "");
  }

  if (process.env.NODE_ENV !== "production") {
    return (process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:4000").replace(/\/+$/, "");
  }

  throw new Error("BACKEND_INTERNAL_URL is required in production.");
}

function getPaymentWebhookBodyLimitBytes() {
  const configured = Number(process.env.PAYMENT_WEBHOOK_BODY_LIMIT_BYTES);
  return Number.isSafeInteger(configured) && configured > 0
    ? configured
    : DEFAULT_PAYMENT_WEBHOOK_BODY_LIMIT_BYTES;
}

function isPaymentWebhookRequest(request: NextRequest) {
  return request.nextUrl.pathname.startsWith("/api/payments/webhooks/");
}

function webhookBodyTooLargeResponse() {
  return Response.json(
    {
      error: {
        code: "WEBHOOK_BODY_TOO_LARGE",
        message: "Telo pozadavku prekrocilo povoleny limit.",
      },
    },
    { status: 413 },
  );
}

async function readBodyWithLimit(
  request: NextRequest,
  limitBytes: number,
) {
  if (!request.body) {
    return new ArrayBuffer(0);
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    totalBytes += value.byteLength;

    if (totalBytes > limitBytes) {
      await reader.cancel();
      return null;
    }

    chunks.push(value);
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;

  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return body.buffer;
}

function buildTargetUrl(request: NextRequest) {
  const backendBaseUrl = getBackendBaseUrl();
  const pathname = request.nextUrl.pathname.replace(/^\/api/, "");
  return `${backendBaseUrl}/api${pathname}${request.nextUrl.search}`;
}

function buildHealthTargetUrl() {
  return `${getBackendBaseUrl()}/health`;
}

function buildForwardHeaders(request: NextRequest) {
  const headers = new Headers();

  request.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  headers.set("x-forwarded-host", request.nextUrl.host);
  headers.set("x-forwarded-proto", request.nextUrl.protocol.replace(":", ""));

  return headers;
}

function sanitizeVaryHeader(value: string) {
  const fields = value
    .split(",")
    .map((field) => field.trim())
    .filter((field) => field && field.toLowerCase() !== "accept-encoding");

  return fields.length > 0 ? fields.join(", ") : null;
}

function shouldForwardResponseHeader(key: string) {
  return !UNSAFE_RESPONSE_HEADERS.has(key.toLowerCase());
}

function buildResponseHeaders(upstreamHeaders: Headers) {
  const headers = new Headers();

  upstreamHeaders.forEach((value, key) => {
    if (!shouldForwardResponseHeader(key)) {
      return;
    }

    if (key.toLowerCase() === "vary") {
      const sanitizedVary = sanitizeVaryHeader(value);

      if (sanitizedVary) {
        headers.append(key, sanitizedVary);
      }

      return;
    }

    headers.append(key, value);
  });

  return headers;
}

async function proxyRequest(request: NextRequest) {
  try {
    const headers = buildForwardHeaders(request);
    const hasBody = request.method !== "GET" && request.method !== "HEAD";
    let body: BodyInit | undefined;

    if (hasBody && isPaymentWebhookRequest(request)) {
      const bodyLimitBytes = getPaymentWebhookBodyLimitBytes();
      const advertisedLength = Number(request.headers.get("content-length"));

      if (
        Number.isFinite(advertisedLength) &&
        advertisedLength > bodyLimitBytes
      ) {
        return webhookBodyTooLargeResponse();
      }

      const rawBody = await readBodyWithLimit(request, bodyLimitBytes);

      if (!rawBody) {
        return webhookBodyTooLargeResponse();
      }

      body = rawBody;
    } else if (hasBody) {
      body = await request.text();
    }

    const targetUrl = buildTargetUrl(request);
    const upstreamResponse = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual",
    });

    const responseHeaders = buildResponseHeaders(upstreamResponse.headers);

    return new Response(hasBody || upstreamResponse.body ? await upstreamResponse.arrayBuffer() : null, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown proxy error";
    const isProduction = process.env.NODE_ENV === "production";
    const isConfigError = message.includes("BACKEND_INTERNAL_URL");

    return Response.json(
      {
        error: {
          code: isConfigError ? "BACKEND_PROXY_NOT_CONFIGURED" : "BACKEND_UNREACHABLE",
          message: isConfigError
            ? "Backend proxy neni nakonfigurovana."
            : "Backend je momentalne nedostupny.",
          details: {
            cause: isProduction && !isConfigError ? "Upstream request failed" : message,
          },
        },
      },
      { status: isConfigError ? 500 : 502 },
    );
  }
}

async function proxyBackendHealth() {
  try {
    const upstreamResponse = await fetch(buildHealthTargetUrl(), {
      cache: "no-store",
    });
    const body = await upstreamResponse.arrayBuffer();

    return new Response(body, {
      status: upstreamResponse.status,
      headers: {
        "content-type": upstreamResponse.headers.get("content-type") || "text/plain",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown health check error";
    const isConfigError = message.includes("BACKEND_INTERNAL_URL");

    return Response.json(
      {
        ok: false,
        error: isConfigError ? "BACKEND_PROXY_NOT_CONFIGURED" : "BACKEND_HEALTH_UNREACHABLE",
        message,
      },
      { status: isConfigError ? 500 : 502 },
    );
  }
}

export async function GET(request: NextRequest) {
  if (request.nextUrl.pathname === "/api/_backend-health") {
    return proxyBackendHealth();
  }

  return proxyRequest(request);
}

export async function POST(request: NextRequest) {
  return proxyRequest(request);
}

export async function PUT(request: NextRequest) {
  return proxyRequest(request);
}

export async function PATCH(request: NextRequest) {
  return proxyRequest(request);
}

export async function DELETE(request: NextRequest) {
  return proxyRequest(request);
}
