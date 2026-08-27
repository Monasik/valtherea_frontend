"use client";

import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ApiError, apiRequest } from "@/lib/api/client";
import type {
  AdminCommerceActionAvailability,
  AdminCommerceDeliveryJobsResponse,
  AdminCommerceManualReviewResponse,
  AdminCommerceMutationResponse,
  AdminCommerceOrderDetailResponse,
  AdminCommerceOrderSummary,
  AdminCommerceOrdersResponse,
  AdminCommerceOverviewResponse,
  AdminDeliveryJobSummary,
  AdminStagingReadinessResponse,
} from "@/lib/api/types";
import styles from "./AdminPanelSection.module.scss";

export type CommerceView =
  | "store"
  | "orders"
  | "manual-review"
  | "delivery"
  | "readiness";

type AdminCommercePanelProps = {
  view: CommerceView;
  selectedOrderId: string | null;
  onOpenOrder: (orderId: string) => void;
  onClearOrder: () => void;
};

type MutationConfig = {
  key: string;
  endpoint: string;
  targetOrderId: string;
  targetPaymentAttemptId?: string;
  targetDeliveryJobId?: string;
  title: string;
  description: string;
  confirmLabel: string;
  requireReason?: boolean;
  requireExplicitConfirmation?: boolean;
  body?: Record<string, unknown>;
};

const STATUS_LABELS: Record<string, string> = {
  awaiting_payment: "Čeká na platbu",
  payment_processing: "Platba se zpracovává",
  not_started: "Nezahájeno",
  not_ready: "Není připraveno",
  pending: "Čeká",
  checkout_created: "Checkout vytvořen",
  provider_pending: "Provider zpracovává",
  processing: "Zpracovává se",
  received: "Přijato",
  processed: "Zpracováno",
  finalized: "Finalizováno",
  noop_duplicate: "Duplicitní bez změny",
  duplicate: "Duplicita",
  invalid_signature: "Neplatný podpis",
  ignored: "Ignorováno",
  paid: "Zaplaceno",
  succeeded: "Úspěšné",
  failed: "Selhalo",
  delivery_queued: "Ve frontě doručení",
  queued: "Ve frontě",
  delivering: "Doručuje se",
  leased: "Pronajatý job",
  delivered: "Doručeno",
  payment_failed: "Platba selhala",
  delivery_failed: "Doručení selhalo",
  failed_retryable: "Lze opakovat",
  failed_terminal: "Terminální selhání",
  dead_letter: "Dead letter",
  manual_review: "Ruční kontrola",
  unmatched: "Nespárovaná událost",
  expired: "Vypršelo",
  cancelled: "Zrušeno",
  refunded: "Refundováno",
  revoked: "Odebráno",
  chargeback: "Platba vrácená bankou",
  active: "Aktivní",
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";

  return new Intl.DateTimeFormat("cs-CZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function formatPrice(amountCzk: number | null, currency: string) {
  if (!Number.isFinite(amountCzk)) return "Cena není dostupná";
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: currency || "CZK",
    maximumFractionDigits: 0,
  }).format(amountCzk as number);
}

function normalizeStatus(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function statusLabel(value?: string | null) {
  const normalized = normalizeStatus(value);
  return STATUS_LABELS[normalized] || value || "Neznámý stav";
}

function statusTone(value?: string | null) {
  const normalized = normalizeStatus(value);
  if (
    normalized.includes("succeeded") ||
    normalized === "delivered" ||
    normalized === "paid" ||
    normalized === "pass"
  ) {
    return styles.statusSuccess;
  }
  if (
    normalized.includes("failed") ||
    normalized.includes("dead") ||
    normalized === "blocker" ||
    normalized === "manual_review" ||
    normalized === "unmatched"
  ) {
    return styles.statusDanger;
  }
  if (
    normalized.includes("pending") ||
    normalized.includes("queued") ||
    normalized.includes("leased") ||
    normalized.includes("processing") ||
    normalized === "warning"
  ) {
    return styles.statusWarning;
  }
  return styles.statusNeutral;
}

function statusIcon(value?: string | null) {
  const tone = statusTone(value);
  if (tone === styles.statusSuccess) return "✓";
  if (tone === styles.statusDanger) return "!";
  if (tone === styles.statusWarning) return "…";
  return "•";
}

function isActionAllowed(value?: AdminCommerceActionAvailability) {
  return value === true || (typeof value === "object" && value.allowed);
}

function actionReason(value?: AdminCommerceActionAvailability) {
  if (typeof value === "object" && value.reason) return value.reason;
  return "Akce není v aktuálním stavu povolená.";
}

function DisabledActionHint({
  label,
  availability,
}: {
  label: string;
  availability?: AdminCommerceActionAvailability;
}) {
  if (isActionAllowed(availability)) return null;

  return (
    <p className={styles.muted}>
      <strong>{label}:</strong> {actionReason(availability)}
    </p>
  );
}

function errorText(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (error.status === 409) return `Stav se mezitím změnil: ${error.message}`;
    return error.message;
  }
  return fallback;
}

function isAbortError(error: unknown) {
  return (
    error instanceof DOMException
      ? error.name === "AbortError"
      : typeof error === "object" &&
        error !== null &&
        "name" in error &&
        error.name === "AbortError"
  );
}

function detailMatchesSelectedOrder(
  selectedOrderId: string | null,
  detail: AdminCommerceOrderDetailResponse | null,
): detail is AdminCommerceOrderDetailResponse {
  return Boolean(selectedOrderId && detail?.order.id === selectedOrderId);
}

function mutationMatchesCurrentDetail(
  config: MutationConfig,
  selectedOrderId: string | null,
  detail: AdminCommerceOrderDetailResponse | null,
) {
  if (
    !detailMatchesSelectedOrder(selectedOrderId, detail) ||
    config.targetOrderId !== selectedOrderId
  ) {
    return false;
  }

  if (config.targetPaymentAttemptId) {
    const attempt = detail.paymentAttempts.find(
      (entry) => entry.id === config.targetPaymentAttemptId,
    );
    if (!attempt || attempt.orderId !== selectedOrderId) return false;
  }

  if (config.targetDeliveryJobId) {
    const job = detail.deliveryJobs.find(
      (entry) => entry.id === config.targetDeliveryJobId,
    );
    if (!job || job.orderId !== selectedOrderId) return false;
  }

  return true;
}

