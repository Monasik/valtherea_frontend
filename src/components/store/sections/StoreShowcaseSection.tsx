"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiRequest, ApiError } from "@/lib/api/client";
import type {
  AccountDashboard,
  CheckoutResponse,
  StoreOrderCreateResponse,
  StorePackage,
  StorePackagesResponse,
} from "@/lib/api/types";
import { normalizeCheckoutDestination } from "@/lib/navigation/safeInternalPath";
import {
  addPackageToCart,
  createCartSignature,
  normalizeStoreCategory,
  readStoreCart,
  reconcileCartWithCatalog,
  removeCartItem,
  setCartItemQuantity,
  type StoreCartItem,
  writeStoreCart,
} from "@/lib/store/cart";
import styles from "./StoreShowcaseSection.module.scss";

type StoreShowcaseSectionProps = {
  title: string;
  description: string;
};

const storeCategories = [
  {
    id: "keys",
    title: "KLÍČE",
  },
  {
    id: "ranks",
    title: "RANKY",
  },
] as const;

type StoreCategoryId = (typeof storeCategories)[number]["id"];

type PendingCheckout = {
  orderId: string;
  cartSignature: string;
};

function formatCzk(value: number) {
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: "CZK",
    maximumFractionDigits: 0,
  }).format(value);
}

function buildFriendlyStoreError(error: unknown) {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "ACCOUNT_NOT_READY":
        return "Před nákupem dokonči chybějící propojení účtu.";
      case "MINECRAFT_NOT_LINKED":
        return "Před nákupem propoj Minecraft účet.";
      case "DISCORD_NOT_LINKED":
        return "Před nákupem propoj Discord účet.";
      case "ORDER_NOT_READY_FOR_CHECKOUT":
      case "ORDER_NOT_PAYABLE":
        return "Objednávka už není ve stavu, kdy může pokračovat do platby.";
      case "UNAUTHORIZED":
        return "Nejdřív se přihlas ke svému účtu.";
      default:
        return error.message;
    }
  }

  return "Store se nepodařilo spojit se serverem.";
}

function getPackageCategory(
  entry: StorePackage,
): StoreCategoryId | null {
  const category = normalizeStoreCategory(entry.category);
  if (category === "rank") {
    return "ranks";
  }

  if (category === "keys") {
    return "keys";
  }

  return null;
}

function getPackageActionLabel(entry: StorePackage) {
  return normalizeStoreCategory(entry.category) === "keys"
    ? "Přidat klíč do košíku"
    : "Přidat rank do košíku";
}

