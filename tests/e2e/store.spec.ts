import { expect, test } from "@playwright/test";
import {
  catalogPackages,
  createDashboard,
  createOrder,
  mockCatalog,
} from "./fixtures/store";

async function addProduct(page: import("@playwright/test").Page, packageId: string) {
  const fixturePackage = catalogPackages.find((entry) => entry.id === packageId);
  if (fixturePackage?.category === "rank") {
    await page.getByRole("button", { name: "RANKY" }).click();
  } else if (fixturePackage?.category === "keys") {
    await page.getByRole("button", { name: "KLÍČE" }).click();
  }

  await page
    .getByTestId(`store-product-${packageId}`)
    .getByRole("button", { name: /Přidat .* do košíku/ })
    .click();
}

test("store categories use API category for current and future package IDs", async ({
  page,
}) => {
  await mockCatalog(page);
  await page.goto("/store");

  const categorySelector = page.getByRole("group", { name: "Kategorie store" });
  await expect(categorySelector.getByRole("button", { name: "KLÍČE" })).toBeVisible();
  await expect(categorySelector.getByRole("button", { name: "RANKY" })).toBeVisible();
  await expect(categorySelector.getByRole("button", { name: "Vše" })).toHaveCount(0);
  await expect(page.getByText("Začni bezpečně")).toHaveCount(0);
  await expect(page.getByText("Zkontrolovat účet")).toHaveCount(0);

  await page.getByRole("button", { name: "KLÍČE" }).click();
  await expect(
    page.getByTestId("store-product-pkg_voyager"),
  ).toHaveCount(0);
  for (const packageId of [
    "pkg_key_uncommon",
    "pkg_key_rare",
    "pkg_key_legendary",
    "pkg_key_luminite",
    "pkg_key_lildragon",
  ]) {
    await expect(page.getByTestId(`store-product-${packageId}`)).toBeVisible();
  }

  await page.getByRole("button", { name: "RANKY" }).click();
  await expect(
    page.getByTestId("store-product-pkg_voyager"),
  ).toBeVisible();
  await expect(page.getByText("Prefix v chatu")).toBeVisible();
  await expect(page.getByTestId("store-product-pkg_key_uncommon")).toHaveCount(
    0,
  );
});

test("Figma store layout has no horizontal overflow at target widths", async ({
  page,
}) => {
  await mockCatalog(page);

  for (const width of [1920, 1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: Math.min(1080, width) });
    await page.goto("/store");
    await expect(page.getByRole("button", { name: "KLÍČE" })).toBeVisible();
    await expect(page.getByTestId("store-cart")).toBeVisible();
    await expect(page.getByTestId("store-product-pkg_key_uncommon")).toBeVisible();

    const horizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(horizontalOverflow, `viewport ${width}px`).toBeLessThanOrEqual(1);
  }
});

test("cart sends one rank and stacked keys with no client price", async ({
  page,
}) => {
  await mockCatalog(page);
  let capturedBody: unknown = null;

  await page.route("**/api/store/orders", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }

    capturedBody = route.request().postDataJSON();
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        order: createOrder({
          id: "ord_cart",
          totalPriceCzk: 149,
        }),
      }),
    });
  });

  await page.route("**/api/store/orders/ord_cart/checkout", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        checkout: {
          checkoutUrl: "/account?checkout=ord_cart",
          expiresAt: "2026-07-25T11:00:00.000Z",
        },
        order: createOrder({
          id: "ord_cart",
          totalPriceCzk: 149,
        }),
      }),
    });
  });

  await page.goto("/store");
  await addProduct(page, "pkg_voyager");
  await addProduct(page, "pkg_key_uncommon");
  await addProduct(page, "pkg_key_uncommon");
  await addProduct(page, "pkg_key_rare");

  await expect(
    page.getByTestId("cart-quantity-pkg_key_uncommon"),
  ).toHaveText("2");
  await expect(page.getByTestId("cart-total")).toContainText("149");

  await page.getByTestId("store-checkout").click();
  await page.waitForURL(/\/account\?checkout=ord_cart/);

  expect(capturedBody).toEqual({
    items: [
      { packageId: "pkg_voyager", quantity: 1 },
      { packageId: "pkg_key_uncommon", quantity: 2 },
      { packageId: "pkg_key_rare", quantity: 1 },
    ],
  });
});