function mutationResultMessage(
  response: AdminCommerceMutationResponse,
  fallbackTitle: string,
) {
  if (
    response.operation === "order_reconciled" ||
    response.operation === "payment_attempt_reconciled"
  ) {
    const result = response.result;
    return [
      `${fallbackTitle} dokončeno.`,
      `Provider eventy znovu zpracované: ${result.reprocessedCount}.`,
      `Obnovené pokusy o platbu: ${result.refreshedAttemptCount}.`,
      `Objednávky opravené: ${result.repairedOrderCount}.`,
      `Manual review: ${result.manualReviewEventCount} eventů a ${result.manualReviewOrderCount} objednávek.`,
      "Stav byl znovu načten ze serveru.",
    ].join(" ");
  }

  if (response.operation === "artifacts_repaired") {
    if (!response.result.repaired) {
      return `Fulfillment artefakty nebylo potřeba měnit${
        response.result.reason ? `: ${response.result.reason}` : "."
      } Stav byl znovu načten ze serveru.`;
    }

    return [
      "Fulfillment artefakty byly bezpečně opraveny.",
      `Entitlement vytvořen: ${response.result.entitlementCreated ? "ano" : "ne"}.`,
      `Delivery job vytvořen: ${response.result.deliveryJobCreated ? "ano" : "ne"}.`,
      "Stav byl znovu načten ze serveru.",
    ].join(" ");
  }

  if (
    response.operation === "delivery_retried" ||
    response.operation === "delivery_lease_released"
  ) {
    return `Delivery job je nyní ve stavu „${statusLabel(
      response.deliveryJob.status,
    )}“ (počet pokusů: ${response.deliveryJob.retryCount}). Stav byl znovu načten ze serveru.`;
  }

  if (response.operation === "manual_review_marked") {
    return "Objednávka byla označena k ruční kontrole. Nejde o potvrzení ani zamítnutí platby. Stav byl znovu načten ze serveru.";
  }

  return `${fallbackTitle} dokončeno. Stav byl znovu načten ze serveru.`;
}

function StatusPill({
  value,
  label,
}: {
  value?: string | null;
  label?: string;
}) {
  return (
    <span className={`${styles.statusPill} ${statusTone(value)}`}>
      <span aria-hidden="true">{statusIcon(value)}</span>
      {label || statusLabel(value)}
    </span>
  );
}

