import { expect, type Page, test } from "@playwright/test";
import type { AdminCommerceOrderDetailResponse } from "../../src/lib/api/types";

const orderId = "ord_ops_2026";
const attemptId = "pay_ops_2026";
const jobId = "dlj_ops_2026";

const adminOverview = {
  stats: {
    players: 12,
    orders: 48,
    queuedDeliveries: 3,
    adminUsers: 2,
    packages: 3,
  },
  recentOrders: [],
  packages: [
    {
      id: "pkg_voyaer",
      slug: "voyaer",
      name: "Voyager",
      shortDescription: "Testovací balíček",
      priceCzk: 499,
      currency: "CZK",
      category: "rank",
      accent: "cyan",
      isFeatured: true,
      benefits: [],
      tags: [],
    },
  ],
};

const orderSummary = {
  id: orderId,
  userId: "usr_ops_1",
  minecraftAccountId: "mc_ops_1",
  user: {
    id: "usr_ops_1",
    email: "hrac@valtherea.eu",
  },
  minecraftAccount: {
    id: "mc_ops_1",
    username: "VoyaerPlayer",
    uuid: "00000000-0000-0000-0000-000000000001",
    linkedAt: "2026-07-24T09:00:00.000Z",
    lastSeenAt: "2026-07-25T09:00:00.000Z",
  },
  package: {
    id: "pkg_voyaer",
    name: "Voyager",
    lineItems: [
      {
        packageId: "pkg_voyaer",
        packageName: "Voyager",
        quantity: 1,
        unitPriceCzk: 499,
      },
    ],
  },
  price: {
    amountCzk: 499,
    currency: "CZK",
  },
  paymentProvider: "stripe",
  status: {
    order: "manual_review",
    payment: "succeeded",
    delivery: "failed_terminal",
  },
  review: {
    reasonCode: "delivery_max_attempts_exhausted",
    note: "Delivery job vyčerpal povolený počet pokusů.",
    reviewedAt: "2026-07-25T10:05:00.000Z",
  },
  paymentAttempt: {
    id: attemptId,
    orderId,
    provider: "stripe",
    providerCheckoutId: "cs_test_ops_2026",
    providerPaymentId: "pi_ops_2026",
    status: "succeeded",
    amountCzk: 499,
    lastProviderStatus: "paid",
    lastProviderEventId: "evt_ops_success",
    continuationAvailable: false,
    expiresAt: null,
    closedAt: "2026-07-25T10:02:00.000Z",
    createdAt: "2026-07-25T10:00:00.000Z",
    updatedAt: "2026-07-25T10:02:00.000Z",
  },
  entitlementStatus: "active",
  deliveryJob: {
    id: jobId,
    status: "dead_letter",
    retryCount: 3,
  },
  createdAt: "2026-07-25T10:00:00.000Z",
  updatedAt: "2026-07-25T10:05:00.000Z",
  paidAt: "2026-07-25T10:02:00.000Z",
  deliveredAt: null,
};

const deliveryJob = {
  id: jobId,
  orderId,
  entitlementId: "ent_ops_2026",
  userId: "usr_ops_1",
  minecraftAccountId: "mc_ops_1",
  type: "grant",
  status: "dead_letter",
  retryCount: 3,
  maxAttempts: 3,
  availableAt: null,
  leaseOwner: null,
  leaseExpiresAt: null,
  lastErrorCode: "PLUGIN_TIMEOUT",
  lastErrorMessage: "Plugin neodpověděl.",
  review: {
    reasonCode: "delivery_max_attempts_exhausted",
    note: "Delivery job vyčerpal povolený počet pokusů.",
  },
  deadLetteredAt: "2026-07-25T10:05:00.000Z",
  createdAt: "2026-07-25T10:02:00.000Z",
  updatedAt: "2026-07-25T10:05:00.000Z",
};

const paymentEvent = {
  id: "pev_ops_2026",
  orderId,
  paymentAttemptId: attemptId,
  provider: "stripe",
  providerEventId: "evt_ops_success",
  providerCheckoutId: "cs_test_ops_2026",
  providerPaymentId: "pi_ops_2026",
  providerEventType: "checkout.session.completed",
  normalizedEventType: "checkout.completed_paid",
  processingStatus: "processed",
  amountCzk: 499,
  currency: "CZK",
  review: null,
  duplicateOfEventId: null,
  receivedAt: "2026-07-25T10:02:00.000Z",
  occurredAt: "2026-07-25T10:02:00.000Z",
  processedAt: "2026-07-25T10:02:01.000Z",
  deadLetteredAt: null,
};