test("selecting a new rank replaces the previous rank", async ({ page }) => {
  await page.route("**/api/store/packages", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        packages: [
          catalogPackages[0],
          {
            ...catalogPackages[0],
            id: "pkg_warden",
            slug: "warden",
            name: "Warden",
            priceCzk: 149,
          },
        ],
      }),
    });
  });
  await page.route("**/api/account/dashboard", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(createDashboard()),
    });
  });

  await page.goto("/store");
  await addProduct(page, "pkg_voyager");
  await addProduct(page, "pkg_warden");

  await expect(page.getByTestId("cart-line-pkg_voyager")).toHaveCount(0);
  await expect(page.getByTestId("cart-line-pkg_warden")).toBeVisible();
  await expect(page.getByTestId("cart-quantity-pkg_warden")).toHaveText(
    "1× rank",
  );
});

test("account readiness names both missing links and blocks checkout request", async ({
  page,
}) => {
  let createOrderCalls = 0;
  await mockCatalog(page, { ready: false });
  await page.route("**/api/store/orders", async (route) => {
    if (route.request().method() === "POST") {
      createOrderCalls += 1;
    }

    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({
        error: {
          code: "UNEXPECTED_REQUEST",
          message: "Order request neměl být odeslaný.",
        },
      }),
    });
  });

  await page.goto("/store");
  await addProduct(page, "pkg_key_uncommon");

  await expect(
    page.getByRole("link", { name: "Chybí propojení Minecraftu" }),
  ).toHaveAttribute("href", "/account#minecraft-link");
  await expect(
    page.getByRole("link", { name: "Chybí propojení Discordu" }),
  ).toHaveAttribute("href", "/account#discord-link");
  await expect(page.getByTestId("store-checkout")).toBeDisabled();

  await page.getByTestId("store-checkout").evaluate((button) => {
    (button as HTMLButtonElement).click();
  });
  expect(createOrderCalls).toBe(0);
});

test("cart survives login redirect and returns safely to store", async ({
  page,
}) => {
  let authenticated = false;
  await mockCatalog(page, {
    isAuthenticated: () => authenticated,
  });
  await page.route("**/api/auth/login", async (route) => {
    authenticated = true;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        user: {
          id: "user-store",
          email: "store@valtherea.eu",
          minecraftName: "StoreHero",
          discordName: "store_hero",
        },
      }),
    });
  });

  await page.goto("/store");
  await addProduct(page, "pkg_key_uncommon");
  await page.getByTestId("store-checkout").click();

  await expect(page).toHaveURL(/\/login\?next=%2Fstore/);
  await page.getByLabel("E-mail").fill("store@valtherea.eu");
  await page.getByLabel("Heslo").fill("StrongPass123");
  await page.getByRole("button", { name: "Přihlásit se" }).click();

  await expect(page).toHaveURL(/\/store$/);
  await expect(page.getByTestId("cart-line-pkg_key_uncommon")).toBeVisible();
  await expect(
    page.getByTestId("cart-quantity-pkg_key_uncommon"),
  ).toHaveText("1");
});

test("login rejects malicious external next URL", async ({ page }) => {
  await page.route("**/api/auth/login", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        user: {
          id: "user-safe",
          email: "safe@valtherea.eu",
          minecraftName: "",
          discordName: "",
        },
      }),
    });
  });
  await page.route("**/api/account/dashboard", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(createDashboard()),
    });
  });
  await page.route("**/api/store/orders", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ orders: [] }),
    });
  });

  await page.goto("/login?next=https%3A%2F%2Fevil.example%2Fsteal");
  await page.getByLabel("E-mail").fill("safe@valtherea.eu");
  await page.getByLabel("Heslo").fill("StrongPass123");
  await page.getByRole("button", { name: "Přihlásit se" }).click();

  await expect(page).toHaveURL(/\/account$/);
  expect(new URL(page.url()).hostname).toBe("127.0.0.1");
});

