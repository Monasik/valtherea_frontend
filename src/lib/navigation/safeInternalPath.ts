const INTERNAL_BASE_URL = "https://valtherea.internal";

export function sanitizeInternalPath(
  candidate: string | null | undefined,
  fallback = "/account",
) {
  if (
    !candidate ||
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(candidate)
  ) {
    return fallback;
  }

  try {
    const base = new URL(INTERNAL_BASE_URL);
    const target = new URL(candidate, base);

    if (target.origin !== base.origin) {
      return fallback;
    }

    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return fallback;
  }
}

export function appendInternalSearchParam(
  path: string,
  key: string,
  value: string,
) {
  const safePath = sanitizeInternalPath(path);
  const target = new URL(safePath, INTERNAL_BASE_URL);
  target.searchParams.set(key, value);
  return `${target.pathname}${target.search}${target.hash}`;
}

export function normalizeCheckoutDestination(
  checkoutUrl: string,
  currentOrigin: string,
) {
  if (
    !checkoutUrl ||
    checkoutUrl.startsWith("//") ||
    checkoutUrl.includes("\\")
  ) {
    return null;
  }

  try {
    const target = new URL(checkoutUrl, currentOrigin);

    if (target.origin === currentOrigin) {
      return `${target.pathname}${target.search}${target.hash}`;
    }

    if (target.protocol === "https:") {
      return target.toString();
    }

    return null;
  } catch {
    return null;
  }
}