const unsupportedAdminGrantAttempt = {
  ...orderSummary.paymentAttempt,
  id: "pay_admin_grant_history",
  provider: "admin_grant",
  providerCheckoutId: "admin_grant_history",
  providerPaymentId: "admin_grant_history",
};

const orderDetail: AdminCommerceOrderDetailResponse = {
  order: orderSummary,
  user: orderSummary.user,
  minecraftAccount: orderSummary.minecraftAccount,
  paymentAttempts: [
    orderSummary.paymentAttempt,
    unsupportedAdminGrantAttempt,
  ],
  paymentEvents: [paymentEvent],
  entitlement: {
    id: "ent_ops_2026",
    orderId,
    userId: "usr_ops_1",
    minecraftAccountId: "mc_ops_1",
    packageId: "pkg_voyaer",
    packageName: "Voyager",
    type: "package",
    status: "active",
    createdAt: "2026-07-25T10:02:01.000Z",
    grantedAt: null,
    revokedAt: null,
  },
  deliveryJobs: [deliveryJob],
  deliveryAttempts: [
    {
      id: "dla_ops_2026",
      deliveryJobId: jobId,
      pluginClientId: "plugin_staging",
      attemptNo: 3,
      result: "retryable_failure",
      errorCode: "PLUGIN_TIMEOUT",
      errorMessage: "Plugin neodpověděl.",
      startedAt: "2026-07-25T10:04:00.000Z",
      finishedAt: "2026-07-25T10:05:00.000Z",
    },
  ],
  timeline: [
    {
      id: "order:created",
      at: "2026-07-25T10:00:00.000Z",
      source: "system",
      type: "order_created",
      description: "Objednávka byla vytvořena.",
      correlationId: orderId,
      providerEventId: null,
      actorId: null,
    },
    {
      id: "provider:paid",
      at: "2026-07-25T10:02:00.000Z",
      source: "provider",
      type: "checkout.completed_paid",
      description: "Stripe potvrdil zaplacení Checkout Session.",
      correlationId: attemptId,
      providerEventId: "evt_ops_success",
      actorId: "stripe",
    },
    {
      id: "plugin:failed",
      at: "2026-07-25T10:05:00.000Z",
      source: "plugin",
      type: "delivery_attempt",
      description: "Třetí pokus o doručení selhal.",
      correlationId: jobId,
      providerEventId: null,
      actorId: "plugin_staging",
    },
  ],
  blockage: {
    code: "DELIVERY_DEAD_LETTER",
    label: "Delivery job skončil v dead-letter frontě.",
  },
  actions: {
    reconcileOrder: { allowed: true, reason: null },
    reconcilePaymentAttempt: { allowed: true, reason: null },
    paymentAttempts: [
      {
        paymentAttemptId: attemptId,
        reconcile: { allowed: true, reason: null },
      },
      {
        paymentAttemptId: unsupportedAdminGrantAttempt.id,
        reconcile: {
          allowed: false,
          reason: "Tento payment provider nepodporuje provider reconciliation.",
        },
      },
    ],
    repairArtifacts: {
      allowed: false,
      reason: "Fulfillment artefakty už existují.",
    },
    markManualReview: {
      allowed: false,
      reason: "Objednávka už je v manual review.",
    },
    deliveryJobs: [
      {
        jobId,
        retry: { allowed: true, reason: null },
        releaseLease: {
          allowed: false,
          reason: "Uvolnit lze pouze leased job.",
        },
      },
    ],
    refund: {
      allowed: false,
      reason: "Stripe refund/revoke workflow zatím není implementovaný.",
    },
  },
};