function CopyValue({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  const [copied, setCopied] = useState(false);

  if (!value) {
    return (
      <div className={styles.copyRow}>
        <span>{label}</span>
        <span className={styles.muted}>—</span>
      </div>
    );
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className={styles.copyRow}>
      <span>{label}</span>
      <code title={value}>{value}</code>
      <button
        aria-label={`Kopírovat ${label}`}
        className={styles.copyButton}
        onClick={copy}
        type="button"
      >
        {copied ? "Zkopírováno" : "Kopírovat"}
      </button>
    </div>
  );
}

function AsyncState({
  loading,
  error,
  empty,
  emptyText,
  children,
}: {
  loading: boolean;
  error: string | null;
  empty: boolean;
  emptyText: string;
  children: ReactNode;
}) {
  if (loading) {
    return (
      <div className={styles.stateCard} role="status">
        <span className={styles.spinner} aria-hidden="true" />
        Načítám provozní data…
      </div>
    );
  }
  if (error) {
    return (
      <div className={`${styles.stateCard} ${styles.stateError}`} role="alert">
        <strong>Data se nepodařilo načíst.</strong>
        <span>{error}</span>
      </div>
    );
  }
  if (empty) {
    return <div className={styles.stateCard}>{emptyText}</div>;
  }
  return children;
}

function OrderSummaryCard({
  order,
  onOpen,
}: {
  order: AdminCommerceOrderSummary;
  onOpen: (orderId: string) => void;
}) {
  return (
    <article className={styles.operationCard}>
      <div className={styles.cardHeader}>
        <div>
          <p className={styles.cardKicker}>{formatDate(order.createdAt)}</p>
          <h4>{order.package.name}</h4>
          <p className={styles.muted}>
            {order.minecraftAccount?.username || "Minecraft účet chybí"} ·{" "}
            {order.user?.email || "Uživatel nedostupný"}
          </p>
        </div>
        <strong>{formatPrice(order.price.amountCzk, order.price.currency)}</strong>
      </div>
      <div className={styles.statusGroup} aria-label="Stavy objednávky">
        <StatusPill value={order.status.order} label={`Order: ${statusLabel(order.status.order)}`} />
        <StatusPill value={order.status.payment} label={`Platba: ${statusLabel(order.status.payment)}`} />
        <StatusPill value={order.status.delivery} label={`Doručení: ${statusLabel(order.status.delivery)}`} />
      </div>
      <div className={styles.cardFooter}>
        <code title={order.id}>{order.id}</code>
        <button
          className="button button--secondary"
          onClick={() => onOpen(order.id)}
          type="button"
        >
          Otevřít detail
        </button>
      </div>
    </article>
  );
}

function ConfirmActionDialog({
  config,
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  config: MutationConfig;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: (values: {
    reason: string;
    note: string;
    confirmed: boolean;
  }) => void;
}) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const firstControlRef = useRef<HTMLInputElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const busyRef = useRef(busy);
  const onCancelRef = useRef(onCancel);
  const titleId = `admin-dialog-${config.key.replace(/[^a-z0-9-]/gi, "-")}`;

  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    (firstControlRef.current || closeButtonRef.current)?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busyRef.current) {
        onCancelRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ) || [],
      ).filter((entry) => !entry.hasAttribute("hidden"));

      if (!focusable.length) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (previousFocusRef.current?.isConnected) {
        previousFocusRef.current.focus();
      }
    };
  }, []);

  const reasonMissing = config.requireReason && !reason.trim();
  const confirmationMissing =
    config.requireExplicitConfirmation && !confirmed;

  return (
    <div className={styles.dialogBackdrop}>
      <div
        aria-describedby={`${titleId}-description`}
        aria-labelledby={titleId}
        aria-modal="true"
        className={styles.dialog}
        ref={dialogRef}
        role="dialog"
      >
        <div className={styles.dialogHeader}>
          <div>
            <p className={styles.eyebrow}>Potvrzení administrátora</p>
            <h3 id={titleId}>{config.title}</h3>
          </div>
          <button
            aria-label="Zavřít potvrzovací dialog"
            className={styles.iconButton}
            disabled={busy}
            onClick={onCancel}
            ref={closeButtonRef}
            type="button"
          >
            ×
          </button>
        </div>
        <p className={styles.muted} id={`${titleId}-description`}>
          {config.description}
        </p>
        {config.requireReason ? (
          <label className={styles.field}>
            <span>Důvod *</span>
            <input
              autoComplete="off"
              onChange={(event) => setReason(event.target.value)}
              ref={firstControlRef}
              required
              value={reason}
            />
          </label>
        ) : null}
        {config.requireReason ? (
          <label className={styles.field}>
            <span>Poznámka (volitelná)</span>
            <textarea
              onChange={(event) => setNote(event.target.value)}
              value={note}
            />
          </label>
        ) : null}
        {config.requireExplicitConfirmation ? (
          <label className={styles.checkField}>
            <input
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              type="checkbox"
            />
            <span>
              Potvrzuji, že chci uvolnit právě tento lease a vrátit job do
              fronty.
            </span>
          </label>
        ) : null}
        {error ? (
          <div className={`${styles.banner} ${styles.bannerError}`} role="alert">
            {error}
          </div>
        ) : null}
        <div className={styles.dialogActions}>
          <button
            className="button button--ghost"
            disabled={busy}
            onClick={onCancel}
            type="button"
          >
            Zrušit
          </button>
          <button
            aria-label={config.confirmLabel}
            className="button button--primary"
            disabled={busy || Boolean(reasonMissing) || Boolean(confirmationMissing)}
            onClick={() => onConfirm({ reason, note, confirmed })}
            type="button"
          >
            {busy ? "Provádím…" : config.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function diagnoseFlow(detail: AdminCommerceOrderDetailResponse) {
  if (detail.blockage?.label) return detail.blockage.label;
  const orderStatus = normalizeStatus(detail.order.status.order);
  const paymentStatus = normalizeStatus(detail.order.status.payment);
  const deliveryStatus = normalizeStatus(detail.order.status.delivery);

  if (orderStatus === "manual_review") {
    return "Flow čeká na ruční kontrolu. Reconcile nesmí potvrdit platbu bez shody s providerem.";
  }
  if (paymentStatus !== "succeeded" && paymentStatus !== "paid") {
    if (paymentStatus.includes("failed")) {
      return "Platba není potvrzená. Fulfillment se nesmí vytvořit.";
    }
    return "Objednávka čeká na potvrzení platby nebo další provider event.";
  }
  if (!detail.entitlement) {
    return "Platba je potvrzená, ale chybí entitlement. Lze použít bezpečnou opravu artefaktů.";
  }
  if (!detail.deliveryJobs.length) {
    return "Platba i entitlement existují, ale chybí grant delivery job. Lze použít bezpečnou opravu artefaktů.";
  }
  if (deliveryStatus.includes("failed")) {
    return "Doručení selhalo. U podporovaného stavu lze job znovu zařadit.";
  }
  if (deliveryStatus === "delivered") {
    return "Payment a delivery flow je dokončený.";
  }
  return "Flow pokračuje v delivery frontě.";
}

function OrderDetailView({
  detail,
  busy,
  actionContextValid,
  onClose,
  onMutation,
}: {
  detail: AdminCommerceOrderDetailResponse;
  busy: boolean;
  actionContextValid: boolean;
  onClose: () => void;
  onMutation: (config: MutationConfig) => void;
}) {
  const { order, actions } = detail;
  const reconcileOrderAllowed = isActionAllowed(actions.reconcileOrder);
  const repairAllowed = isActionAllowed(actions.repairArtifacts);
  const manualReviewAllowed = isActionAllowed(actions.markManualReview);

  return (
    <section className={styles.orderDetail} aria-labelledby="order-detail-title">
      <div className={styles.detailTitle}>
        <div>
          <p className={styles.eyebrow}>Detail objednávky</p>
          <h3 id="order-detail-title">{order.package.name}</h3>
          <p className={styles.muted}>
            Vytvořeno {formatDate(order.createdAt)} · naposledy změněno{" "}
            {formatDate(order.updatedAt)}
          </p>
        </div>
        <button
          className="button button--ghost"
          onClick={onClose}
          type="button"
        >
          Zavřít detail
        </button>
      </div>

      <div className={styles.diagnosis} role="status">
        <strong>Kde je flow:</strong> {diagnoseFlow(detail)}
      </div>

      <div className={styles.statusGroup} aria-label="Stavy objednávky">
        <StatusPill value={order.status.order} label={`Order: ${statusLabel(order.status.order)}`} />
        <StatusPill value={order.status.payment} label={`Platba: ${statusLabel(order.status.payment)}`} />
        <StatusPill value={order.status.delivery} label={`Doručení: ${statusLabel(order.status.delivery)}`} />
      </div>

      <div className={styles.actionBar} aria-label="Bezpečné administrační akce">
        <button
          className="button button--secondary"
          disabled={busy || !actionContextValid || !reconcileOrderAllowed}
          onClick={() =>
            onMutation({
              key: `reconcile-order-${order.id}`,
              endpoint: `/api/admin/commerce/orders/${encodeURIComponent(order.id)}/reconcile`,
              targetOrderId: order.id,
              title: "Reconcile objednávku",
              description:
                "Backend znovu vyhodnotí dostupná data. Akce nevynutí payment success bez provider evidence.",
              confirmLabel: "Spustit reconcile",
            })
          }
          title={
            reconcileOrderAllowed
              ? undefined
              : actionReason(actions.reconcileOrder)
          }
          type="button"
        >
          Ověřit objednávku
        </button>
        <button
          className="button button--secondary"
          disabled={busy || !actionContextValid || !repairAllowed}
          onClick={() =>
            onMutation({
              key: `repair-${order.id}`,
              endpoint: `/api/admin/commerce/orders/${encodeURIComponent(order.id)}/repair-artifacts`,
              targetOrderId: order.id,
              title: "Opravit fulfillment artefakty",
              description:
                "Oprava je povolená jen pro potvrzenou platbu a je idempotentní. Nezaplacená objednávka nesmí získat entitlement.",
              confirmLabel: "Opravit artefakty",
            })
          }
          title={repairAllowed ? undefined : actionReason(actions.repairArtifacts)}
          type="button"
        >
          Opravit artefakty
        </button>
        <button
          className="button button--secondary"
          disabled={busy || !actionContextValid || !manualReviewAllowed}
          onClick={() =>
            onMutation({
              key: `manual-review-${order.id}`,
              endpoint: `/api/admin/commerce/orders/${encodeURIComponent(order.id)}/manual-review`,
              targetOrderId: order.id,
              title: "Označit k ruční kontrole",
              description:
                "Ruční kontrola není potvrzení ani zamítnutí platby. Zadej konkrétní provozní důvod.",
              confirmLabel: "Označit ke kontrole",
              requireReason: true,
            })
          }
          title={
            manualReviewAllowed
              ? undefined
              : actionReason(actions.markManualReview)
          }
          type="button"
        >
          Označit ke kontrole
        </button>
      </div>
      <div aria-label="Důvody nedostupných akcí">
        <DisabledActionHint
          availability={actions.reconcileOrder}
          label="Ověřit objednávku"
        />
        <DisabledActionHint
          availability={actions.repairArtifacts}
          label="Opravit artefakty"
        />
        <DisabledActionHint
          availability={actions.markManualReview}
          label="Označit ke kontrole"
        />
      </div>

      <div className={styles.detailColumns}>
        <article className={styles.infoCard}>
          <h4>Kupující a doručení</h4>
          <dl className={styles.definitionList}>
            <div>
              <dt>E-mail</dt>
              <dd>{detail.user.email}</dd>
            </div>
            <div>
              <dt>Minecraft jméno</dt>
              <dd>{detail.minecraftAccount?.username || "Není propojeno"}</dd>
            </div>
            <div>
              <dt>Minecraft UUID</dt>
              <dd>{detail.minecraftAccount?.uuid || "—"}</dd>
            </div>
            <div>
              <dt>Cena</dt>
              <dd>{formatPrice(order.price.amountCzk, order.price.currency)}</dd>
            </div>
          </dl>
          <CopyValue label="Order ID" value={order.id} />
          <CopyValue label="User ID" value={detail.user.id} />
        </article>

        <article className={styles.infoCard}>
          <h4>Zakoupené položky</h4>
          <div className={styles.compactList}>
            {order.package.lineItems.map((item) => (
              <div className={styles.compactRow} key={`${item.packageId}-${item.packageName}`}>
                <span>
                  {item.quantity}× {item.packageName}
                </span>
                <span>{formatPrice(item.unitPriceCzk, order.price.currency)}</span>
              </div>
            ))}
          </div>
        </article>
      </div>

      <section className={styles.detailSection}>
        <div className={styles.sectionHeading}>
          <div>
            <h4>Pokusy o platbu</h4>
            <p className={styles.muted}>
              Provider ID slouží pouze k dohledání ve Stripe dashboardu; není
              to secret.
            </p>
          </div>
        </div>
        {!detail.paymentAttempts.length ? (
          <p className={styles.stateCard}>Pokus o platbu zatím nevznikl.</p>
        ) : (
          <div className={styles.cardGrid}>
            {detail.paymentAttempts.map((attempt) => {
              const attemptAction = actions.paymentAttempts?.find(
                (entry) => entry.paymentAttemptId === attempt.id,
              )?.reconcile;
              const reconcileAttemptAllowed = isActionAllowed(
                attemptAction ?? actions.reconcilePaymentAttempt,
              );

              return (
                <article className={styles.infoCard} key={attempt.id}>
                <div className={styles.cardHeader}>
                  <strong>{attempt.provider}</strong>
                  <StatusPill value={attempt.status} />
                </div>
                <CopyValue label="Attempt ID" value={attempt.id} />
                <CopyValue
                  label="Provider checkout ID"
                  value={attempt.providerCheckoutId}
                />
                <CopyValue
                  label="Provider payment ID"
                  value={attempt.providerPaymentId}
                />
                <p className={styles.muted}>
                  Uzavřeno: {formatDate(attempt.closedAt)}
                </p>
                <button
                  className="button button--secondary"
                  disabled={
                    busy || !actionContextValid || !reconcileAttemptAllowed
                  }
                  onClick={() =>
                    onMutation({
                      key: `reconcile-attempt-${attempt.id}`,
                      endpoint: `/api/admin/commerce/payment-attempts/${encodeURIComponent(attempt.id)}/reconcile`,
                      targetOrderId: order.id,
                      targetPaymentAttemptId: attempt.id,
                      title: "Ověřit pokus o platbu",
                      description:
                        "Provider se dotáže přes existující adapter. Kontroly částky, měny a vazeb zůstávají aktivní.",
                      confirmLabel: "Spustit ověření provideru",
                    })
                  }
                  title={
                    reconcileAttemptAllowed
                      ? undefined
                      : actionReason(
                          attemptAction ?? actions.reconcilePaymentAttempt,
                        )
                  }
                  type="button"
                >
                  Ověřit pokus o platbu
                </button>
              </article>
              );
            })}
          </div>
        )}
      </section>

      <section className={styles.detailSection}>
        <h4>Bezpečné provider eventy</h4>
        {!detail.paymentEvents.length ? (
          <p className={styles.stateCard}>Žádné provider eventy.</p>
        ) : (
          <div className={styles.compactList}>
            {detail.paymentEvents.map((event) => (
              <article className={styles.eventRow} key={event.id}>
                <div>
                  <strong>{event.normalizedEventType}</strong>
                  <p className={styles.muted}>
                    {formatDate(event.occurredAt || event.receivedAt)}
                  </p>
                </div>
                <StatusPill value={event.processingStatus} />
                <CopyValue
                  label="Provider event ID"
                  value={event.providerEventId}
                />
                {event.review?.reasonCode ? (
                  <p>
                    Review: {event.review.reasonCode}
                    {event.review.note ? ` · ${event.review.note}` : ""}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        )}
        <p className={styles.safetyNote}>
          Raw webhook JSON, podpisy a authorization hlavičky se do browserového
          DTO neposílají.
        </p>
      </section>

      <section className={styles.detailSection}>
        <h4>Entitlement a delivery</h4>
        <div className={styles.detailColumns}>
          <article className={styles.infoCard}>
            <strong>Entitlement</strong>
            {detail.entitlement ? (
              <>
                <StatusPill value={detail.entitlement.status} />
                <CopyValue
                  label="Entitlement ID"
                  value={detail.entitlement.id}
                />
                <p className={styles.muted}>
                  {formatDate(detail.entitlement.createdAt)}
                </p>
              </>
            ) : (
              <p className={styles.muted}>Nevznikl.</p>
            )}
          </article>
          <article className={styles.infoCard}>
            <strong>Doručovací pokusy</strong>
            <p>{detail.deliveryAttempts.length}</p>
            <p className={styles.muted}>
              Kompletní grant payload určený pluginu se zde nezobrazuje.
            </p>
          </article>
        </div>
        {!detail.deliveryJobs.length ? (
          <p className={styles.stateCard}>Delivery job zatím nevznikl.</p>
        ) : (
          <div className={styles.cardGrid}>
            {detail.deliveryJobs.map((job) => {
              const jobActions = actions.deliveryJobs?.find(
                (entry) => entry.jobId === job.id,
              );
              const retryAllowed = isActionAllowed(jobActions?.retry);
              const releaseAllowed = isActionAllowed(jobActions?.releaseLease);

              return (
                <article className={styles.infoCard} key={job.id}>
                  <div className={styles.cardHeader}>
                    <strong>Delivery job</strong>
                    <StatusPill value={job.status} />
                  </div>
                  <CopyValue label="Job ID" value={job.id} />
                  <dl className={styles.definitionList}>
                    <div>
                      <dt>Pokusů</dt>
                      <dd>{job.retryCount}</dd>
                    </div>
                    <div>
                      <dt>Lease vyprší</dt>
                      <dd>{formatDate(job.leaseExpiresAt)}</dd>
                    </div>
                    <div>
                      <dt>Poslední chyba</dt>
                      <dd>{job.lastErrorCode || "—"}</dd>
                    </div>
                  </dl>
                  <div className={styles.actions}>
                    <button
                      className="button button--secondary"
                      disabled={busy || !actionContextValid || !retryAllowed}
                      onClick={() =>
                        onMutation({
                          key: `retry-job-${job.id}`,
                          endpoint: `/api/admin/commerce/delivery-jobs/${encodeURIComponent(job.id)}/retry`,
                          targetOrderId: order.id,
                          targetDeliveryJobId: job.id,
                          title: "Znovu zařadit delivery job",
                          description:
                            "Akce je povolená jen pro podporovaný failed, retry nebo dead-letter stav. Úspěšný job nelze spustit znovu.",
                          confirmLabel: "Zařadit znovu",
                          requireReason: true,
                        })
                      }
                      title={
                        retryAllowed
                          ? undefined
                          : actionReason(jobActions?.retry)
                      }
                      type="button"
                    >
                      Znovu zařadit doručení
                    </button>
                    <button
                      className="button button--secondary"
                      disabled={busy || !actionContextValid || !releaseAllowed}
                      onClick={() =>
                        onMutation({
                          key: `release-job-${job.id}`,
                          endpoint: `/api/admin/commerce/delivery-jobs/${encodeURIComponent(job.id)}/release`,
                          targetOrderId: order.id,
                          targetDeliveryJobId: job.id,
                          title: "Uvolnit stale lease",
                          description:
                            "Backend před změnou atomicky znovu ověří, že je job stále leased a jeho lease už vypršel. Akce zachová auditní stopu.",
                          confirmLabel: "Uvolnit lease",
                          requireReason: true,
                          requireExplicitConfirmation: true,
                          body: { confirmed: true },
                        })
                      }
                      title={
                        releaseAllowed
                          ? undefined
                          : actionReason(jobActions?.releaseLease)
                      }
                      type="button"
                    >
                      Uvolnit prošlý lease
                    </button>
                  </div>
                  <div aria-label="Důvody nedostupných delivery akcí">
                    <DisabledActionHint
                      availability={jobActions?.retry}
                      label="Znovu zařadit doručení"
                    />
                    <DisabledActionHint
                      availability={jobActions?.releaseLease}
                      label="Uvolnit prošlý lease"
                    />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className={styles.detailSection}>
        <h4>Společná časová osa</h4>
        {!detail.timeline.length ? (
          <p className={styles.stateCard}>Časová osa zatím nemá záznamy.</p>
        ) : (
          <ol className={styles.timeline}>
            {detail.timeline.map((entry) => (
              <li key={entry.id}>
                <div className={styles.timelineMarker} aria-hidden="true" />
                <div className={styles.timelineContent}>
                  <div className={styles.timelineHeader}>
                    <time dateTime={entry.at}>
                      {formatDate(entry.at)}
                    </time>
                    <span className={styles.sourceBadge}>{entry.source}</span>
                  </div>
                  <strong>{entry.type}</strong>
                  <p>{entry.description}</p>
                  {entry.providerEventId ? (
                    <CopyValue
                      label="Provider event ID"
                      value={entry.providerEventId}
                    />
                  ) : null}
                  {entry.correlationId ? (
                    <CopyValue
                      label="Correlation ID"
                      value={entry.correlationId}
                    />
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className={styles.safetyNote}>
        <strong>Refund/revoke:</strong> Stripe refund/revoke workflow zatím není
        implementovaný. Tento panel proto nenabízí lokální „fake refund“ ani
        ruční Force paid.
      </div>
    </section>
  );
}

export const AdminCommercePanel = ({
  view,
  selectedOrderId,
  onOpenOrder,
  onClearOrder,
}: AdminCommercePanelProps) => {
  const [overview, setOverview] =
    useState<AdminCommerceOverviewResponse | null>(null);
  const [orders, setOrders] = useState<AdminCommerceOrdersResponse | null>(
    null,
  );
  const [manualReview, setManualReview] =
    useState<AdminCommerceManualReviewResponse | null>(null);
  const [deliveryJobs, setDeliveryJobs] =
    useState<AdminCommerceDeliveryJobsResponse | null>(null);
  const [readiness, setReadiness] =
    useState<AdminStagingReadinessResponse | null>(null);
  const [detail, setDetail] =
    useState<AdminCommerceOrderDetailResponse | null>(null);
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [deliveryStatus, setDeliveryStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [mutation, setMutation] = useState<MutationConfig | null>(null);
  const [mutationBusy, setMutationBusy] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const selectedOrderIdRef = useRef<string | null>(selectedOrderId);
  const detailRef = useRef<AdminCommerceOrderDetailResponse | null>(detail);
  const detailRequestGenerationRef = useRef(0);
  const detailAbortControllerRef = useRef<AbortController | null>(null);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOverview(
        await apiRequest<AdminCommerceOverviewResponse>(
          "/api/admin/commerce/overview",
        ),
      );
    } catch (nextError) {
      setError(errorText(nextError, "Store overview se nepodařilo načíst."));
    } finally {
      setLoading(false);
    }
  }, []);

  const searchOrders = useCallback(async (search: string, offset = 0) => {
    const normalized = search.trim();
    if (!normalized) {
      setOrders(null);
      setSubmittedQuery("");
      setError("Zadej order ID, e-mail, Minecraft jméno nebo provider ID.");
      return;
    }

    setLoading(true);
    setError(null);
    setSubmittedQuery(normalized);
    try {
      const payload = await apiRequest<AdminCommerceOrdersResponse>(
        `/api/admin/commerce/orders?q=${encodeURIComponent(normalized)}&limit=20&offset=${offset}`,
      );
      setOrders(payload);
    } catch (nextError) {
      setOrders(null);
      setError(errorText(nextError, "Objednávky se nepodařilo vyhledat."));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadManualReview = useCallback(async (offset = 0) => {
    setLoading(true);
    setError(null);
    try {
      setManualReview(
        await apiRequest<AdminCommerceManualReviewResponse>(
          `/api/admin/commerce/manual-review?limit=20&offset=${offset}`,
        ),
      );
    } catch (nextError) {
      setError(errorText(nextError, "Manual review se nepodařilo načíst."));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDeliveryJobs = useCallback(async (status: string, offset = 0) => {
    setLoading(true);
    setError(null);
    const statusQuery = status
      ? `&status=${encodeURIComponent(status)}`
      : "";
    try {
      setDeliveryJobs(
        await apiRequest<AdminCommerceDeliveryJobsResponse>(
          `/api/admin/commerce/delivery-jobs?limit=20&offset=${offset}${statusQuery}`,
        ),
      );
    } catch (nextError) {
      setError(errorText(nextError, "Delivery frontu se nepodařilo načíst."));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadReadiness = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReadiness(
        await apiRequest<AdminStagingReadinessResponse>(
          "/api/admin/commerce/staging-readiness",
        ),
      );
    } catch (nextError) {
      setError(
        errorText(nextError, "Staging readiness se nepodařilo načíst."),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const invalidateDetailRequest = useCallback(() => {
    detailRequestGenerationRef.current += 1;
    detailAbortControllerRef.current?.abort();
    detailAbortControllerRef.current = null;
  }, []);

  const loadDetail = useCallback(async (requestedOrderId: string) => {
    if (selectedOrderIdRef.current !== requestedOrderId) return;

    detailAbortControllerRef.current?.abort();
    const requestGeneration = detailRequestGenerationRef.current + 1;
    detailRequestGenerationRef.current = requestGeneration;
    const abortController = new AbortController();
    detailAbortControllerRef.current = abortController;
    setDetailLoading(true);
    setDetailError(null);
    let shouldFinishLoading = false;
    try {
      const payload = await apiRequest<AdminCommerceOrderDetailResponse>(
        `/api/admin/commerce/orders/${encodeURIComponent(requestedOrderId)}`,
        { signal: abortController.signal },
      );
      const returnedOrderId = payload.order.id;
      if (
        requestGeneration !== detailRequestGenerationRef.current ||
        selectedOrderIdRef.current !== requestedOrderId
      ) {
        return;
      }
      if (returnedOrderId !== requestedOrderId) {
        shouldFinishLoading = true;
        detailRef.current = null;
        setDetail(null);
        setDetailError(
          "Backend vrátil detail jiné objednávky. Z bezpečnostních důvodů nebyla data zobrazena.",
        );
        return;
      }

      shouldFinishLoading = true;
      detailRef.current = payload;
      setDetail(payload);
      setDetailError(null);
    } catch (nextError) {
      if (
        abortController.signal.aborted ||
        isAbortError(nextError) ||
        requestGeneration !== detailRequestGenerationRef.current ||
        selectedOrderIdRef.current !== requestedOrderId
      ) {
        return;
      }

      shouldFinishLoading = true;
      detailRef.current = null;
      setDetail(null);
      setDetailError(
        errorText(nextError, "Detail objednávky se nepodařilo načíst."),
      );
    } finally {
      if (
        shouldFinishLoading &&
        requestGeneration === detailRequestGenerationRef.current &&
        selectedOrderIdRef.current === requestedOrderId
      ) {
        setDetailLoading(false);
      }
      if (detailAbortControllerRef.current === abortController) {
        detailAbortControllerRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (view === "store") void loadOverview();
      if (view === "manual-review") void loadManualReview(0);
      if (view === "delivery") void loadDeliveryJobs(deliveryStatus);
      if (view === "readiness") void loadReadiness();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [
    deliveryStatus,
    loadDeliveryJobs,
    loadManualReview,
    loadOverview,
    loadReadiness,
    view,
  ]);

  useLayoutEffect(() => {
    selectedOrderIdRef.current = selectedOrderId;
    invalidateDetailRequest();
    detailRef.current = null;
    const timeout = window.setTimeout(() => {
      if (selectedOrderIdRef.current !== selectedOrderId) return;
      setDetail(null);
      setDetailError(null);
      setMutation(null);
      setMutationError(null);
      setMessage(null);
      if (selectedOrderId) {
        setDetailLoading(true);
        void loadDetail(selectedOrderId);
      } else {
        setDetailLoading(false);
      }
    }, 0);
    return () => {
      window.clearTimeout(timeout);
      invalidateDetailRequest();
    };
  }, [invalidateDetailRequest, loadDetail, selectedOrderId]);

  useEffect(() => {
    if (view !== "orders") return;
    const params = new URLSearchParams(window.location.search);
    const urlQuery = params.get("q") || "";
    if (urlQuery) {
      const timeout = window.setTimeout(() => {
        setQuery(urlQuery);
        void searchOrders(urlQuery, 0);
      }, 0);
      return () => window.clearTimeout(timeout);
    }
  }, [searchOrders, view]);

  const openOrderDetail = useCallback(
    (orderId: string) => {
      selectedOrderIdRef.current = orderId;
      invalidateDetailRequest();
      detailRef.current = null;
      setDetail(null);
      setDetailError(null);
      setDetailLoading(true);
      setMutation(null);
      setMutationError(null);
      setMessage(null);
      onOpenOrder(orderId);
    },
    [invalidateDetailRequest, onOpenOrder],
  );

  const closeOrderDetail = useCallback(() => {
    selectedOrderIdRef.current = null;
    invalidateDetailRequest();
    detailRef.current = null;
    setDetail(null);
    setDetailError(null);
    setDetailLoading(false);
    setMutation(null);
    setMutationError(null);
    setMessage(null);
    onClearOrder();
  }, [invalidateDetailRequest, onClearOrder]);

  const refreshCurrent = useCallback(async (targetOrderId: string) => {
    const tasks: Promise<unknown>[] = [];
    if (view === "store") tasks.push(loadOverview());
    if (view === "manual-review")
      tasks.push(loadManualReview(manualReview?.pagination.offset || 0));
    if (view === "delivery")
      tasks.push(
        loadDeliveryJobs(
          deliveryStatus,
          deliveryJobs?.pagination.offset || 0,
        ),
      );
    if (view === "orders" && submittedQuery)
      tasks.push(
        searchOrders(submittedQuery, orders?.pagination.offset || 0),
      );
    if (selectedOrderIdRef.current === targetOrderId) {
      tasks.push(loadDetail(targetOrderId));
    }
    await Promise.all(tasks);
  }, [
    deliveryJobs?.pagination.offset,
    deliveryStatus,
    loadDeliveryJobs,
    loadDetail,
    loadManualReview,
    loadOverview,
    manualReview?.pagination.offset,
    orders?.pagination.offset,
    searchOrders,
    submittedQuery,
    view,
  ]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const normalized = query.trim();
    const url = new URL(window.location.href);
    if (normalized) url.searchParams.set("q", normalized);
    else url.searchParams.delete("q");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    void searchOrders(normalized, 0);
  };

  const runMutation = async ({
    reason,
    note,
    confirmed,
  }: {
    reason: string;
    note: string;
    confirmed: boolean;
  }) => {
    if (!mutation || mutationBusy) return;
    const mutationToRun = mutation;
    if (
      !mutationMatchesCurrentDetail(
        mutationToRun,
        selectedOrderIdRef.current,
        detailRef.current,
      )
    ) {
      setMutation(null);
      setMutationError(null);
      setMessage(
        "Akce byla zrušena, protože zobrazený detail už neodpovídá vybrané objednávce.",
      );
      return;
    }

    setMutationBusy(true);
    setMutationError(null);
    setMessage(null);

    try {
      const body = {
        ...(mutationToRun.body || {}),
        ...(mutationToRun.requireReason
          ? { reason: reason.trim(), note: note.trim() || undefined }
          : {}),
        ...(mutationToRun.requireExplicitConfirmation ? { confirmed } : {}),
      };
      const response = await apiRequest<AdminCommerceMutationResponse>(
        mutationToRun.endpoint,
        {
          method: "POST",
          body,
        },
      );
      setMutation(null);
      if (selectedOrderIdRef.current === mutationToRun.targetOrderId) {
        setMessage(mutationResultMessage(response, mutationToRun.title));
        await refreshCurrent(mutationToRun.targetOrderId);
      }
    } catch (nextError) {
      if (selectedOrderIdRef.current === mutationToRun.targetOrderId) {
        setMutationError(
          errorText(nextError, "Administrační akci se nepodařilo dokončit."),
        );
      }
    } finally {
      setMutationBusy(false);
    }
  };

  const openMutation = (config: MutationConfig) => {
    if (mutationBusy) return;
    if (
      !mutationMatchesCurrentDetail(
        config,
        selectedOrderIdRef.current,
        detailRef.current,
      )
    ) {
      setMutation(null);
      setMutationError(null);
      setMessage(
        "Akce není dostupná, protože detail neodpovídá aktuálně vybrané objednávce.",
      );
      return;
    }
    setMutationError(null);
    setMutation(config);
  };

  const heading = useMemo(() => {
    if (view === "store")
      return {
        eyebrow: "Store provoz",
        title: "Platební a doručovací provoz",
        description:
          "Provozní dashboard pro řešení zaseknutých objednávek, nikoli marketingová analytika.",
      };
    if (view === "orders")
      return {
        eyebrow: "Objednávky",
        title: "Serverové vyhledávání objednávek",
        description:
          "Hledej přes celý order ID, e-mail, Minecraft jméno nebo provider ID.",
      };
    if (view === "manual-review")
      return {
        eyebrow: "Manual review",
        title: "Případy vyžadující zásah",
        description:
          "Nespárované provider eventy, karanténa mismatchů a problematické delivery joby.",
      };
    if (view === "delivery")
      return {
        eyebrow: "Delivery fronta",
        title: "Doručovací joby",
        description:
          "Stavy, retry počty a lease informace bez přístupu ke grant payloadu.",
      };
    return {
      eyebrow: "Staging readiness",
      title: "Read-only launch preflight",
      description:
        "Diagnostika konfigurace a runtime připravenosti bez výpisu secretů a bez změn systému.",
    };
  }, [view]);

  return (
    <div className={styles.contentStack}>
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>{heading.eyebrow}</p>
          <h3>{heading.title}</h3>
        </div>
        <p className={styles.muted}>{heading.description}</p>
      </div>

      {message ? (
        <div className={styles.banner} role="status">
          {message}
        </div>
      ) : null}

      {view === "store" ? (
        <AsyncState
          empty={!overview}
          emptyText="Store provoz zatím nemá data."
          error={error}
          loading={loading}
        >
          {overview ? (
            <>
              <div className={styles.metricGrid}>
                {[
                  ["Čeká na platbu", overview.counts.awaitingPayment, "awaiting_payment"],
                  ["Payment processing", overview.counts.paymentProcessing, "processing"],
                  ["Paid / delivery queued", overview.counts.paidOrDeliveryQueued, "delivery_queued"],
                  ["Doručuje se", overview.counts.delivering, "delivering"],
                  ["Doručeno", overview.counts.delivered, "delivered"],
                  ["Platba selhala", overview.counts.paymentFailed, "payment_failed"],
                  ["Doručení selhalo", overview.counts.deliveryFailed, "delivery_failed"],
                  ["Manual review", overview.counts.manualReview, "manual_review"],
                  ["Unmatched eventy", overview.counts.unmatchedPaymentEvents, "unmatched"],
                  ["Dead-letter joby", overview.counts.deadLetterDeliveryJobs, "dead_letter"],
                  ["Stale leases", overview.counts.staleLeasedJobs, "leased"],
                ].map(([label, count, status]) => (
                  <article className={styles.metricCard} key={String(label)}>
                    <StatusPill value={String(status)} label={String(label)} />
                    <strong>{Number(count)}</strong>
                  </article>
                ))}
              </div>

              <section className={styles.detailSection}>
                <h4>Provozní upozornění</h4>
                {!overview.alerts.length ? (
                  <div className={styles.stateCard}>
                    ✓ Žádný známý provozní blocker.
                  </div>
                ) : (
                  <div className={styles.alertList}>
                    {overview.alerts.map((alert) => (
                      <article
                        className={`${styles.operationAlert} ${
                          alert.severity === "blocker"
                            ? styles.operationAlertDanger
                            : ""
                        }`}
                        key={alert.code}
                      >
                        <span aria-hidden="true">
                          {alert.severity === "blocker" ? "!" : "⚠"}
                        </span>
                        <div>
                          <strong>
                            {alert.label} ({alert.count})
                          </strong>
                          <p className={styles.muted}>{alert.code}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section className={styles.detailSection}>
                <h4>Poslední objednávky</h4>
                {!overview.recentOrders.length ? (
                  <p className={styles.stateCard}>Žádné objednávky.</p>
                ) : (
                  <div className={styles.cardGrid}>
                    {overview.recentOrders.map((order) => (
                      <OrderSummaryCard
                        key={order.id}
                        onOpen={openOrderDetail}
                        order={order}
                      />
                    ))}
                  </div>
                )}
              </section>
            </>
          ) : null}
        </AsyncState>
      ) : null}

      {view === "orders" ? (
        <>
          <form className={styles.searchForm} onSubmit={submitSearch}>
            <label className={styles.field}>
              <span>Order ID, e-mail, Minecraft jméno nebo provider ID</span>
              <input
                onChange={(event) => setQuery(event.target.value)}
                placeholder="např. ord_…, hrac@…, Steve nebo cs_…"
                type="search"
                value={query}
              />
            </label>
            <button
              className="button button--primary"
              disabled={loading || !query.trim()}
              type="submit"
            >
              {loading ? "Hledám…" : "Hledat objednávku"}
            </button>
          </form>
          {!orders && !loading && !error ? (
            <div className={styles.stateCard}>
              Zadej konkrétní dotaz. Prázdné neomezené stažení commerce datasetu
              není povolené.
            </div>
          ) : null}
          <AsyncState
            empty={Boolean(orders && !orders.orders.length)}
            emptyText="Žádná objednávka neodpovídá dotazu."
            error={error}
            loading={loading}
          >
            {orders?.orders.length ? (
              <>
                <div className={styles.resultMeta} role="status">
                  Nalezeno {orders.pagination.total} výsledků · zobrazeno{" "}
                  {orders.pagination.offset + 1}–
                  {orders.pagination.offset + orders.orders.length}
                </div>
                <div className={styles.cardGrid}>
                  {orders.orders.map((order) => (
                    <OrderSummaryCard
                      key={order.id}
                      onOpen={openOrderDetail}
                      order={order}
                    />
                  ))}
                </div>
                <div className={styles.pagination}>
                  <button
                    className="button button--ghost"
                    disabled={loading || orders.pagination.offset === 0}
                    onClick={() =>
                      void searchOrders(
                        submittedQuery,
                        Math.max(
                          0,
                          orders.pagination.offset - orders.pagination.limit,
                        ),
                      )
                    }
                    type="button"
                  >
                    Předchozí
                  </button>
                  <button
                    className="button button--ghost"
                    disabled={loading || !orders.pagination.hasMore}
                    onClick={() =>
                      void searchOrders(
                        submittedQuery,
                        orders.pagination.offset + orders.pagination.limit,
                      )
                    }
                    type="button"
                  >
                    Další
                  </button>
                </div>
              </>
            ) : null}
          </AsyncState>
        </>
      ) : null}

      {view === "manual-review" ? (
        <AsyncState
          empty={
            Boolean(
              manualReview &&
                !manualReview.orders.length &&
                !manualReview.paymentEvents.length &&
                !manualReview.deliveryJobs.length &&
                !manualReview.staleLeasedJobs.length,
            )
          }
          emptyText="Manual review fronta je prázdná."
          error={error}
          loading={loading}
        >
          {manualReview ? (
            <div className={styles.contentStack}>
              <section className={styles.detailSection}>
                <h4>
                  Objednávky ({manualReview.pagination.totals.orders})
                </h4>
                <div className={styles.cardGrid}>
                  {manualReview.orders.map((order) => (
                    <OrderSummaryCard
                      key={order.id}
                      onOpen={openOrderDetail}
                      order={order}
                    />
                  ))}
                </div>
              </section>
              <section className={styles.detailSection}>
                <h4>
                  Provider eventy (
                  {manualReview.pagination.totals.paymentEvents})
                </h4>
                {!manualReview.paymentEvents.length ? (
                  <p className={styles.stateCard}>Žádné problematické eventy.</p>
                ) : (
                  <div className={styles.compactList}>
                    {manualReview.paymentEvents.map((event) => (
                      <article className={styles.eventRow} key={event.id}>
                        <strong>{event.normalizedEventType}</strong>
                        <StatusPill value={event.processingStatus} />
                        <p className={styles.muted}>
                        {event.review?.reasonCode || "Bez reason code"} ·{" "}
                          {formatDate(event.occurredAt || event.receivedAt)}
                        </p>
                        <CopyValue
                          label="Provider event ID"
                          value={event.providerEventId}
                        />
                      </article>
                    ))}
                  </div>
                )}
              </section>
              <section className={styles.detailSection}>
                <h4>
                  Delivery problémy (
                  {manualReview.pagination.totals.deliveryJobs +
                    manualReview.pagination.totals.staleLeasedJobs}
                  )
                </h4>
                <div className={styles.cardGrid}>
                  {Array.from(
                    new Map(
                      [
                        ...manualReview.deliveryJobs,
                        ...manualReview.staleLeasedJobs,
                      ].map((job) => [job.id, job]),
                    ).values(),
                  ).map((job) => (
                    <DeliveryJobCard
                      job={job}
                      key={job.id}
                      onOpenOrder={openOrderDetail}
                    />
                  ))}
                </div>
              </section>
              <div className={styles.pagination}>
                <button
                  className="button button--ghost"
                  disabled={loading || manualReview.pagination.offset === 0}
                  onClick={() =>
                    void loadManualReview(
                      Math.max(
                        0,
                        manualReview.pagination.offset -
                          manualReview.pagination.limit,
                      ),
                    )
                  }
                  type="button"
                >
                  Předchozí
                </button>
                <button
                  className="button button--ghost"
                  disabled={loading || !manualReview.pagination.hasMore}
                  onClick={() =>
                    void loadManualReview(
                      manualReview.pagination.offset +
                        manualReview.pagination.limit,
                    )
                  }
                  type="button"
                >
                  Další
                </button>
              </div>
            </div>
          ) : null}
        </AsyncState>
      ) : null}

      {view === "delivery" ? (
        <>
          <label className={styles.filterField}>
            <span>Filtrovat stav</span>
            <select
              onChange={(event) => setDeliveryStatus(event.target.value)}
              value={deliveryStatus}
            >
              <option value="">Všechny stavy (limit 20)</option>
              <option value="pending">Čeká</option>
              <option value="leased">Leased</option>
              <option value="failed_retryable">Retryable failure</option>
              <option value="failed_terminal">Terminal failure</option>
              <option value="dead_letter">Dead letter</option>
              <option value="succeeded">Úspěšné</option>
            </select>
          </label>
          <AsyncState
            empty={Boolean(deliveryJobs && !deliveryJobs.deliveryJobs.length)}
            emptyText="Ve zvoleném stavu nejsou delivery joby."
            error={error}
            loading={loading}
          >
            {deliveryJobs?.deliveryJobs.length ? (
              <>
                <div className={styles.cardGrid}>
                  {deliveryJobs.deliveryJobs.map(({ job }) => (
                    <DeliveryJobCard
                      job={job}
                      key={job.id}
                      onOpenOrder={openOrderDetail}
                    />
                  ))}
                </div>
                <div className={styles.pagination}>
                  <button
                    className="button button--ghost"
                    disabled={
                      loading || deliveryJobs.pagination.offset === 0
                    }
                    onClick={() =>
                      void loadDeliveryJobs(
                        deliveryStatus,
                        Math.max(
                          0,
                          deliveryJobs.pagination.offset -
                            deliveryJobs.pagination.limit,
                        ),
                      )
                    }
                    type="button"
                  >
                    Předchozí
                  </button>
                  <button
                    className="button button--ghost"
                    disabled={loading || !deliveryJobs.pagination.hasMore}
                    onClick={() =>
                      void loadDeliveryJobs(
                        deliveryStatus,
                        deliveryJobs.pagination.offset +
                          deliveryJobs.pagination.limit,
                      )
                    }
                    type="button"
                  >
                    Další
                  </button>
                </div>
              </>
            ) : null}
          </AsyncState>
        </>
      ) : null}

      {view === "readiness" ? (
        <AsyncState
          empty={!readiness}
          emptyText="Preflight nevrátil žádné kontroly."
          error={error}
          loading={loading}
        >
          {readiness ? (
            <>
              <div className={styles.readinessSummary}>
                <StatusPill
                  label={`Celkový stav: ${readiness.status}`}
                  value={readiness.status}
                />
                <div className={styles.readinessCounts}>
                  <span>✓ PASS {readiness.counts.pass}</span>
                  <span>⚠ WARNING {readiness.counts.warning}</span>
                  <span>! BLOCKER {readiness.counts.blocker}</span>
                </div>
                <p className={styles.muted}>
                  Vygenerováno {formatDate(readiness.generatedAt)}
                </p>
              </div>
              <div className={styles.checkList}>
                {readiness.checks.map((check) => (
                  <article className={styles.checkCard} key={check.id}>
                    <StatusPill value={check.status} />
                    <div>
                      <strong>{check.label}</strong>
                      <p>{check.message}</p>
                    </div>
                  </article>
                ))}
              </div>
              <div className={styles.safetyNote}>
                Preflight je pouze diagnostický: nespouští migrace, Stripe
                platbu, refund, změnu databáze ani delivery claim. Nenahrazuje
                skutečný Stripe staging smoke test.
              </div>
            </>
          ) : null}
        </AsyncState>
      ) : null}

      {selectedOrderId ? (
        detailLoading ? (
          <div className={styles.stateCard} role="status">
            Načítám detail objednávky…
          </div>
        ) : detailError ? (
          <div className={`${styles.stateCard} ${styles.stateError}`} role="alert">
            {detailError}
          </div>
        ) : detail && detail.order.id === selectedOrderId ? (
          <OrderDetailView
            actionContextValid={detailMatchesSelectedOrder(
              selectedOrderId,
              detail,
            )}
            busy={mutationBusy}
            detail={detail}
            onClose={closeOrderDetail}
            onMutation={openMutation}
          />
        ) : null
      ) : null}

      {mutation &&
      mutationMatchesCurrentDetail(mutation, selectedOrderId, detail) ? (
        <ConfirmActionDialog
          busy={mutationBusy}
          config={mutation}
          error={mutationError}
          onCancel={() => {
            if (!mutationBusy) {
              setMutation(null);
              setMutationError(null);
            }
          }}
          onConfirm={(values) => void runMutation(values)}
        />
      ) : null}
    </div>
  );
};

function DeliveryJobCard({
  job,
  onOpenOrder,
}: {
  job: AdminDeliveryJobSummary;
  onOpenOrder: (orderId: string) => void;
}) {
  return (
    <article className={styles.operationCard}>
      <div className={styles.cardHeader}>
        <div>
          <p className={styles.cardKicker}>Delivery job</p>
          <strong>{job.id}</strong>
        </div>
        <StatusPill value={job.status} />
      </div>
      <dl className={styles.definitionList}>
        <div>
          <dt>Pokusů</dt>
          <dd>{job.retryCount}</dd>
        </div>
        <div>
          <dt>Lease vyprší</dt>
          <dd>{formatDate(job.leaseExpiresAt)}</dd>
        </div>
        <div>
          <dt>Poslední chyba</dt>
          <dd>{job.lastErrorCode || "—"}</dd>
        </div>
      </dl>
      <CopyValue label="Order ID" value={job.orderId} />
      <button
        className="button button--secondary"
        onClick={() => onOpenOrder(job.orderId)}
        type="button"
      >
        Otevřít objednávku
      </button>
    </article>
  );
}
