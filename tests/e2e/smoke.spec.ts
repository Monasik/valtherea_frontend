import { expect, test } from "@playwright/test";

test("homepage renders primary player path", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "VALTHEREA.EU", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("play.valtherea.eu").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Zkopírovat IP" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Discord" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Store" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Komunita" })).toBeVisible();
});

test("mobile homepage navigation stays usable without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.getByRole("button", { name: "Otevřít menu" })).toBeVisible();
  await page.getByRole("button", { name: "Otevřít menu" }).click();
  await expect(page.getByRole("navigation", { name: "Hlavní navigace" })).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "Hlavní navigace" })
      .getByRole("link", { name: "Pravidla" }),
  ).toBeVisible();

  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(horizontalOverflow).toBeLessThanOrEqual(1);
});

test("homepage preserves the approved hierarchy at target responsive widths", async ({
  page,
}) => {
  for (const width of [1920, 1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: Math.min(1080, width) });
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "VALTHEREA.EU", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Začni tady", exact: true }),
    ).toBeVisible();

    const horizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(horizontalOverflow, `viewport ${width}px`).toBeLessThanOrEqual(1);
  }
});

test("store page avoids public mock and preview wording", async ({ page }) => {
  await page.goto("/store");

  await expect(
    page.getByRole("heading", { name: "Store", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Nabídka balíčků" }),
  ).toBeVisible();
  await expect(page.getByText(/mock|preview/i)).toHaveCount(0);
});

test("public payment proxy rejects an oversized webhook before forwarding it", async ({
  request,
}) => {
  const response = await request.post("/api/payments/webhooks/stripe", {
    data: "x".repeat(128 * 1024 + 1),
    headers: {
      "content-type": "application/json",
    },
  });

  expect(response.status()).toBe(413);
  await expect(response.json()).resolves.toMatchObject({
    error: {
      code: "WEBHOOK_BODY_TOO_LARGE",
    },
  });
});

test("Next image optimizer renders the trusted local store asset", async ({
  request,
}) => {
  const response = await request.get(
    "/_next/image?url=%2Fassets%2Ffigma%2Fstore%2Fpackage-world.png&w=640&q=75",
  );

  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toMatch(/^image\//);
  expect((await response.body()).byteLength).toBeGreaterThan(0);
});

test("login registration validation matches eight character password", async ({ page }) => {
  await page.goto("/login");

  await page.getByRole("button", { name: "Registrace" }).click();
  const password = page.getByLabel("Heslo");

  await expect(password).toHaveAttribute("minlength", "8");
  await expect(password).toHaveAttribute("placeholder", "Alespoň 8 znaků");
});

test("account linking shows the in-game /link instruction", async ({ page }) => {
  await page.route("**/api/account/dashboard", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        profile: {
          id: "user-1",
          email: "hrac@valtherea.eu",
          minecraftName: "",
          discordName: "",
        },
        minecraft: {
          isLinked: false,
          username: null,
          uuid: null,
          linkedAt: null,
        },
        discord: {
          isLinked: false,
          userId: null,
          username: null,
          displayName: null,
          linkedAt: null,
          status: null,
        },
        readiness: {
          storeReady: false,
          blockedReasons: ["MINECRAFT_NOT_LINKED"],
        },
        stats: {
          ordersCount: 0,
        },
        store: {
          ready: false,
          blockedReasons: ["MINECRAFT_NOT_LINKED"],
          latestOrder: null,
        },
        activeLinkCode: {
          code: "ABCD12",
          expiresAt: "2026-05-23T22:00:00.000Z",
        },
        recentOrders: [],
      }),
    });
  });

  await page.route("**/api/store/orders", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ orders: [] }),
    });
  });

  await page.goto("/account");

  await expect(page.getByText("Na serveru napiš")).toBeVisible();
  await expect(page.getByText("/link ABCD12")).toBeVisible();
});

test("team page renders roster and named members", async ({ page }) => {
  await page.goto("/team");

  await expect(
    page.getByRole("heading", { name: "A-Team", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Členové A-Teamu" }),
  ).toBeVisible();
  await expect(page.getByText("Monasik")).toBeVisible();
  await expect(page.getByText("Brumiiczekk")).toBeVisible();
});

test("community page keeps primary support path visible", async ({ page }) => {
  await page.goto("/community");

  await expect(
    page.getByRole("heading", { name: "Komunita", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Discord je hlavní rozcestník"),
  ).toBeVisible();
});