function raceOrderDetail({
  id,
  suffix,
  username,
  email,
  amountCzk,
}: {
  id: string;
  suffix: string;
  username: string;
  email: string;
  amountCzk: number;
}): AdminCommerceOrderDetailResponse {
  const detail = JSON.parse(
    JSON.stringify(orderDetail),
  ) as AdminCommerceOrderDetailResponse;
  const userId = `usr_race_${suffix}`;
  const minecraftAccountId = `mc_race_${suffix}`;
  const paymentAttemptId = `pay_race_${suffix}`;
  const deliveryJobId = `dlj_race_${suffix}`;
  const entitlementId = `ent_race_${suffix}`;

  detail.user = { id: userId, email };
  detail.minecraftAccount = {
    id: minecraftAccountId,
    username,
    uuid: `00000000-0000-0000-0000-0000000000${suffix === "a" ? "0a" : "0b"}`,
  };
  detail.order.id = id;
  detail.order.userId = userId;
  detail.order.minecraftAccountId = minecraftAccountId;
  detail.order.user = detail.user;
  detail.order.minecraftAccount = {
    ...detail.order.minecraftAccount!,
    id: minecraftAccountId,
    username,
    uuid: detail.minecraftAccount.uuid!,
  };
  detail.order.package = {
    ...detail.order.package,
    name: `Voyager ${suffix.toUpperCase()}`,
    lineItems: detail.order.package.lineItems.map((item) => ({
      ...item,
      packageName: `Voyager ${suffix.toUpperCase()}`,
      unitPriceCzk: amountCzk,
    })),
  };
  detail.order.price = {
    ...detail.order.price,
    amountCzk,
  };

  const paymentAttempt = {
    ...detail.paymentAttempts[0],
    id: paymentAttemptId,
    orderId: id,
    amountCzk,
    providerCheckoutId: `cs_test_race_${suffix}`,
    providerPaymentId: `pi_race_${suffix}`,
  };
  detail.paymentAttempts = [paymentAttempt];
  detail.order.paymentAttempt = paymentAttempt;
  detail.paymentEvents = [
    {
      ...detail.paymentEvents[0],
      id: `pev_race_${suffix}`,
      orderId: id,
      paymentAttemptId,
      amountCzk,
      providerEventId: `evt_race_${suffix}`,
      providerCheckoutId: `cs_test_race_${suffix}`,
      providerPaymentId: `pi_race_${suffix}`,
    },
  ];
  detail.entitlement = {
    ...detail.entitlement!,
    id: entitlementId,
    orderId: id,
    userId,
    minecraftAccountId,
  };
  detail.deliveryJobs = [
    {
      ...detail.deliveryJobs[0],
      id: deliveryJobId,
      orderId: id,
      entitlementId,
      userId,
      minecraftAccountId,
    },
  ];
  detail.order.deliveryJob = {
    id: deliveryJobId,
    status: detail.deliveryJobs[0].status,
    retryCount: detail.deliveryJobs[0].retryCount,
  };
  detail.deliveryAttempts = [
    {
      ...detail.deliveryAttempts[0],
      id: `dla_race_${suffix}`,
      deliveryJobId,
    },
  ];
  detail.timeline = [
    {
      ...detail.timeline[0],
      id: `order:race:${suffix}`,
      type: `race_timeline_${suffix}`,
      description: `Timeline belongs to order ${suffix.toUpperCase()}.`,
      correlationId: id,
    },
  ];
  detail.actions = {
    ...detail.actions,
    paymentAttempts: [
      {
        paymentAttemptId,
        reconcile: { allowed: true, reason: null },
      },
    ],
    deliveryJobs: [
      {
        jobId: deliveryJobId,
        retry: { allowed: true, reason: null },
        releaseLease: {
          allowed: false,
          reason: "Uvolnit lze pouze leased delivery job.",
        },
      },
    ],
  };

  return detail;
}

const commerceOverview = {
  counts: {
    awaitingPayment: 4,
    paymentProcessing: 2,
    paidOrDeliveryQueued: 3,
    delivering: 1,
    delivered: 31,
    paymentFailed: 2,
    deliveryFailed: 1,
    manualReview: 2,
    unmatchedPaymentEvents: 1,
    deadLetterDeliveryJobs: 1,
    staleLeasedJobs: 1,
    paidOrdersWithoutEntitlement: 1,
    succeededPaymentsWithoutGrantDeliveryJob: 1,
  },
  alerts: [
    {
      code: "MANUAL_REVIEW",
      severity: "blocker",
      count: 2,
      label: "Objednávky čekající na ruční kontrolu",
    },
    {
      code: "STALE_DELIVERY_LEASE",
      severity: "warning",
      count: 1,
      label: "Delivery joby s prošlým lease",
    },
  ],
  recentOrders: [orderSummary],
  generatedAt: "2026-07-26T08:00:00.000Z",
};

async function mockAdminAccess(page: Page) {
  await page.route(/\/api\/admin\/overview(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(adminOverview),
    });
  });
}

async function mockOrderDetail(page: Page) {
  await page.route(
    new RegExp(`/api/admin/commerce/orders/${orderId}(?:\\?.*)?$`),
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(orderDetail),
      });
    },
  );
}

test("non-admin nemá přístup ke Store Operations Console", async ({ page }) => {
  await page.route(/\/api\/admin\/overview(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({
        error: {
          code: "ADMIN_SESSION_REQUIRED",
          message: "Admin role is required.",
        },
      }),
    });
  });

  await page.goto("/admin?section=store");

  await expect(
    page.getByText("Tento účet nemá přístup do admin panelu."),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Sekce admin panelu" }),
  ).toHaveCount(0);
});

