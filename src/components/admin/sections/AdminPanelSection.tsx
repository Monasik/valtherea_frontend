"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, apiRequest } from "@/lib/api/client";
import type { AdminOverviewResponse } from "@/lib/api/types";
import {
  AdminCommercePanel,
  type CommerceView,
} from "./AdminCommercePanel";
import { AdminPlayersPanel } from "./AdminPlayersPanel";
import styles from "./AdminPanelSection.module.scss";

type AdminSection =
  | "overview"
  | "players"
  | "store"
  | "orders"
  | "manual-review"
  | "delivery"
  | "readiness";

const ADMIN_SECTIONS: Array<{
  id: AdminSection;
  label: string;
  icon: string;
}> = [
  { id: "overview", label: "Přehled", icon: "⌂" },
  { id: "players", label: "Hráči", icon: "♙" },
  { id: "store", label: "Store provoz", icon: "▣" },
  { id: "orders", label: "Objednávky", icon: "≡" },
  { id: "manual-review", label: "Manual review", icon: "!" },
  { id: "delivery", label: "Delivery fronta", icon: "↻" },
  { id: "readiness", label: "Staging readiness", icon: "✓" },
];

const VALID_SECTIONS = new Set<AdminSection>(
  ADMIN_SECTIONS.map((entry) => entry.id),
);

function readLocationState() {
  if (typeof window === "undefined") {
    return { section: "overview" as AdminSection, orderId: null as string | null };
  }

  const params = new URLSearchParams(window.location.search);
  const candidate = params.get("section") as AdminSection | null;
  return {
    section:
      candidate && VALID_SECTIONS.has(candidate) ? candidate : "overview",
    orderId: params.get("order"),
  };
}

function accessErrorText(error: unknown) {
  if (error instanceof ApiError && error.status === 401) {
    return "Nejdřív se přihlas účtem s admin přístupem.";
  }
  if (error instanceof ApiError && error.status === 403) {
    return "Tento účet nemá přístup do admin panelu.";
  }
  return error instanceof ApiError
    ? error.message
    : "Admin panel se nepodařilo načíst.";
}

