import type { Page } from "@playwright/test";

export const catalogPackages = [
  {
    id: "pkg_voyager",
    slug: "voyager",
    name: "Voyager",
    shortDescription: "Základní supporter rank.",
    priceCzk: 79,
    currency: "CZK",
    category: "rank",
    accent: "aqua",
    isFeatured: false,
    benefits: ["Prefix v chatu", "Kosmetický trail"],
    tags: ["Supporter"],
    isSellable: true,
    checkoutReady: true,
  },
  {
    id: "pkg_key_uncommon",
    slug: "uncommon-key",
    name: "Uncommon Key",
    shortDescription: "Jeden Uncommon crate klíč.",
    priceCzk: 20,
    currency: "CZK",
    category: "keys",
    accent: "aqua",
    isFeatured: false,
    benefits: ["1 Uncommon key"],
    tags: ["Uncommon"],
    isSellable: true,
    checkoutReady: true,
  },
  {
    id: "pkg_key_rare",
    slug: "rare-key",
    name: "Rare Key",
    shortDescription: "Jeden Rare crate klíč.",
    priceCzk: 30,
    currency: "CZK",
    category: "keys",
    accent: "lavender",
    isFeatured: false,
    benefits: ["1 Rare key"],
    tags: ["Rare"],
    isSellable: true,
    checkoutReady: true,
  },
  {
    id: "pkg_key_legendary",
    slug: "legendary-key",
    name: "Legendary Key",
    shortDescription: "Legendary crate klíč.",
    priceCzk: 75,
    currency: "CZK",
    category: "keys",
    accent: "rose",
    isFeatured: false,
    benefits: ["1 Legendary key"],
    tags: ["Legendary"],
    isSellable: true,
    checkoutReady: true,
  },
  {
    id: "pkg_key_luminite",
    slug: "luminite-key",
    name: "Luminite Key",
    shortDescription: "Limitovaný produkt s 1 Luminite key.",
    priceCzk: 125,
    currency: "CZK",
    category: "keys",
    accent: "gold",
    isFeatured: false,
    benefits: ["1 Luminite key"],
    tags: ["Luminite", "Limited"],
    isSellable: true,
    checkoutReady: true,
  },
  {
    id: "pkg_key_lildragon",
    slug: "little-dragon-key",
    name: "Little Dragon Key",
    shortDescription: "Limitovaný produkt s 1 Little Dragon key.",
    priceCzk: 125,
    currency: "CZK",
    category: "keys",
    accent: "lavender",
    isFeatured: false,
    benefits: ["1 Little Dragon key"],
    tags: ["Little Dragon", "Limited"],
    isSellable: true,
    checkoutReady: true,
  },
] as const;

export function createDashboard({
  ready = true,
}: {
  ready?: boolean;
} = {}) {
  const blockedReasons = ready
    ? []
    : ["MINECRAFT_NOT_LINKED", "DISCORD_NOT_LINKED"];

  return {
    profile: {
      id: "user-store",
      email: "store@valtherea.eu",
      minecraftName: "StoreHero",
      discordName: "store_hero",
    },
    minecraft: {
      isLinked: ready,
      username: ready ? "StoreHero" : null,
      uuid: ready ? "123e4567-e89b-12d3-a456-426614174999" : null,
      linkedAt: ready ? "2026-07-24T12:00:00.000Z" : null,
    },
    discord: {
      isLinked: ready,
      userId: ready ? "discord-store" : null,
      username: ready ? "store_hero" : null,
      displayName: ready ? "Store Hero" : null,
      linkedAt: ready ? "2026-07-24T12:00:00.000Z" : null,
      status: ready ? "linked" : "not_linked",
    },
    readiness: {
      storeReady: ready,
      blockedReasons,
      requirements: {
        requiresMinecraftLink: true,
        requiresDiscordLink: true,
      },
    },
    stats: {
      ordersCount: 0,
    },
    store: {
      ready,
      blockedReasons,
      requirements: {
        requiresMinecraftLink: true,
        requiresDiscordLink: true,
      },
      latestOrder: null,
    },
    activeLinkCode: null,
    recentOrders: [],
  };
}

export function createOrder(
  overrides: Record<string, unknown> = {},
) {
  return {
    id: "ord_store_1234567890",
    status: "awaiting_payment",
    orderStatus: "awaiting_payment",
    paymentStatus: "checkout_created",
    deliveryStatus: "not_ready",
    packageId: "pkg_voyager",
    packageName: "Voyager + 1 další položka",
    totalPriceCzk: 99,
    createdAt: "2026-07-25T10:00:00.000Z",
    minecraftUsername: "StoreHero",
    lineItems: [
      {
        packageId: "pkg_voyager",
        packageName: "Voyager",
        quantity: 1,
        unitPriceCzk: 79,
      },
      {
        packageId: "pkg_key_uncommon",
        packageName: "Uncommon Key",
        quantity: 1,
        unitPriceCzk: 20,
      },
    ],
    checkout: {
      canContinue: true,
      checkoutUrl: "/account?checkout=ord_store_1234567890",
      expiresAt: "2026-07-25T11:00:00.000Z",
    },
    ...overrides,
  };
}

export async function mockCatalog(
  page: Page,
  options: {
    isAuthenticated?: () => boolean;
    ready?: boolean;
  } = {},
) {
  await page.route("**/api/store/packages", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ packages: catalogPackages }),
    });
  });

  await page.route("**/api/account/dashboard", async (route) => {
    if (options.isAuthenticated && !options.isAuthenticated()) {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "UNAUTHORIZED",
            message: "Přihlášení je vyžadováno.",
          },
        }),
      });
      return;
    }

    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(createDashboard({ ready: options.ready ?? true })),
    });
  });
}