test("admin otevře provozní overview a sekce zůstane v URL", async ({
  page,
}) => {
  await mockAdminAccess(page);
  await page.route(
    /\/api\/admin\/commerce\/overview(?:\?.*)?$/,
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(commerceOverview),
      });
    },
  );

  await page.goto("/admin?section=store");

  await expect(
    page.getByRole("heading", { name: "Platební a doručovací provoz" }),
  ).toBeVisible();
  await expect(
    page.locator("article").filter({ hasText: "Manual review" }).first(),
  ).toContainText("2");
  await expect(
    page.getByText("Objednávky čekající na ruční kontrolu (2)"),
  ).toBeVisible();
  await expect(page.getByText("Dead-letter joby")).toBeVisible();

  await page.reload();
  await expect(page).toHaveURL(/section=store/);
  await expect(
    page.getByRole("heading", { name: "Platební a doručovací provoz" }),
  ).toBeVisible();
});

test("serverové hledání otevře sanitizovaný detail a timeline", async ({
  page,
}) => {
  await mockAdminAccess(page);
  await mockOrderDetail(page);
  let receivedQuery = "";
  await page.route(/\/api\/admin\/commerce\/orders\?.*$/, async (route) => {
    receivedQuery = new URL(route.request().url()).searchParams.get("q") || "";
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        orders: [orderSummary],
        pagination: {
          query: receivedQuery,
          limit: 20,
          offset: 0,
          total: 1,
          hasMore: false,
        },
      }),
    });
  });

  await page.goto("/admin?section=orders");
  await page
    .getByLabel("Order ID, e-mail, Minecraft jméno nebo provider ID")
    .fill("hrac@valtherea.eu");
  await page.getByRole("button", { name: "Hledat objednávku" }).click();

  await expect.poll(() => receivedQuery).toBe("hrac@valtherea.eu");
  await expect(page.getByText("VoyaerPlayer").first()).toBeVisible();
  await page.getByRole("button", { name: "Otevřít detail" }).click();

  await expect(
    page.getByRole("heading", { name: "Voyager", exact: true }).last(),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Společná časová osa" }),
  ).toBeVisible();
  await expect(page.getByText("checkout.completed_paid").last()).toBeVisible();
  await expect(page.getByText("provider", { exact: true })).toBeVisible();
  await expect(page.getByText("plugin", { exact: true })).toBeVisible();
  const attemptActions = page.getByRole("button", {
    name: "Ověřit pokus o platbu",
  });
  await expect(attemptActions).toHaveCount(2);
  await expect(attemptActions.nth(0)).toBeEnabled();
  await expect(attemptActions.nth(1)).toBeDisabled();
  await expect(page.getByText("raw webhook", { exact: false })).toBeVisible();
  await expect(page.getByText("grant payload", { exact: false })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("whsec_");
  await expect(page.locator("body")).not.toContainText("grantPayload");
});

