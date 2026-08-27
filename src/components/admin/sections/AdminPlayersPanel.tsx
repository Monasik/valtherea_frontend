"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ApiError, apiRequest } from "@/lib/api/client";
import type {
  AdminGrantResponse,
  AdminOverviewResponse,
  AdminPlayerDetailResponse,
  AdminPlayerSummary,
  AdminPlayersResponse,
} from "@/lib/api/types";
import styles from "./AdminPanelSection.module.scss";

function formatDate(value?: string | null) {
  if (!value) return "zatím ne";

  return new Intl.DateTimeFormat("cs-CZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

type AdminPlayersPanelProps = {
  overview: AdminOverviewResponse;
  reloadOverview: () => Promise<void>;
};

export const AdminPlayersPanel = ({
  overview,
  reloadOverview,
}: AdminPlayersPanelProps) => {
  const [players, setPlayers] = useState<AdminPlayerSummary[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminPlayerDetailResponse | null>(null);
  const [query, setQuery] = useState("");
  const [selectedPackageId, setSelectedPackageId] = useState(
    overview.packages[0]?.id || "",
  );
  const [grantNote, setGrantNote] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const playersRequestIdRef = useRef(0);
  const detailRequestIdRef = useRef(0);

  const loadPlayers = useCallback(async (search: string) => {
    const requestId = ++playersRequestIdRef.current;
    const payload = await apiRequest<AdminPlayersResponse>(
      `/api/admin/players?q=${encodeURIComponent(search)}`,
    );

    if (requestId !== playersRequestIdRef.current) return;

    setPlayers(payload.players);
    setSelectedPlayerId((current) => {
      if (current && payload.players.some((entry) => entry.user.id === current)) {
        return current;
      }
      return payload.players[0]?.user.id || null;
    });
  }, []);

  const loadDetail = useCallback(async (userId: string) => {
    const requestId = ++detailRequestIdRef.current;
    const payload = await apiRequest<AdminPlayerDetailResponse>(
      `/api/admin/players/${encodeURIComponent(userId)}`,
    );

    if (requestId !== detailRequestIdRef.current) return;

    setDetail(payload);
    setSelectedPackageId((current) => current || payload.packages[0]?.id || "");
  }, []);

  useEffect(() => {
    let cancelled = false;

    const timeout = window.setTimeout(async () => {
      if (!cancelled) {
        setIsLoading(true);
        setErrorMessage(null);
      }

      try {
        await loadPlayers(query);
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof ApiError
              ? error.message
              : "Hledání hráčů se nepodařilo.",
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }, query ? 250 : 0);

    return () => {
      cancelled = true;
      playersRequestIdRef.current += 1;
      window.clearTimeout(timeout);
    };
  }, [loadPlayers, query]);

  useEffect(() => {
    if (!selectedPlayerId) return;

    let cancelled = false;
    const timeout = window.setTimeout(() => {
      if (!cancelled) setDetail(null);
      void loadDetail(selectedPlayerId).catch((error) => {
        if (!cancelled) {
          setErrorMessage(
            error instanceof ApiError
              ? error.message
              : "Detail hráče se nepodařilo načíst.",
          );
        }
      });
    }, 0);

    return () => {
      cancelled = true;
      detailRequestIdRef.current += 1;
      window.clearTimeout(timeout);
    };
  }, [loadDetail, selectedPlayerId]);

  const selectedPlayer = useMemo(
    () =>
      players.find((entry) => entry.user.id === selectedPlayerId) || null,
    [players, selectedPlayerId],
  );

  const refresh = async (userId: string) => {
    await Promise.all([
      loadPlayers(query),
      loadDetail(userId),
      reloadOverview(),
    ]);
  };

  const toggleAdminRole = async () => {
    if (!detail || isSaving) return;
    setIsSaving(true);
    setMessage(null);
    setErrorMessage(null);

    const hasAdmin = detail.player.user.roles.includes("admin");
    const roles = hasAdmin
      ? detail.player.user.roles.filter((role) => role !== "admin")
      : [...detail.player.user.roles, "admin"];

    try {
      await apiRequest(
        `/api/admin/players/${encodeURIComponent(detail.player.user.id)}/roles`,
        {
          method: "PUT",
          body: { roles },
        },
      );
      setMessage(
        hasAdmin ? "Admin přístup byl odebrán." : "Admin přístup byl přidán.",
      );
      await refresh(detail.player.user.id);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : "Role se nepodařilo uložit.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const grantPackage = async () => {
    if (!detail || !selectedPackageId || isSaving) return;
    setIsSaving(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const response = await apiRequest<AdminGrantResponse>(
        `/api/admin/players/${encodeURIComponent(detail.player.user.id)}/grants`,
        {
          method: "POST",
          body: {
            packageId: selectedPackageId,
            note: grantNote,
          },
        },
      );

      setMessage(
        `Odměna byla zařazena k doručení jako objednávka ${response.grant.order.id}.`,
      );
      setGrantNote("");
      await refresh(detail.player.user.id);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : "Odměnu se nepodařilo odeslat na server.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.contentStack}>
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>Hráči</p>
          <h3>Účty a ruční odměny</h3>
        </div>
        <p className={styles.muted}>
          Správa přístupů a oddělený admin grant flow s providerem{" "}
          <code>admin_grant</code>.
        </p>
      </div>

      {message ? (
        <div className={styles.banner} role="status">
          {message}
        </div>
      ) : null}
      {errorMessage ? (
        <div
          className={`${styles.banner} ${styles.bannerError}`}
          role="alert"
        >
          {errorMessage}
        </div>
      ) : null}

      <div className={styles.layout}>
        <aside className={styles.panel}>
          <h3>Seznam hráčů</h3>
          <label className={styles.visuallyHidden} htmlFor="admin-player-search">
            Hledat hráče
          </label>
          <input
            className={styles.search}
            id="admin-player-search"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Hledat nick, e-mail nebo Discord"
            type="search"
            value={query}
          />
          {isLoading ? (
            <p className={styles.muted} role="status">
              Načítám hráče…
            </p>
          ) : null}
          {!isLoading && !players.length ? (
            <p className={styles.muted}>Žádný hráč neodpovídá hledání.</p>
          ) : null}
          <div className={styles.list}>
            {players.map((entry) => (
              <button
                aria-pressed={entry.user.id === selectedPlayerId}
                className={`${styles.playerButton} ${
                  entry.user.id === selectedPlayerId
                    ? styles.playerButtonActive
                    : ""
                }`}
                key={entry.user.id}
                onClick={() => {
                  if (entry.user.id === selectedPlayerId) return;
                  detailRequestIdRef.current += 1;
                  setDetail(null);
                  setSelectedPlayerId(entry.user.id);
                }}
                type="button"
              >
                <strong>
                  {entry.minecraft?.username ||
                    entry.user.minecraftName ||
                    entry.user.email}
                </strong>
                <span className={styles.muted}>{entry.user.email}</span>
                <span className={styles.muted}>
                  {entry.ordersCount} objednávek
                </span>
              </button>
            ))}
          </div>
        </aside>

        <main className={styles.detail}>
          {!detail ||
          !selectedPlayer ||
          detail.player.user.id !== selectedPlayer.user.id ? (
            <p className={styles.muted}>Vyber hráče ze seznamu.</p>
          ) : (
            <div className={styles.detailGrid}>
              <div>
                <div className={styles.row}>
                  <div>
                    <h3>
                      {detail.player.minecraft?.username ||
                        detail.player.user.email}
                    </h3>
                    <p className={styles.muted}>
                      {detail.player.user.email}
                    </p>
                  </div>
                  <div className={styles.badges}>
                    {detail.player.user.roles.map((role) => (
                      <span className={styles.badge} key={role}>
                        {role}
                      </span>
                    ))}
                  </div>
                </div>

                <div className={styles.orders}>
                  <h3>Seznam nákupů</h3>
                  {!detail.player.orders.length ? (
                    <p className={styles.muted}>Zatím žádný nákup.</p>
                  ) : null}
                  {detail.player.orders.map(({ order, rewardDelivery }) => (
                    <article className={styles.order} key={order.id}>
                      <div className={styles.row}>
                        <strong>{order.packageName}</strong>
                        <span className={styles.badge}>
                          {order.orderStatus}
                        </span>
                      </div>
                      <p className={styles.muted}>
                        {order.totalPriceCzk} Kč · {formatDate(order.createdAt)} ·
                        delivery {order.deliveryStatus}
                      </p>
                      <p className={styles.muted}>
                        Účtenka/order ID: {order.id}
                      </p>
                      {rewardDelivery ? (
                        <p className={styles.muted}>
                          Reward záznam je připravený.
                        </p>
                      ) : null}
                    </article>
                  ))}
                </div>
              </div>

              <aside className={styles.grantBox}>
                <h3>Odměna hráči</h3>
                <p className={styles.muted}>
                  Vytvoří interní objednávku přes oddělený admin grant. Tato
                  akce nepředstírá Stripe platbu.
                </p>
                <label className={styles.field}>
                  <span>Balíček ze store</span>
                  <select
                    onChange={(event) =>
                      setSelectedPackageId(event.target.value)
                    }
                    value={selectedPackageId}
                  >
                    {(detail.packages.length
                      ? detail.packages
                      : overview.packages
                    ).map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.name} ({entry.priceCzk} Kč)
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Poznámka</span>
                  <textarea
                    onChange={(event) => setGrantNote(event.target.value)}
                    value={grantNote}
                  />
                </label>
                <div className={styles.actions}>
                  <button
                    className="button button--primary"
                    disabled={isSaving || !detail.player.minecraft}
                    onClick={grantPackage}
                    type="button"
                  >
                    {isSaving ? "Odesílám…" : "Darovat odměnu"}
                  </button>
                  <button
                    className="button button--secondary"
                    disabled={isSaving}
                    onClick={toggleAdminRole}
                    type="button"
                  >
                    {detail.player.user.roles.includes("admin")
                      ? "Odebrat admin"
                      : "Přidat admin"}
                  </button>
                  <Link className="button button--ghost" href="/account">
                    Můj účet
                  </Link>
                </div>
                {!detail.player.minecraft ? (
                  <p className={styles.muted}>
                    Hráč ještě nemá propojený Minecraft účet.
                  </p>
                ) : null}
              </aside>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