export const AdminPanelSection = () => {
  const [section, setSection] = useState<AdminSection>("overview");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    const payload = await apiRequest<AdminOverviewResponse>(
      "/api/admin/overview",
    );
    setOverview(payload);
  }, []);

  const verifyAccess = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await loadOverview();
    } catch (error) {
      setOverview(null);
      setErrorMessage(accessErrorText(error));
    } finally {
      setIsLoading(false);
    }
  }, [loadOverview]);

  useEffect(() => {
    const initial = readLocationState();
    const timeout = window.setTimeout(() => {
      setSection(initial.section);
      setSelectedOrderId(initial.orderId);
      void verifyAccess();
    }, 0);

    const onPopState = () => {
      const next = readLocationState();
      setSection(next.section);
      setSelectedOrderId(next.orderId);
    };
    window.addEventListener("popstate", onPopState);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("popstate", onPopState);
    };
  }, [verifyAccess]);

  const writeLocation = (
    nextSection: AdminSection,
    orderId: string | null,
    mode: "push" | "replace" = "push",
  ) => {
    const url = new URL(window.location.href);
    if (nextSection === "overview") {
      url.searchParams.delete("section");
    } else {
      url.searchParams.set("section", nextSection);
    }
    if (orderId) url.searchParams.set("order", orderId);
    else url.searchParams.delete("order");
    if (nextSection !== "orders") url.searchParams.delete("q");

    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
    if (mode === "replace") {
      window.history.replaceState({}, "", nextUrl);
    } else {
      window.history.pushState({}, "", nextUrl);
    }
  };

  const selectSection = (nextSection: AdminSection) => {
    setSection(nextSection);
    setSelectedOrderId(null);
    writeLocation(nextSection, null);
  };

  const openOrder = (orderId: string) => {
    setSection("orders");
    setSelectedOrderId(orderId);
    writeLocation("orders", orderId);
  };

  const clearOrder = () => {
    setSelectedOrderId(null);
    writeLocation(section, null, "replace");
  };

  const commerceView = section as CommerceView;

  return (
    <section className={styles.section}>
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <p className={styles.eyebrow}>Admin panel</p>
          <h2>Valtherea control room</h2>
          <p>
            Správa hráčů a bezpečný provoz plateb i doručení bez přímého
            přístupu do PostgreSQL.
          </p>
          {overview ? (
            <div className={styles.stats}>
              <div className={styles.stat}>
                <strong>{overview.stats.players}</strong>
                <span>hráčů</span>
              </div>
              <div className={styles.stat}>
                <strong>{overview.stats.orders}</strong>
                <span>objednávek</span>
              </div>
              <div className={styles.stat}>
                <strong>{overview.stats.queuedDeliveries}</strong>
                <span>ve frontě</span>
              </div>
              <div className={styles.stat}>
                <strong>{overview.stats.adminUsers}</strong>
                <span>admin účtů</span>
              </div>
            </div>
          ) : null}
        </header>

        {isLoading ? (
          <div className={styles.stateCard} role="status">
            <span className={styles.spinner} aria-hidden="true" />
            Ověřuji admin session…
          </div>
        ) : null}

        {!isLoading && errorMessage ? (
          <div className={`${styles.accessDenied} ${styles.bannerError}`}>
            <div role="alert">
              <strong>Admin přístup není dostupný.</strong>
              <p>{errorMessage}</p>
            </div>
            <button
              className="button button--secondary"
              onClick={() => void verifyAccess()}
              type="button"
            >
              Zkusit znovu
            </button>
          </div>
        ) : null}

        {!isLoading && overview ? (
          <>
            <nav
              aria-label="Sekce admin panelu"
              className={styles.adminNavigation}
            >
              {ADMIN_SECTIONS.map((entry) => (
                <button
                  aria-current={section === entry.id ? "page" : undefined}
                  className={`${styles.navButton} ${
                    section === entry.id ? styles.navButtonActive : ""
                  }`}
                  key={entry.id}
                  onClick={() => selectSection(entry.id)}
                  type="button"
                >
                  <span aria-hidden="true">{entry.icon}</span>
                  {entry.label}
                </button>
              ))}
            </nav>

            <main className={styles.adminContent}>
              {section === "overview" ? (
                <div className={styles.contentStack}>
                  <div className={styles.sectionHeading}>
                    <div>
                      <p className={styles.eyebrow}>Přehled</p>
                      <h3>Provozní rozcestník</h3>
                    </div>
                    <p className={styles.muted}>
                      Store operace používají session-authenticated API.
                      Interní Bearer token nikdy neopouští server.
                    </p>
                  </div>
                  <div className={styles.landingGrid}>
                    <button
                      className={styles.landingCard}
                      onClick={() => selectSection("store")}
                      type="button"
                    >
                      <span className={styles.landingIcon} aria-hidden="true">
                        ▣
                      </span>
                      <strong>Store provoz</strong>
                      <span>
                        Stav plateb, manual review, dead-letter joby a stale
                        leases.
                      </span>
                    </button>
                    <button
                      className={styles.landingCard}
                      onClick={() => selectSection("orders")}
                      type="button"
                    >
                      <span className={styles.landingIcon} aria-hidden="true">
                        ≡
                      </span>
                      <strong>Vyhledat objednávku</strong>
                      <span>
                        Detail flow, sanitizovaná timeline a bezpečné recovery
                        akce.
                      </span>
                    </button>
                    <button
                      className={styles.landingCard}
                      onClick={() => selectSection("readiness")}
                      type="button"
                    >
                      <span className={styles.landingIcon} aria-hidden="true">
                        ✓
                      </span>
                      <strong>Staging readiness</strong>
                      <span>
                        Read-only preflight konfigurace, databáze, plateb a
                        delivery.
                      </span>
                    </button>
                    <button
                      className={styles.landingCard}
                      onClick={() => selectSection("players")}
                      type="button"
                    >
                      <span className={styles.landingIcon} aria-hidden="true">
                        ♙
                      </span>
                      <strong>Hráči</strong>
                      <span>
                        Účty, role a oddělený admin grant flow.
                      </span>
                    </button>
                  </div>
                  <div className={styles.safetyNote}>
                    Konzole nenabízí Force paid, změnu částky nebo měny ani
                    falešný refund. Reconcile vždy zachovává provider evidence
                    a payment validation.
                  </div>
                </div>
              ) : null}

              {section === "players" ? (
                <AdminPlayersPanel
                  overview={overview}
                  reloadOverview={loadOverview}
                />
              ) : null}

              {[
                "store",
                "orders",
                "manual-review",
                "delivery",
                "readiness",
              ].includes(section) ? (
                <AdminCommercePanel
                  key={section}
                  onClearOrder={clearOrder}
                  onOpenOrder={openOrder}
                  selectedOrderId={selectedOrderId}
                  view={commerceView}
                />
              ) : null}
            </main>
          </>
        ) : null}
      </div>
    </section>
  );
};