test("out-of-order detail response cannot replace the current order or mutation target", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const NativeAbortController = window.AbortController;
    window.AbortController = class extends NativeAbortController {
      override abort() {
        // Keep the old transport alive so this test exercises the generation guard.
      }
    };
  });
  await mockAdminAccess(page);

  const detailA = raceOrderDetail({
    id: "ord_race_a",
    suffix: "a",
    username: "RacePlayerA",
    email: "race-a@valtherea.eu",
    amountCzk: 111,
  });
  const detailB = raceOrderDetail({
    id: "ord_race_b",
    suffix: "b",
    username: "RacePlayerB",
    email: "race-b@valtherea.eu",
    amountCzk: 777,
  });

  await page.route(/\/api\/admin\/commerce\/orders\?.*$/, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        orders: [detailA.order, detailB.order],
        pagination: {
          query: "race",
          limit: 20,
          offset: 0,
          total: 2,
          hasMore: false,
        },
      }),
    });
  });

  let signalAStarted = () => {};
  const requestAStarted = new Promise<void>((resolve) => {
    signalAStarted = resolve;
  });
  let releaseAResponse = () => {};
  const responseAGate = new Promise<void>((resolve) => {
    releaseAResponse = resolve;
  });
  let signalAFinished = () => {};
  const responseAFinished = new Promise<void>((resolve) => {
    signalAFinished = resolve;
  });

  await page.route(
    /\/api\/admin\/commerce\/orders\/ord_race_(?:a|b)$/,
    async (route) => {
      if (route.request().url().endsWith("/ord_race_a")) {
        signalAStarted();
        await responseAGate;
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify(detailA),
        });
        signalAFinished();
        return;
      }

      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(detailB),
      });
    },
  );

  let postToA = 0;
  let postToB = 0;
  await page.route(
    /\/api\/admin\/commerce\/orders\/ord_race_a\/reconcile$/,
    async (route) => {
      postToA += 1;
      await route.fulfill({ status: 500, body: "unexpected" });
    },
  );
  await page.route(
    /\/api\/admin\/commerce\/orders\/ord_race_b\/reconcile$/,
    async (route) => {
      postToB += 1;
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          operation: "order_reconciled",
          result: {
            reprocessedCount: 0,
            refreshedAttemptCount: 1,
            repairedOrderCount: 0,
            manualReviewEventCount: 0,
            manualReviewOrderCount: 0,
            reprocessedEventIds: [],
            refreshedAttemptIds: [detailB.paymentAttempts[0].id],
            repairedOrderIds: [],
            manualReviewEventIds: [],
            manualReviewOrderIds: [],
          },
          detail: detailB,
        }),
      });
    },
  );

  await page.goto("/admin?section=orders");
  await page
    .getByLabel("Order ID, e-mail, Minecraft jméno nebo provider ID")
    .fill("race");
  await page.getByRole("button", { name: "Hledat objednávku" }).click();

  const cardA = page
    .locator("article")
    .filter({ has: page.locator('code[title="ord_race_a"]') });
  const cardB = page
    .locator("article")
    .filter({ has: page.locator('code[title="ord_race_b"]') });
  await cardA.getByRole("button", { name: "Otevřít detail" }).click();
  await requestAStarted;
  await cardB.getByRole("button", { name: "Otevřít detail" }).click();

  const detailPanel = page.locator(
    'section[aria-labelledby="order-detail-title"]',
  );
  await expect(page).toHaveURL(/order=ord_race_b/);
  await expect(detailPanel).toContainText("RacePlayerB");
  await expect(detailPanel).toContainText("777");
  await expect(detailPanel).toContainText("race_timeline_b");

  releaseAResponse();
  await responseAFinished;
  await expect(detailPanel).toContainText("RacePlayerB");
  await expect(detailPanel).not.toContainText("RacePlayerA");
  await expect(detailPanel).not.toContainText("race_timeline_a");
  await expect(page).toHaveURL(/order=ord_race_b/);

  await detailPanel
    .getByRole("button", { name: "Ověřit objednávku" })
    .click();
  await page
    .getByRole("dialog", { name: "Reconcile objednávku" })
    .getByRole("button", { name: "Spustit reconcile" })
    .click();

  await expect.poll(() => postToB).toBe(1);
  expect(postToA).toBe(0);
});

test("closing a pending detail invalidates its late response", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const NativeAbortController = window.AbortController;
    window.AbortController = class extends NativeAbortController {
      override abort() {
        // Let the delayed response arrive after the URL selection is removed.
      }
    };
  });
  await mockAdminAccess(page);

  const detailA = raceOrderDetail({
    id: "ord_race_a",
    suffix: "a",
    username: "RacePlayerA",
    email: "race-a@valtherea.eu",
    amountCzk: 111,
  });
  await page.route(/\/api\/admin\/commerce\/orders\?.*$/, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        orders: [detailA.order],
        pagination: {
          query: "race",
          limit: 20,
          offset: 0,
          total: 1,
          hasMore: false,
        },
      }),
    });
  });

  let signalAStarted = () => {};
  const requestAStarted = new Promise<void>((resolve) => {
    signalAStarted = resolve;
  });
  let releaseAResponse = () => {};
  const responseAGate = new Promise<void>((resolve) => {
    releaseAResponse = resolve;
  });
  let signalAFinished = () => {};
  const responseAFinished = new Promise<void>((resolve) => {
    signalAFinished = resolve;
  });
  await page.route(
    /\/api\/admin\/commerce\/orders\/ord_race_a$/,
    async (route) => {
      signalAStarted();
      await responseAGate;
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(detailA),
      });
      signalAFinished();
    },
  );

  await page.goto("/admin?section=orders");
  await page
    .getByLabel("Order ID, e-mail, Minecraft jméno nebo provider ID")
    .fill("race");
  await page.getByRole("button", { name: "Hledat objednávku" }).click();
  await page.getByRole("button", { name: "Otevřít detail" }).click();
  await requestAStarted;

  await page.goBack();
  await expect(page).not.toHaveURL(/order=/);
  releaseAResponse();
  await responseAFinished;
  await expect(
    page.locator('section[aria-labelledby="order-detail-title"]'),
  ).toHaveCount(0);
  await expect(
    page.getByText("Načítám detail objednávky", { exact: false }),
  ).toHaveCount(0);
});

