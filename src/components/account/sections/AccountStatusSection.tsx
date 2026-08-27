"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { apiRequest, ApiError } from "@/lib/api/client";
import type {
  AccountDashboard,
  AccountOrder,
  AuthResponse,
  LinkCodeResponse,
  StoreOrderDetailResponse,
  StoreOrdersResponse,
} from "@/lib/api/types";
import { normalizeCheckoutDestination } from "@/lib/navigation/safeInternalPath";
import styles from "./AccountStatusSection.module.scss";

type AccountStatusSectionProps = {
  title: string;
  description: string;
};

type ReturnVerificationState =
  | "idle"
  | "verifying"
  | "resolved"
  | "timeout"
  | "error";

const PAYMENT_TERMINAL_STATES = new Set([
  "succeeded",
  "failed",
  "cancelled",
  "expired",
  "refunded",
  "chargeback",
  "manual_review",
]);

const RETURN_POLL_INTERVAL_MS = 750;
const RETURN_POLL_TIMEOUT_MS = 15_000;

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Zatím ne";
  }

  return new Intl.DateTimeFormat("cs-CZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatCzk(value: number) {
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: "CZK",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatBlockedReasons(blockedReasons: string[]) {
  if (!blockedReasons.length) {
    return "Účet je připravený pro store.";
  }

  return blockedReasons
    .map((entry) => {
      switch (entry) {
        case "MINECRAFT_NOT_LINKED":
          return "chybí propojení Minecraftu";
        case "DISCORD_NOT_LINKED":
          return "chybí propojení Discordu";
        default:
          return entry.toLowerCase();
      }
    })
    .join(", ");
}

function formatOrderStatus(status: string) {
  switch (status) {
    case "awaiting_payment":
      return "čeká na platbu";
    case "payment_processing":
      return "platba se zpracovává";
    case "paid":
      return "zaplaceno";
    case "delivery_queued":
      return "čeká na doručení";
    case "delivering":
      return "doručuje se";
    case "delivered":
      return "doručeno";
    case "delivery_failed":
      return "doručení selhalo";
    case "payment_failed":
      return "platba selhala";
    case "cancelled":
      return "zrušeno";
    case "expired":
      return "vypršelo";
    case "refunded":
      return "vráceno";
    case "revoked":
      return "odebráno";
    case "manual_review":
      return "čeká na kontrolu";
    default:
      return status.replace(/_/g, " ");
  }
}

function formatPaymentStatus(status: string) {
  switch (status) {
    case "not_started":
      return "nezahájena";
    case "checkout_created":
      return "checkout připraven";
    case "pending":
      return "ověřuje se";
    case "succeeded":
      return "zaplaceno";
    case "failed":
      return "selhala";
    case "cancelled":
      return "zrušena";
    case "expired":
      return "vypršela";
    case "refunded":
      return "vrácena";
    case "chargeback":
      return "reklamována";
    case "manual_review":
      return "ruční kontrola";
    default:
      return status.replace(/_/g, " ");
  }
}

function formatDeliveryStatus(status: string) {
  switch (status) {
    case "not_ready":
      return "čeká na platbu";
    case "queued":
      return "ve frontě";
    case "leased":
      return "doručuje se";
    case "succeeded":
      return "doručeno";
    case "failed_retryable":
      return "dočasně selhalo";
    case "failed_terminal":
      return "doručení selhalo";
    case "revoked":
      return "odebráno";
    default:
      return status.replace(/_/g, " ");
  }
}

function shortenOrderId(orderId: string) {
  if (orderId.length <= 14) {
    return orderId;
  }

  return `${orderId.slice(0, 7)}…${orderId.slice(-6)}`;
}

function getOrderHelp(order: AccountOrder) {
  if (
    order.orderStatus === "payment_failed" ||
    order.paymentStatus === "failed"
  ) {
    return "Platba se nepotvrdila. Nevytvářej stejný nákup opakovaně; pokud byla částka stržena, kontaktuj podporu s ID objednávky.";
  }

  if (
    order.orderStatus === "delivery_failed" ||
    order.deliveryStatus === "failed_retryable" ||
    order.deliveryStatus === "failed_terminal"
  ) {
    return "Platba může být v pořádku, ale doručení se nezdařilo. Nákup neopakuj a pošli podpoře ID objednávky.";
  }

  if (
    order.orderStatus === "manual_review" ||
    order.paymentStatus === "manual_review"
  ) {
    return "Objednávku kontroluje podpora. Do vyřešení nevytvářej duplicitní nákup.";
  }

  return null;
}

function buildBanner(searchParams: Pick<URLSearchParams, "get">) {
  if (searchParams.get("discord") === "linked") {
    return {
      tone: "success" as const,
      text: "Discord účet je úspěšně propojený.",
    };
  }

  if (searchParams.get("discord") === "error") {
    return {
      tone: "error" as const,
      text: `Discord flow skončil chybou: ${searchParams.get("discordCode") || "neznamy_problem"}`,
    };
  }

  if (searchParams.get("cancelled") === "1") {
    return {
      tone: "warning" as const,
      text: "Checkout byl přerušený nebo nedokončený. Níže ověřujeme skutečný stav objednávky.",
    };
  }

  if (searchParams.get("paid") === "1" && !searchParams.get("checkout")) {
    return {
      tone: "warning" as const,
      text: "Návrat z platební brány sám nepotvrzuje platbu. Bez ID objednávky stav nelze automaticky ověřit.",
    };
  }

  return null;
}

export const AccountStatusSection = ({
  title,
  description,
}: AccountStatusSectionProps) => {
  const t = useTranslations("account.status");
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightedOrderId = searchParams.get("checkout");
  const isCancelledReturn = searchParams.get("cancelled") === "1";
  const [dashboard, setDashboard] = useState<AccountDashboard | null>(null);
  const [orders, setOrders] = useState<AccountDashboard["recentOrders"]>([]);
  const [returnOrder, setReturnOrder] = useState<AccountOrder | null>(null);
  const [returnVerificationState, setReturnVerificationState] =
    useState<ReturnVerificationState>(
      highlightedOrderId ? "verifying" : "idle",
    );
  const [returnRefreshKey, setReturnRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isCreatingLinkCode, setIsCreatingLinkCode] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [profileForm, setProfileForm] = useState({
    minecraftName: "",
    discordName: "",
  });

  const banner = useMemo(() => buildBanner(searchParams), [searchParams]);

  const fetchAccountData = useCallback(async () => {
    const [dashboardPayload, ordersPayload] = await Promise.all([
      apiRequest<AccountDashboard>("/api/account/dashboard"),
      apiRequest<StoreOrdersResponse>("/api/store/orders"),
    ]);

    return {
      dashboardPayload,
      ordersPayload,
    };
  }, []);

  const applyAccountData = useCallback(
    ({
      dashboardPayload,
      ordersPayload,
    }: {
      dashboardPayload: AccountDashboard;
      ordersPayload: StoreOrdersResponse;
    }) => {
      setDashboard(dashboardPayload);
      setOrders(ordersPayload.orders);
      setProfileForm({
        minecraftName: dashboardPayload.profile.minecraftName || "",
        discordName: dashboardPayload.profile.discordName || "",
      });
      setIsUnauthorized(false);
      setErrorMessage(null);
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    const syncAccount = async () => {
      try {
        const payload = await fetchAccountData();

        if (cancelled) {
          return;
        }

        applyAccountData(payload);
      } catch (error) {
        if (cancelled) {
          return;
        }

        if (error instanceof ApiError && error.status === 401) {
          setIsUnauthorized(true);
          setDashboard(null);
          setOrders([]);
          setErrorMessage(null);
        } else if (error instanceof ApiError) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage("Účet se nepodařilo načíst.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void syncAccount();

    return () => {
      cancelled = true;
    };
  }, [applyAccountData, fetchAccountData]);

  useEffect(() => {
    if (!highlightedOrderId) {
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const deadline = Date.now() + RETURN_POLL_TIMEOUT_MS;

    const pollOrder = async () => {
      try {
        const payload = await apiRequest<StoreOrderDetailResponse>(
          `/api/store/orders/${encodeURIComponent(highlightedOrderId)}`,
        );

        if (cancelled) {
          return;
        }

        setReturnOrder(payload.order);

        if (PAYMENT_TERMINAL_STATES.has(payload.order.paymentStatus)) {
          setReturnVerificationState("resolved");
          return;
        }

        if (Date.now() >= deadline) {
          setReturnVerificationState("timeout");
          return;
        }

        timer = setTimeout(pollOrder, RETURN_POLL_INTERVAL_MS);
      } catch {
        if (!cancelled) {
          setReturnVerificationState("error");
        }
      }
    };

    const startPolling = async () => {
      setReturnVerificationState("verifying");
      await pollOrder();
    };

    void startPolling();

    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [highlightedOrderId, returnRefreshKey]);

  const handleProfileSave = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setIsSavingProfile(true);
    setErrorMessage(null);
    setActionMessage(null);

    try {
      const response = await apiRequest<AuthResponse>("/api/account/me", {
        method: "PUT",
        body: profileForm,
      });

      setDashboard((current) =>
        current
          ? {
              ...current,
              profile: {
                ...current.profile,
                minecraftName: response.user.minecraftName,
                discordName: response.user.discordName,
              },
            }
          : current,
      );
      setActionMessage("Profil byl uložený.");
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : "Profil se nepodařilo uložit.",
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleCreateLinkCode = async () => {
    setIsCreatingLinkCode(true);
    setErrorMessage(null);
    setActionMessage(null);

    try {
      const payload = await apiRequest<LinkCodeResponse>(
        "/api/account/minecraft/link-code",
        {
          method: "POST",
        },
      );

      setDashboard((current) =>
        current
          ? {
              ...current,
              activeLinkCode: {
                code: payload.code,
                expiresAt: payload.expiresAt,
              },
            }
          : current,
      );
      setActionMessage(
        `Link kód ${payload.code} je připravený. Na serveru napiš /link ${payload.code}.`,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : "Link kód se nepodařilo vytvořit.",
      );
    } finally {
      setIsCreatingLinkCode(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await apiRequest<void>("/api/auth/logout", {
        method: "POST",
      });
      router.push("/login");
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : "Odhlášení se nepodařilo.",
      );
    } finally {
      setIsLoggingOut(false);
    }
  };

  const visibleOrders = useMemo(() => {
    const baseOrders = orders.length
      ? orders
      : dashboard?.recentOrders || [];

    if (!returnOrder || !highlightedOrderId) {
      return baseOrders;
    }

    const matchingIndex = baseOrders.findIndex(
      (order) => order.id === returnOrder.id,
    );

    if (matchingIndex === -1) {
      return [returnOrder, ...baseOrders];
    }

    return baseOrders.map((order) =>
      order.id === returnOrder.id ? returnOrder : order,
    );
  }, [dashboard?.recentOrders, highlightedOrderId, orders, returnOrder]);

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.surface}>
          <div className={styles.intro}>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>

          {banner ? (
            <div
              className={`${styles.banner} ${styles[`banner--${banner.tone}`]}`}
            >
              {banner.text}
            </div>
          ) : null}
          {errorMessage ? (
            <div className={`${styles.banner} ${styles["banner--error"]}`}>
              {errorMessage}
            </div>
          ) : null}
          {actionMessage ? (
            <div className={`${styles.banner} ${styles["banner--success"]}`}>
              {actionMessage}
            </div>
          ) : null}

          {highlightedOrderId ? (
            <article
              aria-live="polite"
              className={styles.returnPanel}
              data-testid="payment-return-status"
            >
              <span className={styles.kicker}>Návrat z checkoutu</span>
              <h3>
                {returnVerificationState === "verifying"
                  ? "Ověřujeme stav platby"
                  : isCancelledReturn
                    ? "Checkout nebyl dokončen"
                    : "Aktuální stav objednávky"}
              </h3>

              {returnVerificationState === "verifying" ? (
                <p>
                  Čekáme na potvrzení backendu a platebního webhooku. Tato
                  stránka sama platbu nepotvrzuje.
                </p>
              ) : null}

              {returnOrder ? (
                <dl className={styles.returnStatusGrid}>
                  <div>
                    <dt>Objednávka</dt>
                    <dd>{shortenOrderId(returnOrder.id)}</dd>
                  </div>
                  <div>
                    <dt>Platba</dt>
                    <dd>{formatPaymentStatus(returnOrder.paymentStatus)}</dd>
                  </div>
                  <div>
                    <dt>Doručení</dt>
                    <dd>{formatDeliveryStatus(returnOrder.deliveryStatus)}</dd>
                  </div>
                </dl>
              ) : null}

              {returnVerificationState === "timeout" ? (
                <p>
                  Ověření trvá déle než obvykle. Zpracování může pokračovat na
                  pozadí; nákup zatím neopakuj.
                </p>
              ) : null}

              {returnVerificationState === "error" ? (
                <p>
                  Stav objednávky se teď nepodařilo načíst. Zkontroluj
                  přihlášení a zkus obnovení znovu.
                </p>
              ) : null}

              {returnVerificationState === "timeout" ||
              returnVerificationState === "error" ? (
                <button
                  className="button button--secondary"
                  onClick={() => {
                    setReturnVerificationState("verifying");
                    setReturnRefreshKey((current) => current + 1);
                  }}
                  type="button"
                >
                  Obnovit stav
                </button>
              ) : null}
            </article>
          ) : null}

          {isLoading ? (
            <p className={styles.stateText}>Načítám účet…</p>
          ) : null}

          {!isLoading && isUnauthorized ? (
            <div className={styles.authSurface}>
              <p>
                Účet zatím není přihlášený. Přihlas se a hned uvidíš stav
                propojení i objednávky.
              </p>
              <div className={styles.buttonRow}>
                <Link className="button button--primary" href="/login">
                  Přihlášení
                </Link>
                <Link className="button button--secondary" href="/store">
                  Zpět na store
                </Link>
              </div>
            </div>
          ) : null}

          {!isLoading && dashboard ? (
            <>
              <div className={styles.grid}>
                <article className={styles.card}>
                  <span className={styles.kicker}>Souhrn</span>
                  <h3>{dashboard.profile.email}</h3>
                  <dl className={styles.definitionList}>
                    <div>
                      <dt>Minecraft</dt>
                      <dd>
                        {dashboard.minecraft.username ||
                          dashboard.profile.minecraftName ||
                          "Nepropojeno"}
                      </dd>
                    </div>
                    <div>
                      <dt>Discord</dt>
                      <dd>
                        {dashboard.discord.displayName ||
                          dashboard.profile.discordName ||
                          "Nepropojeno"}
                      </dd>
                    </div>
                    <div>
                      <dt>Objednávky</dt>
                      <dd>{dashboard.stats.ordersCount}</dd>
                    </div>
                  </dl>
                </article>

                <article className={styles.card}>
                  <span className={styles.kicker}>Připravenost</span>
                  <h3>
                    {dashboard.readiness.storeReady
                      ? "Připraveno pro nákup"
                      : "Ještě chybí pár kroků"}
                  </h3>
                  <ul className={styles.statusList}>
                    <li>
                      <strong>Minecraft:</strong>{" "}
                      {dashboard.minecraft.isLinked
                        ? "propojeno"
                        : "čeká na propojení"}
                    </li>
                    <li>
                      <strong>Discord:</strong>{" "}
                      {dashboard.discord.isLinked
                        ? "propojeno"
                        : "čeká na propojení"}
                    </li>
                    <li>
                      <strong>Nákup:</strong>{" "}
                      {formatBlockedReasons(
                        dashboard.readiness.blockedReasons,
                      )}
                    </li>
                  </ul>
                </article>
              </div>

              <div className={styles.grid}>
                <article className={styles.card}>
                  <span className={styles.kicker}>Profil</span>
                  <h3>Uprav si údaje pro navazující flow</h3>
                  <form
                    className={styles.form}
                    onSubmit={handleProfileSave}
                  >
                    <label className={styles.field}>
                      <span>Minecraft jméno</span>
                      <input
                        onChange={(event) =>
                          setProfileForm((current) => ({
                            ...current,
                            minecraftName: event.target.value,
                          }))
                        }
                        type="text"
                        value={profileForm.minecraftName}
                      />
                    </label>
                    <label className={styles.field}>
                      <span>Discord jméno</span>
                      <input
                        onChange={(event) =>
                          setProfileForm((current) => ({
                            ...current,
                            discordName: event.target.value,
                          }))
                        }
                        type="text"
                        value={profileForm.discordName}
                      />
                    </label>
                    <div className={styles.buttonRow}>
                      <button
                        className="button button--primary"
                        disabled={isSavingProfile}
                        type="submit"
                      >
                        {isSavingProfile ? "Ukládám..." : "Uložit profil"}
                      </button>
                      <button
                        className="button button--ghost"
                        disabled={isLoggingOut}
                        onClick={handleLogout}
                        type="button"
                      >
                        {isLoggingOut ? "Odhlašuji..." : "Odhlásit"}
                      </button>
                    </div>
                  </form>
                </article>

                <article className={styles.card}>
                  <span className={styles.kicker}>
                    {t("cards.0.kicker")}
                  </span>
                  <h3>{t("cards.0.title")}</h3>
                  <p>{t("cards.0.description")}</p>
                  <ul className={styles.statusList}>
                    <li
                      className={styles.accountAnchor}
                      id="minecraft-link"
                    >
                      <strong>Link kód:</strong>{" "}
                      {dashboard.activeLinkCode
                        ? `${dashboard.activeLinkCode.code} do ${formatDate(
                            dashboard.activeLinkCode.expiresAt,
                          )}`
                        : "zatím nevygenerovaný"}
                    </li>
                    {dashboard.activeLinkCode ? (
                      <li className={styles.commandHint}>
                        Na serveru napiš{" "}
                        <code>/link {dashboard.activeLinkCode.code}</code>
                      </li>
                    ) : null}
                    <li
                      className={styles.accountAnchor}
                      id="discord-link"
                    >
                      <strong>Discord:</strong>{" "}
                      {dashboard.discord.isLinked
                        ? "propojeno"
                        : "zatím nepropojeno"}
                    </li>
                    <li>
                      <strong>Poslední propojení Minecraftu:</strong>{" "}
                      {formatDate(dashboard.minecraft.linkedAt)}
                    </li>
                  </ul>
                  <div className={styles.buttonRow}>
                    <button
                      className="button button--secondary"
                      disabled={
                        isCreatingLinkCode || dashboard.minecraft.isLinked
                      }
                      onClick={handleCreateLinkCode}
                      type="button"
                    >
                      {isCreatingLinkCode
                        ? "Generuji..."
                        : "Vygenerovat link kód"}
                    </button>
                    <Link
                      className="button button--ghost"
                      href="/api/account/discord/connect"
                    >
                      {dashboard.discord.isLinked
                        ? "Obnovit Discord link"
                        : "Propojit Discord"}
                    </Link>
                  </div>
                </article>
              </div>

              <article className={styles.card}>
                <span className={styles.kicker}>
                  {t("cards.1.kicker")}
                </span>
                <h3>{t("cards.1.title")}</h3>
                <p>{t("cards.1.description")}</p>

                {!visibleOrders.length ? (
                  <p className={styles.stateText}>
                    Zatím tu není žádná objednávka.
                  </p>
                ) : (
                  <div className={styles.orders}>
                    {visibleOrders.map((order) => {
                      const isHighlighted =
                        highlightedOrderId === order.id;
                      const orderHelp = getOrderHelp(order);
                      const continueCheckoutUrl =
                        order.checkout?.canContinue &&
                        order.checkout.checkoutUrl
                          ? normalizeCheckoutDestination(
                              order.checkout.checkoutUrl,
                              "https://valtherea.internal",
                            )
                          : null;
                      const lineItems = Array.isArray(order.lineItems)
                        ? order.lineItems
                        : [];

                      return (
                        <article
                          className={`${styles.orderRow} ${
                            isHighlighted
                              ? styles.orderRowHighlighted
                              : ""
                          }`}
                          data-testid={`account-order-${order.id}`}
                          key={order.id}
                        >
                          <div className={styles.orderHeader}>
                            <div>
                              <span className={styles.orderId}>
                                Objednávka {shortenOrderId(order.id)}
                              </span>
                              <strong>{order.packageName}</strong>
                            </div>
                            <span className={styles.orderStatus}>
                              {formatOrderStatus(order.orderStatus)}
                            </span>
                          </div>

                          <ul
                            aria-label={`Položky objednávky ${shortenOrderId(
                              order.id,
                            )}`}
                            className={styles.orderItems}
                          >
                            {lineItems.map((line) => (
                              <li
                                key={`${order.id}-${line.packageId}`}
                              >
                                <span>
                                  {line.packageName} × {line.quantity}
                                </span>
                                <span>
                                  {formatCzk(line.unitPriceCzk)} / ks
                                </span>
                              </li>
                            ))}
                          </ul>

                          <dl className={styles.orderDetails}>
                            <div>
                              <dt>Celkem</dt>
                              <dd>{formatCzk(order.totalPriceCzk)}</dd>
                            </div>
                            <div>
                              <dt>Platba</dt>
                              <dd>
                                {formatPaymentStatus(order.paymentStatus)}
                              </dd>
                            </div>
                            <div>
                              <dt>Doručení</dt>
                              <dd>
                                {formatDeliveryStatus(order.deliveryStatus)}
                              </dd>
                            </div>
                            <div>
                              <dt>Minecraft účet</dt>
                              <dd>
                                {order.minecraftUsername || "Neuvedeno"}
                              </dd>
                            </div>
                            <div>
                              <dt>Vytvořeno</dt>
                              <dd>{formatDate(order.createdAt)}</dd>
                            </div>
                          </dl>

                          {orderHelp ? (
                            <p className={styles.orderHelp}>
                              {orderHelp}{" "}
                              <a href="mailto:support@valtherea.eu">
                                Napsat podpoře
                              </a>
                            </p>
                          ) : null}

                          {continueCheckoutUrl ? (
                            <div className={styles.orderActions}>
                              <a
                                className="button button--secondary"
                                href={continueCheckoutUrl}
                              >
                                Pokračovat v platbě
                              </a>
                              {order.checkout?.expiresAt ? (
                                <small>
                                  Checkout je platný do{" "}
                                  {formatDate(order.checkout.expiresAt)}.
                                </small>
                              ) : null}
                            </div>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                )}

                <div className={styles.buttonRow}>
                  <Link className="button button--primary" href="/store">
                    Otevřít store
                  </Link>
                </div>
              </article>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
};