export const StoreShowcaseSection = ({
  title,
  description,
}: StoreShowcaseSectionProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const submitGuardRef = useRef(false);
  const pendingCheckoutRef = useRef<PendingCheckout | null>(null);
  const [packages, setPackages] = useState<StorePackage[]>([]);
  const [dashboard, setDashboard] = useState<AccountDashboard | null>(null);
  const [cartItems, setCartItems] = useState<StoreCartItem[]>([]);
  const [isCartHydrated, setIsCartHydrated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [activeCategoryId, setActiveCategoryId] =
    useState<StoreCategoryId>("keys");

  const requestedPackageId = searchParams.get("package");

  const fetchStoreData = useCallback(async () => {
    const packagesPayload =
      await apiRequest<StorePackagesResponse>("/api/store/packages");
    let accountDashboard: AccountDashboard | null = null;

    try {
      accountDashboard = await apiRequest<AccountDashboard>(
        "/api/account/dashboard",
      );
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 401)) {
        throw error;
      }
    }

    return {
      packagesPayload,
      accountDashboard,
    };
  }, []);

  useEffect(() => {
    const hydrationTimer = window.setTimeout(() => {
      setCartItems(readStoreCart(window.localStorage));
      setIsCartHydrated(true);
    }, 0);

    return () => {
      window.clearTimeout(hydrationTimer);
    };
  }, []);

  useEffect(() => {
    if (isCartHydrated) {
      writeStoreCart(window.localStorage, cartItems);
    }
  }, [cartItems, isCartHydrated]);

  useEffect(() => {
    let cancelled = false;

    const syncStore = async () => {
      try {
        const payload = await fetchStoreData();

        if (cancelled) {
          return;
        }

        setPackages(payload.packagesPayload.packages);
        setDashboard(payload.accountDashboard);
        setCartItems((current) =>
          reconcileCartWithCatalog(
            current,
            payload.packagesPayload.packages,
          ),
        );
        setErrorMessage(null);
      } catch (error) {
        if (!cancelled) {
          setPackages([]);
          setErrorMessage(buildFriendlyStoreError(error));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void syncStore();

    return () => {
      cancelled = true;
    };
  }, [fetchStoreData]);

  const packageMap = useMemo(
    () => new Map(packages.map((entry) => [entry.id, entry])),
    [packages],
  );

  const cartLines = useMemo(
    () =>
      cartItems.flatMap((item) => {
        const storePackage = packageMap.get(item.packageId);
        return storePackage ? [{ ...item, storePackage }] : [];
      }),
    [cartItems, packageMap],
  );

  const cartTotal = useMemo(
    () =>
      cartLines.reduce(
        (total, line) =>
          total + line.storePackage.priceCzk * line.quantity,
        0,
      ),
    [cartLines],
  );

  const selectedPackageNotice = useMemo(() => {
    if (!requestedPackageId) {
      return null;
    }

    const selectedPackage = packages.find(
      (entry) => entry.id === requestedPackageId,
    );
    return selectedPackage
      ? `Balíček ${selectedPackage.name} je stále dostupný. Přidej ho do košíku, pokud o něj máš zájem.`
      : null;
  }, [packages, requestedPackageId]);

  const missingMinecraft = Boolean(
    dashboard?.readiness.blockedReasons.includes("MINECRAFT_NOT_LINKED"),
  );
  const missingDiscord = Boolean(
    dashboard?.readiness.blockedReasons.includes("DISCORD_NOT_LINKED"),
  );

  const accountStateText = useMemo(() => {
    if (!dashboard) {
      return "Košík můžeš připravit bez přihlášení. Před checkoutem tě bezpečně vrátíme přes přihlášení zpět do store.";
    }

    if (dashboard.readiness.storeReady) {
      return "Účet je připravený pro nákup a doručení výhod na propojený Minecraft účet.";
    }

    return "Před checkoutem dokonči níže uvedená propojení účtu.";
  }, [dashboard]);

  const filteredPackages = useMemo(() => {
    return packages.filter(
      (entry) => getPackageCategory(entry) === activeCategoryId,
    );
  }, [activeCategoryId, packages]);

  const resetPendingCheckout = () => {
    pendingCheckoutRef.current = null;
  };

  const handleAddPackage = (entry: StorePackage) => {
    resetPendingCheckout();
    setErrorMessage(null);
    setCartItems((current) =>
      addPackageToCart(current, entry, packages),
    );

    if (normalizeStoreCategory(entry.category) === "rank") {
      setActionMessage(
        `${entry.name} je v košíku. Případný předchozí rank byl nahrazen.`,
      );
    } else {
      setActionMessage(`${entry.name} byl přidán do košíku.`);
    }
  };

  const handleQuantityChange = (packageId: string, quantity: number) => {
    resetPendingCheckout();
    setCartItems((current) =>
      setCartItemQuantity(current, packageId, quantity),
    );
  };

  const handleRemoveItem = (packageId: string) => {
    resetPendingCheckout();
    setCartItems((current) => removeCartItem(current, packageId));
  };

  const handleCheckout = async () => {
    if (submitGuardRef.current || !cartLines.length) {
      return;
    }

    if (!dashboard) {
      router.push("/login?next=%2Fstore");
      return;
    }

    if (!dashboard.readiness.storeReady) {
      setErrorMessage(
        "Checkout je dostupný až po dokončení chybějících propojení účtu.",
      );
      return;
    }

    submitGuardRef.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);
    setActionMessage(null);

    const items = cartLines.map(({ packageId, quantity }) => ({
      packageId,
      quantity,
    }));
    const cartSignature = createCartSignature(items);

    try {
      let orderId: string;
      const pendingCheckout = pendingCheckoutRef.current;

      if (
        pendingCheckout &&
        pendingCheckout.cartSignature === cartSignature
      ) {
        orderId = pendingCheckout.orderId;
      } else {
        const createOrderPayload =
          await apiRequest<StoreOrderCreateResponse>("/api/store/orders", {
            method: "POST",
            body: {
              items,
            },
          });
        orderId = createOrderPayload.order.id;
        pendingCheckoutRef.current = {
          orderId,
          cartSignature,
        };
      }

      const checkoutPayload = await apiRequest<CheckoutResponse>(
        `/api/store/orders/${encodeURIComponent(orderId)}/checkout`,
        {
          method: "POST",
        },
      );
      const destination = normalizeCheckoutDestination(
        checkoutPayload.checkout.checkoutUrl,
        window.location.origin,
      );

      if (!destination) {
        throw new Error("Checkout vrátil neplatnou cílovou URL.");
      }

      pendingCheckoutRef.current = null;
      setCartItems([]);
      writeStoreCart(window.localStorage, []);
      window.location.assign(destination);
    } catch (error) {
      if (
        error instanceof ApiError &&
        (error.code === "ORDER_NOT_READY_FOR_CHECKOUT" ||
          error.code === "ORDER_NOT_PAYABLE" ||
          error.code === "ORDER_NOT_FOUND")
      ) {
        pendingCheckoutRef.current = null;
      }

      setErrorMessage(buildFriendlyStoreError(error));
      submitGuardRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.intro}>
          <h2 className={styles.title}>{title}</h2>
          <p className={styles.description}>{description}</p>
        </div>

        <div className={styles.trustBar}>
          <span>
            Digitální výhody doručujeme na propojený Minecraft účet.
          </span>
          <span>Support: Discord nebo support@valtherea.eu.</span>
        </div>

        <div className={styles.accountBanner}>
          <div>
            <strong>Než nakoupíš</strong>
            <p>{accountStateText}</p>
            {dashboard && !dashboard.readiness.storeReady ? (
              <ul className={styles.readinessLinks}>
                {missingMinecraft ? (
                  <li>
                    <Link href="/account#minecraft-link">
                      Chybí propojení Minecraftu
                    </Link>
                  </li>
                ) : null}
                {missingDiscord ? (
                  <li>
                    <Link href="/account#discord-link">
                      Chybí propojení Discordu
                    </Link>
                  </li>
                ) : null}
              </ul>
            ) : null}
          </div>
        </div>

        {errorMessage ? (
          <div className={`${styles.message} ${styles["message--error"]}`}>
            {errorMessage}
          </div>
        ) : null}
        {actionMessage ? (
          <div className={`${styles.message} ${styles["message--success"]}`}>
            {actionMessage}
          </div>
        ) : null}
        {selectedPackageNotice ? (
          <div className={`${styles.message} ${styles["message--success"]}`}>
            {selectedPackageNotice}
          </div>
        ) : null}
        {isLoading ? (
          <p className={styles.loading}>Načítám nabídku store...</p>
        ) : null}

        {!isLoading && !packages.length ? (
          <div className={styles.emptyState}>
            <h3>Nabídka teď není dostupná</h3>
            <p>
              Nákup nechceme zobrazovat napůl. Jakmile bude store dostupný,
              balíčky se tady načtou znovu. Pro pomoc napiš na Discord nebo
              support@valtherea.eu.
            </p>
          </div>
        ) : null}

        {packages.length ? (
          <>
            <div className={styles.catalogLayout}>
            <div className={styles.storeLayout}>
              <div className={styles.categoryBar} aria-label="Kategorie store" role="group">
                <span className={styles.categoryLabel}>KATEGORIE:</span>
                <div className={styles.categoryList}>
                  {storeCategories.map((category) => (
                    <button
                      aria-pressed={activeCategoryId === category.id}
                      className={`${styles.categoryButton} ${
                        activeCategoryId === category.id
                          ? styles.categoryButtonActive
                          : ""
                      }`}
                      key={category.id}
                      onClick={() => setActiveCategoryId(category.id)}
                      type="button"
                    >
                      {category.title}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.grid}>
                {filteredPackages.map((entry, index) => (
                  <article
                    className={`${styles.card} ${styles.productCard}`}
                    data-testid={`store-product-${entry.id}`}
                    key={entry.id}
                  >
                    <div className={styles.productMedia}>
                      <Image
                        alt={entry.name}
                        className={styles.productImage}
                        fill
                        priority={index < 3}
                        sizes="(min-width: 1080px) 360px, (min-width: 768px) 50vw, 100vw"
                        src="/assets/figma/store/package-world.png"
                      />
                      <div className={styles.productMediaOverlay}>
                        <span className={styles.label}>
                          {normalizeStoreCategory(entry.category) === "keys"
                            ? "Klíče"
                            : "Rank"}
                        </span>
                      </div>
                    </div>

                    <div className={styles.productMeta}>
                      <h3>{entry.name}</h3>
                      <strong className={styles.price}>
                        {formatCzk(entry.priceCzk)}
                      </strong>
                    </div>

                    <p className={styles.productDescription}>
                      {entry.shortDescription}
                    </p>

                    <div className={styles.productTags}>
                      {entry.benefits[0] || entry.tags.join(" • ")}
                    </div>

                    <button
                      aria-label={`${getPackageActionLabel(entry)}: ${entry.name}`}
                      className={`button button--primary ${styles.productButton}`}
                      disabled={isSubmitting || entry.checkoutReady === false}
                      onClick={() => handleAddPackage(entry)}
                      type="button"
                    >
                      {entry.checkoutReady === false
                        ? "Dočasně nedostupné"
                        : (
                          <>
                            <Image
                              alt=""
                              aria-hidden="true"
                              height={30}
                              src="/assets/figma/icons/cart.png"
                              width={30}
                            />
                            Přidat do košíku
                          </>
                        )}
                    </button>
                  </article>
                ))}
              </div>
            </div>

            <section
              aria-labelledby="store-cart-title"
              className={styles.cart}
              data-testid="store-cart"
            >
              <div className={styles.cartHeader}>
                <div>
                  <span className={styles.guideEyebrow}>Souhrn nákupu</span>
                  <h3 id="store-cart-title">Košík</h3>
                </div>
                <span>
                  {cartLines.reduce(
                    (quantity, item) => quantity + item.quantity,
                    0,
                  )}{" "}
                  ks
                </span>
              </div>

              {!isCartHydrated ? (
                <p className={styles.cartEmpty}>Načítám uložený košík…</p>
              ) : null}
              {isCartHydrated && !cartLines.length ? (
                <p className={styles.cartEmpty}>
                  Košík je prázdný. Vyber rank nebo libovolné množství klíčů.
                </p>
              ) : null}

              {cartLines.length ? (
                <div className={styles.cartLines}>
                  {cartLines.map(({ storePackage, quantity }) => {
                    const isRank =
                      normalizeStoreCategory(storePackage.category) === "rank";

                    return (
                      <article
                        className={styles.cartLine}
                        data-testid={`cart-line-${storePackage.id}`}
                        key={storePackage.id}
                      >
                        <div className={styles.cartLineDescription}>
                          <strong>{storePackage.name}</strong>
                          <small>
                            {formatCzk(storePackage.priceCzk)} za kus
                          </small>
                        </div>

                        {isRank ? (
                          <span
                            className={styles.rankQuantity}
                            data-testid={`cart-quantity-${storePackage.id}`}
                          >
                            1× rank
                          </span>
                        ) : (
                          <div
                            aria-label={`Množství ${storePackage.name}`}
                            className={styles.quantityControls}
                          >
                            <button
                              aria-label={`Snížit množství ${storePackage.name}`}
                              disabled={isSubmitting || quantity <= 1}
                              onClick={() =>
                                handleQuantityChange(
                                  storePackage.id,
                                  quantity - 1,
                                )
                              }
                              type="button"
                            >
                              −
                            </button>
                            <output
                              aria-live="polite"
                              data-testid={`cart-quantity-${storePackage.id}`}
                            >
                              {quantity}
                            </output>
                            <button
                              aria-label={`Zvýšit množství ${storePackage.name}`}
                              disabled={
                                isSubmitting ||
                                !Number.isSafeInteger(quantity + 1)
                              }
                              onClick={() =>
                                handleQuantityChange(
                                  storePackage.id,
                                  quantity + 1,
                                )
                              }
                              type="button"
                            >
                              +
                            </button>
                          </div>
                        )}

                        <strong className={styles.cartLinePrice}>
                          {formatCzk(storePackage.priceCzk * quantity)}
                        </strong>
                        <button
                          className={styles.removeButton}
                          disabled={isSubmitting}
                          onClick={() => handleRemoveItem(storePackage.id)}
                          type="button"
                        >
                          Odebrat
                        </button>
                      </article>
                    );
                  })}
                </div>
              ) : null}

              <div className={styles.cartFooter}>
                <div>
                  <span>Orientační celkem</span>
                  <strong data-testid="cart-total">
                    {formatCzk(cartTotal)}
                  </strong>
                  <small>
                    Finální cenu vždy znovu určí backend při vytvoření
                    objednávky.
                  </small>
                </div>
                <button
                  className="button button--primary"
                  data-testid="store-checkout"
                  disabled={
                    !cartLines.length ||
                    isSubmitting ||
                    Boolean(dashboard && !dashboard.readiness.storeReady)
                  }
                  onClick={() => void handleCheckout()}
                  type="button"
                >
                  {isSubmitting
                    ? "Připravuji checkout…"
                    : dashboard
                      ? "Pokračovat k platbě"
                      : "Přihlásit se a pokračovat"}
                </button>
              </div>
            </section>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
};