test("manual review a reconcile používají potvrzení, CSRF a server refresh", async ({
  page,
}) => {
  await mockAdminAccess(page);
  await mockOrderDetail(page);
  await page.route(
    /\/api\/admin\/commerce\/manual-review(?:\?.*)?$/,
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          orders: [orderSummary],
          paymentEvents: [
            {
              ...paymentEvent,
              processingStatus: "manual_review",
              review: {
                reasonCode: "AMOUNT_MISMATCH",
                note: "Částka neodpovídá objednávce.",
              },
            },
          ],
          deliveryJobs: [deliveryJob],
          staleLeasedJobs: [],
          pagination: {
            limit: 30,
            offset: 0,
            totals: {
              orders: 1,
              paymentEvents: 1,
              deliveryJobs: 1,
              staleLeasedJobs: 0,
            },
            hasMore: false,
          },
        }),
      });
    },
  );

  let reconcileCount = 0;
  let csrfHeader = "";
  await page.route(
    new RegExp(
      `/api/admin/commerce/orders/${orderId}/reconcile(?:\\?.*)?$`,
    ),
    async (route) => {
      reconcileCount += 1;
      csrfHeader =
        route.request().headers()["x-valtherea-csrf"] || "";
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          operation: "order_reconciled",
          result: {
            reprocessedCount: 2,
            refreshedAttemptCount: 1,
            repairedOrderCount: 0,
            manualReviewEventCount: 1,
            manualReviewOrderCount: 1,
            reprocessedEventIds: ["pev_1", "pev_2"],
            refreshedAttemptIds: ["pay_1"],
            repairedOrderIds: [],
            manualReviewEventIds: ["pev_review"],
            manualReviewOrderIds: [orderId],
          },
          detail: orderDetail,
        }),
      });
    },
  );

  await page.goto("/admin?section=manual-review");
  await expect(
    page.getByRole("heading", { name: "Případy vyžadující zásah" }),
  ).toBeVisible();
  await expect(page.getByText("AMOUNT_MISMATCH")).toBeVisible();
  await page.getByRole("button", { name: "Otevřít detail" }).first().click();
  await page.getByRole("button", { name: "Ověřit objednávku" }).click();

  const dialog = page.getByRole("dialog", {
    name: "Reconcile objednávku",
  });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(
    "nevynutí payment success bez provider evidence",
  );
  await dialog.getByRole("button", { name: "Spustit reconcile" }).click();

  await expect.poll(() => reconcileCount).toBe(1);
  expect(csrfHeader).toBe("1");
  await expect(
    page.getByText("Provider eventy znovu zpracované: 2.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Obnovené pokusy o platbu: 1.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText("Manual review: 1 eventů a 1 objednávek.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Opravit artefakty" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Uvolnit prošlý lease" }),
  ).toBeDisabled();
});

test("retry delivery vyžaduje důvod a brání double-submit", async ({
  page,
}) => {
  await mockAdminAccess(page);
  let currentDetail = orderDetail;
  let detailReadCount = 0;
  await page.route(
    new RegExp(`/api/admin/commerce/orders/${orderId}(?:\\?.*)?$`),
    async (route) => {
      detailReadCount += 1;
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(currentDetail),
      });
    },
  );
  let retryCount = 0;
  let retryBody: Record<string, unknown> | null = null;
  let releaseRetryResponse = () => {};
  const retryResponseGate = new Promise<void>((resolve) => {
    releaseRetryResponse = resolve;
  });
  await page.route(
    new RegExp(`/api/admin/commerce/delivery-jobs/${jobId}/retry$`),
    async (route) => {
      retryCount += 1;
      retryBody = route.request().postDataJSON();
      await retryResponseGate;
      const retriedJob = {
        ...deliveryJob,
        status: "pending",
        review: null,
        deadLetteredAt: null,
        availableAt: "2026-07-25T10:06:00.000Z",
        updatedAt: "2026-07-25T10:06:00.000Z",
      };
      const retriedOrder = {
        ...orderSummary,
        status: {
          order: "delivery_queued",
          payment: "succeeded",
          delivery: "queued",
        },
        review: null,
        deliveryJob: {
          ...orderSummary.deliveryJob,
          status: "pending",
        },
        updatedAt: "2026-07-25T10:06:00.000Z",
      };
      currentDetail = {
        ...orderDetail,
        order: retriedOrder,
        deliveryJobs: [retriedJob],
        blockage: {
          code: "DELIVERY_QUEUED",
          label: "Delivery job čeká ve frontě.",
        },
        actions: {
          ...orderDetail.actions,
          markManualReview: { allowed: true, reason: null },
          deliveryJobs: [
            {
              jobId,
              retry: {
                allowed: false,
                reason:
                  "Retry je dostupný jen pro failed, retryable nebo dead-letter job.",
              },
              releaseLease: {
                allowed: false,
                reason: "Uvolnit lze pouze leased delivery job.",
              },
            },
          ],
        },
      };
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          operation: "delivery_retried",
          deliveryJob: retriedJob,
          detail: currentDetail,
        }),
      });
    },
  );

  await page.goto(`/admin?section=orders&order=${orderId}`);
  await page.getByRole("button", { name: "Znovu zařadit doručení" }).click();

  const dialog = page.getByRole("dialog", {
    name: "Znovu zařadit delivery job",
  });
  const confirm = dialog.getByRole("button", { name: "Zařadit znovu" });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel("Důvod *").fill("Prověřený restart plugin bridge");
  await dialog.getByLabel("Poznámka (volitelná)").fill("Support ticket OPS-7");
  await expect(confirm).toBeEnabled();
  await confirm.click();
  await expect.poll(() => retryCount).toBe(1);
  await expect(confirm).toBeDisabled();
  expect(retryBody).toEqual({
    reason: "Prověřený restart plugin bridge",
    note: "Support ticket OPS-7",
  });
  releaseRetryResponse();
  await expect(dialog).toHaveCount(0);
  await expect.poll(() => detailReadCount).toBeGreaterThanOrEqual(2);
  await expect(page.getByText("Doručení: Ve frontě")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Znovu zařadit doručení" }),
  ).toBeDisabled();
  await expect(
    page.getByText(
      "Retry je dostupný jen pro failed, retryable nebo dead-letter job.",
    ),
  ).toBeVisible();
});

