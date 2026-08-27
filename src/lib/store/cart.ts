import type { StorePackage } from "@/lib/api/types";

export const STORE_CART_STORAGE_KEY = "valtherea.store.cart.v1";

export type StoreCartItem = {
  packageId: string;
  quantity: number;
};

type StoredCart = {
  version: 1;
  items: StoreCartItem[];
};

export type NormalizedStoreCategory = "rank" | "keys";

export function normalizeStoreCategory(
  category: string | null | undefined,
): NormalizedStoreCategory | null {
  const normalized = String(category || "").trim().toLowerCase();
  return normalized === "rank" || normalized === "keys" ? normalized : null;
}

export function normalizeCartItems(value: unknown): StoreCartItem[] {
  const rawItems =
    Array.isArray(value)
      ? value
      : value &&
          typeof value === "object" &&
          Array.isArray((value as { items?: unknown }).items)
        ? (value as { items: unknown[] }).items
        : [];
  const merged = new Map<string, number>();

  for (const entry of rawItems) {
    if (!entry || typeof entry !== "object") {
      continue;
    }

    const packageId = String(
      (entry as { packageId?: unknown }).packageId || "",
    ).trim();
    const quantity = Number((entry as { quantity?: unknown }).quantity);

    if (
      !packageId ||
      !Number.isSafeInteger(quantity) ||
      quantity < 1
    ) {
      continue;
    }

    const nextQuantity = (merged.get(packageId) || 0) + quantity;
    if (Number.isSafeInteger(nextQuantity)) {
      merged.set(packageId, nextQuantity);
    }
  }

  return Array.from(merged, ([packageId, quantity]) => ({
    packageId,
    quantity,
  }));
}

export function readStoreCart(storage: Storage): StoreCartItem[] {
  try {
    const rawValue = storage.getItem(STORE_CART_STORAGE_KEY);
    return rawValue ? normalizeCartItems(JSON.parse(rawValue)) : [];
  } catch {
    return [];
  }
}

export function writeStoreCart(
  storage: Storage,
  items: StoreCartItem[],
) {
  const normalized = normalizeCartItems(items);

  try {
    if (!normalized.length) {
      storage.removeItem(STORE_CART_STORAGE_KEY);
      return;
    }

    const payload: StoredCart = {
      version: 1,
      items: normalized,
    };
    storage.setItem(STORE_CART_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Storage can be unavailable in private/restricted browser contexts.
  }
}

export function reconcileCartWithCatalog(
  items: StoreCartItem[],
  packages: StorePackage[],
) {
  const packageMap = new Map(packages.map((entry) => [entry.id, entry]));
  let rankSeen = false;

  return normalizeCartItems(items).filter((item) => {
    const entry = packageMap.get(item.packageId);
    const category = normalizeStoreCategory(entry?.category);

    if (!entry || !category) {
      return false;
    }

    if (category === "rank") {
      if (rankSeen) {
        return false;
      }

      rankSeen = true;
      item.quantity = 1;
    }

    return true;
  });
}

export function addPackageToCart(
  items: StoreCartItem[],
  selectedPackage: StorePackage,
  packages: StorePackage[],
) {
  const category = normalizeStoreCategory(selectedPackage.category);
  if (!category) {
    return normalizeCartItems(items);
  }

  const packageMap = new Map(packages.map((entry) => [entry.id, entry]));
  let nextItems = normalizeCartItems(items);

  if (category === "rank") {
    nextItems = nextItems.filter((item) => {
      const currentCategory = normalizeStoreCategory(
        packageMap.get(item.packageId)?.category,
      );
      return currentCategory !== "rank";
    });

    return [
      ...nextItems,
      {
        packageId: selectedPackage.id,
        quantity: 1,
      },
    ];
  }

  const existing = nextItems.find(
    (item) => item.packageId === selectedPackage.id,
  );

  if (!existing) {
    return [
      ...nextItems,
      {
        packageId: selectedPackage.id,
        quantity: 1,
      },
    ];
  }

  if (!Number.isSafeInteger(existing.quantity + 1)) {
    return nextItems;
  }

  return nextItems.map((item) =>
    item.packageId === selectedPackage.id
      ? { ...item, quantity: item.quantity + 1 }
      : item,
  );
}

export function setCartItemQuantity(
  items: StoreCartItem[],
  packageId: string,
  quantity: number,
) {
  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    return normalizeCartItems(items);
  }

  return normalizeCartItems(items).map((item) =>
    item.packageId === packageId ? { ...item, quantity } : item,
  );
}

export function removeCartItem(
  items: StoreCartItem[],
  packageId: string,
) {
  return normalizeCartItems(items).filter(
    (item) => item.packageId !== packageId,
  );
}

export function createCartSignature(items: StoreCartItem[]) {
  return normalizeCartItems(items)
    .slice()
    .sort((left, right) => left.packageId.localeCompare(right.packageId))
    .map((item) => `${item.packageId}:${item.quantity}`)
    .join("|");
}