test("Stripe return waits for backend payment and delivery status", async ({
  page,
}) => {
  const awaitingOrder = createOrder();
  const paidOrder = createOrder({
    status: "delivery_pending",
    orderStatus: "delivery_queued",
    paymentStatus: "succeeded",
    deliveryStatus: "queued",
    checkout: null,
  });
  let detailCalls = 0;

  await page.route("**/api/account/dashboard", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ...createDashboard(),
        stats: { ordersCount: 1 },
        recentOrders: [awaitingOrder],
      }),
    });
  });
  await page.route("**/api/store/orders", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ orders: [awaitingOrder] }),
    });
  });
  await page.route(
    "**/api/store/orders/ord_store_1234567890",
    async (route) => {
      detailCalls += 1;
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          order: detailCalls === 1 ? awaitingOrder : paidOrder,
        }),
      });
    },
  );

  await page.goto(
    "/account?checkout=ord_store_1234567890&paid=1",
  );

  await expect(
    page.getByRole("heading", { name: "Ověřujeme stav platby" }),
  ).toBeVisible();
  await expect(
    page.getByTestId("payment-return-status").getByText("zaplaceno"),
  ).toBeVisible();
  await expect(
    page.getByTestId("payment-return-status").getByText("ve frontě"),
  ).toBeVisible();
  await expect(page.getByText("Platba byla přijata")).toHaveCount(0);
});

test("cancel return displays actual cancelled status and never marks paid", async ({
  page,
}) => {
  const cancelledOrder = createOrder({
    status: "cancelled",
    orderStatus: "cancelled",
    paymentStatus: "cancelled",
    deliveryStatus: "not_ready",
    checkout: null,
  });

  await page.route("**/api/account/dashboard", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ...createDashboard(),
        stats: { ordersCount: 1 },
        recentOrders: [cancelledOrder],
      }),
    });
  });
  await page.route("**/api/store/orders", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ orders: [cancelledOrder] }),
    });
  });
  await page.route(
    "**/api/store/orders/ord_store_1234567890",
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ order: cancelledOrder }),
      });
    },
  );

  await page.goto(
    "/account?checkout=ord_store_1234567890&cancelled=1",
  );

  await expect(
    page.getByRole("heading", { name: "Checkout nebyl dokončen" }),
  ).toBeVisible();
  await expect(
    page.getByTestId("payment-return-status").getByText("zrušena"),
  ).toBeVisible();
  await expect(
    page.getByTestId("payment-return-status").getByText("zaplaceno"),
  ).toHaveCount(0);
});

test("checkout error preserves cart and retry reuses created order", async ({
  page,
}) => {
  await mockCatalog(page);
  let createCalls = 0;
  let checkoutCalls = 0;

  await page.route("**/api/store/orders", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }

    createCalls += 1;
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        order: createOrder({ id: "ord_retry" }),
      }),
    });
  });
  await page.route(
    "**/api/store/orders/ord_retry/checkout",
    async (route) => {
      checkoutCalls += 1;

      if (checkoutCalls === 1) {
        await route.fulfill({
          status: 502,
          contentType: "application/json",
          body: JSON.stringify({
            error: {
              code: "CHECKOUT_TEMPORARILY_UNAVAILABLE",
              message: "Checkout je dočasně nedostupný.",
            },
          }),
        });
        return;
      }

      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          checkout: {
            checkoutUrl: "/account?checkout=ord_retry",
            expiresAt: null,
          },
          order: createOrder({ id: "ord_retry" }),
        }),
      });
    },
  );

  await page.goto("/store");
  await addProduct(page, "pkg_key_uncommon");
  await page.getByTestId("store-checkout").dblclick();

  await expect(page.getByText("Checkout je dočasně nedostupný.")).toBeVisible();
  await expect(page.getByTestId("cart-line-pkg_key_uncommon")).toBeVisible();
  expect(createCalls).toBe(1);
  expect(checkoutCalls).toBe(1);

  await page.getByTestId("store-checkout").click();
  await page.waitForURL(/\/account\?checkout=ord_retry/);
  expect(createCalls).toBe(1);
  expect(checkoutCalls).toBe(2);
});