test("payment mismatch nenabízí delivery retry a ukazuje serverový důvod", async ({
  page,
}) => {
  await mockAdminAccess(page);
  const retryBlockedReason =
    "Delivery job nelze znovu zaradit, dokud je objednavka v payment nebo obecnem manual review.";
  const mismatchDetail: AdminCommerceOrderDetailResponse = {
    ...orderDetail,
    order: {
      ...orderDetail.order,
      status: {
        order: "manual_review",
        payment: "manual_review",
        delivery: "failed_terminal",
      },
      review: {
        reasonCode: "payment_amount_order_mismatch",
        note: "Částka provider eventu neodpovídá objednávce.",
        reviewedAt: "2026-07-25T10:05:00.000Z",
      },
    },
    actions: {
      ...orderDetail.actions,
      repairArtifacts: {
        allowed: false,
        reason:
          "Payment nebo operations manual review nelze obejit opravou fulfillment artefaktu.",
      },
      deliveryJobs: [
        {
          jobId,
          retry: {
            allowed: false,
            reason: retryBlockedReason,
          },
          releaseLease: {
            allowed: false,
            reason: "Uvolnit lze pouze leased delivery job.",
          },
        },
      ],
    },
  };

  await page.route(
    new RegExp(`/api/admin/commerce/orders/${orderId}(?:\\?.*)?$`),
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(mismatchDetail),
      });
    },
  );

  await page.goto(`/admin?section=orders&order=${orderId}`);

  await expect(
    page.getByRole("button", { name: "Znovu zařadit doručení" }),
  ).toBeDisabled();
  await expect(page.getByText(retryBlockedReason)).toBeVisible();
});

test("dokončená objednávka nemá repair ani obecný manual review", async ({
  page,
}) => {
  await mockAdminAccess(page);
  const repairBlockedReason =
    "Fulfillment artefakty uz jsou kompletni; oprava neni potreba.";
  const manualReviewBlockedReason =
    "Terminalni nebo refund/chargeback stav objednavky nelze prepsat obecnym manual review.";
  const succeededJob = {
    ...deliveryJob,
    status: "succeeded",
    review: null,
    lastErrorCode: null,
    deadLetteredAt: null,
    updatedAt: "2026-07-25T10:07:00.000Z",
  };
  const deliveredDetail: AdminCommerceOrderDetailResponse = {
    ...orderDetail,
    order: {
      ...orderDetail.order,
      status: {
        order: "delivered",
        payment: "succeeded",
        delivery: "succeeded",
      },
      review: null,
      deliveryJob: {
        ...orderDetail.order.deliveryJob!,
        status: "succeeded",
      },
      deliveredAt: "2026-07-25T10:07:00.000Z",
      updatedAt: "2026-07-25T10:07:00.000Z",
    },
    entitlement: {
      ...orderDetail.entitlement!,
      status: "granted",
      grantedAt: "2026-07-25T10:07:00.000Z",
    },
    deliveryJobs: [succeededJob],
    actions: {
      ...orderDetail.actions,
      repairArtifacts: {
        allowed: false,
        reason: repairBlockedReason,
      },
      markManualReview: {
        allowed: false,
        reason: manualReviewBlockedReason,
      },
      deliveryJobs: [
        {
          jobId,
          retry: {
            allowed: false,
            reason:
              "Retry je dostupny jen pro failed, retryable nebo dead-letter job.",
          },
          releaseLease: {
            allowed: false,
            reason: "Uvolnit lze pouze leased delivery job.",
          },
        },
      ],
    },
    blockage: {
      code: "FLOW_COMPLETE",
      label: "Platební a doručovací flow je dokončený.",
    },
  };

  await page.route(
    new RegExp(`/api/admin/commerce/orders/${orderId}(?:\\?.*)?$`),
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(deliveredDetail),
      });
    },
  );

  await page.goto(`/admin?section=orders&order=${orderId}`);

  await expect(
    page.getByRole("button", { name: "Opravit artefakty" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Označit ke kontrole" }),
  ).toBeDisabled();
  await expect(page.getByText(repairBlockedReason)).toBeVisible();
  await expect(page.getByText(manualReviewBlockedReason)).toBeVisible();
});

test("aktivní neprošlý lease nelze předčasně uvolnit", async ({ page }) => {
  await mockAdminAccess(page);
  const activeLeaseJob = {
    ...deliveryJob,
    id: "dlj_active_lease",
    status: "leased",
    retryCount: 1,
    leaseOwner: "plugin_staging",
    leaseExpiresAt: "2099-07-26T12:00:00.000Z",
    lastErrorCode: null,
    lastErrorMessage: null,
    review: null,
    deadLetteredAt: null,
  };
  const activeLeaseDetail = {
    ...orderDetail,
    deliveryJobs: [activeLeaseJob],
    blockage: {
      code: "DELIVERY_IN_PROGRESS",
      label: "Delivery job právě zpracovává plugin.",
    },
    actions: {
      ...orderDetail.actions,
      deliveryJobs: [
        {
          jobId: activeLeaseJob.id,
          retry: {
            allowed: false,
            reason: "Leased job nelze opakovat.",
          },
          releaseLease: {
            allowed: false,
            reason: "Lease ještě nevypršel.",
          },
        },
      ],
    },
  };

  await page.route(
    new RegExp(`/api/admin/commerce/orders/${orderId}(?:\\?.*)?$`),
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(activeLeaseDetail),
      });
    },
  );

  await page.goto(`/admin?section=orders&order=${orderId}`);

  const release = page.getByRole("button", { name: "Uvolnit prošlý lease" });
  await expect(release).toBeDisabled();
  await expect(release).toHaveAttribute("title", "Lease ještě nevypršel.");
});

test("staging readiness rozlišuje PASS, WARNING a BLOCKER", async ({
  page,
}) => {
  await mockAdminAccess(page);
  await page.route(
    /\/api\/admin\/commerce\/staging-readiness(?:\?.*)?$/,
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          status: "BLOCKER",
          ready: false,
          generatedAt: "2026-07-26T08:00:00.000Z",
          counts: {
            pass: 19,
            warning: 2,
            blocker: 1,
          },
          checks: [
            {
              id: "payment.stripe_test_mode",
              label: "Stripe test režim",
              status: "PASS",
              message: "Stripe používá testovací klíč.",
            },
            {
              id: "delivery.plugin_bridge",
              label: "Plugin bridge",
              status: "BLOCKER",
              message: "Plugin bridge není připravený.",
            },
            {
              id: "discord.oauth",
              label: "Discord OAuth",
              status: "WARNING",
              message: "Ověř redirect URI ve staging projektu.",
            },
          ],
        }),
      });
    },
  );

  await page.goto("/admin?section=readiness");

  await expect(page.getByText("Celkový stav: BLOCKER")).toBeVisible();
  await expect(page.getByText("✓ PASS 19")).toBeVisible();
  await expect(page.getByText("⚠ WARNING 2")).toBeVisible();
  await expect(page.getByText("! BLOCKER 1")).toBeVisible();
  await expect(page.getByText("Stripe test režim")).toBeVisible();
  await expect(page.getByText("Plugin bridge", { exact: true })).toBeVisible();
  await expect(page.getByText("Discord OAuth", { exact: true })).toBeVisible();
  await expect(page.getByText("nespouští migrace", { exact: false })).toBeVisible();
});

test("operations overview je použitelné na mobilním viewportu", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockAdminAccess(page);
  await page.route(
    /\/api\/admin\/commerce\/overview(?:\?.*)?$/,
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(commerceOverview),
      });
    },
  );

  await page.goto("/admin?section=store");

  await expect(
    page.getByRole("navigation", { name: "Sekce admin panelu" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Platební a doručovací provoz" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Otevřít detail" }),
  ).toBeVisible();
  await expect(page.locator("body")).toHaveJSProperty(
    "scrollWidth",
    await page.locator("body").evaluate((body) => body.clientWidth),
  );
});
