export type ApiErrorPayload = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type AccountReadiness = {
  storeReady: boolean;
  blockedReasons: string[];
  requirements?: {
    requiresMinecraftLink?: boolean;
    requiresDiscordLink?: boolean;
  };
};

export type MinecraftStatus = {
  isLinked: boolean;
  username: string | null;
  uuid: string | null;
  linkedAt: string | null;
};

export type DiscordStatus = {
  isLinked: boolean;
  userId: string | null;
  username: string | null;
  displayName: string | null;
  linkedAt: string | null;
  status: string | null;
};

export type AccountUser = {
  id: string;
  email: string;
  minecraftName: string;
  discordName: string;
  createdAt?: string;
};

export type AccountOrder = {
  id: string;
  status: string;
  orderStatus: string;
  paymentStatus: string;
  deliveryStatus: string;
  packageId: string;
  packageName: string;
  totalPriceCzk: number;
  createdAt: string;
  minecraftUsername: string | null;
  lineItems: Array<{
    packageId: string;
    packageName: string;
    quantity: number;
    unitPriceCzk: number;
  }>;
  checkout: {
    canContinue: boolean;
    checkoutUrl: string | null;
    expiresAt: string | null;
  } | null;
};

export type AccountDashboard = {
  profile: AccountUser;
  minecraft: MinecraftStatus;
  discord: DiscordStatus;
  readiness: AccountReadiness;
  stats: {
    ordersCount: number;
  };
  store: {
    ready: boolean;
    blockedReasons: string[];
    requirements?: AccountReadiness["requirements"];
    latestOrder: AccountOrder | null;
  };
  activeLinkCode: {
    code: string;
    expiresAt: string;
  } | null;
  recentOrders: AccountOrder[];
};

export type AuthResponse = {
  user: AccountUser;
};

export type LinkCodeResponse = {
  code: string;
  expiresAt: string;
  instructions: string;
};

export type StorePackage = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  priceCzk: number;
  currency: string;
  category: string;
  accent: string;
  isFeatured: boolean;
  benefits: string[];
  tags: string[];
  isSellable?: boolean;
  checkoutReady?: boolean;
};

export type StorePackagesResponse = {
  packages: StorePackage[];
};

export type StoreOrdersResponse = {
  orders: AccountOrder[];
};

export type StoreOrderDetailResponse = {
  order: AccountOrder;
};

export type StoreOrderCreateResponse = {
  order: AccountOrder;
};

export type CheckoutResponse = {
  checkout: {
    checkoutUrl: string;
    expiresAt?: string | null;
    provider?: string;
    status?: string;
  };
  order: AccountOrder;
};

export type AdminUser = AccountUser & {
  roles: string[];
  isAdmin: boolean;
  discordUserId?: string | null;
  discordUsername?: string | null;
  discordDisplayName?: string | null;
  discordLinkedAt?: string | null;
  discordLinkStatus?: string | null;
  updatedAt?: string | null;
};

export type AdminMinecraftAccount = {
  id: string;
  userId: string;
  uuid: string;
  username: string;
  linkedAt: string;
  lastSeenAt: string;
} | null;

export type AdminPlayerSummary = {
  user: AdminUser;
  minecraft: AdminMinecraftAccount;
  ordersCount: number;
  lastOrder: AccountOrder | null;
};

export type AdminOverviewResponse = {
  stats: {
    players: number;
    orders: number;
    queuedDeliveries: number;
    adminUsers: number;
    packages: number;
  };
  recentOrders: AccountOrder[];
  packages: StorePackage[];
};

export type AdminPlayersResponse = {
  players: AdminPlayerSummary[];
};

export type AdminOrderDetail = {
  order: AccountOrder;
  paymentAttempts: unknown[];
  paymentEvents: unknown[];
  entitlement: unknown | null;
  deliveryJobs: unknown[];
  rewardDelivery: unknown | null;
};

export type AdminPlayerDetailResponse = {
  player: {
    user: AdminUser;
    minecraft: AdminMinecraftAccount;
    deliveries: unknown[];
    orders: AdminOrderDetail[];
  };
  packages: StorePackage[];
};

export type AdminRolesResponse = {
  user: AdminUser;
};

export type AdminGrantResponse = {
  grant: {
    order: AccountOrder;
    deliveryJob?: unknown;
    entitlement?: unknown;
  };
};

export type AdminCommerceOrderSummary = {
  id: string;
  userId: string;
  minecraftAccountId: string | null;
  user: {
    id: string;
    email: string;
  } | null;
  minecraftAccount: {
    id: string | null;
    username: string | null;
    uuid: string | null;
    linkedAt?: string | null;
    lastSeenAt?: string | null;
  } | null;
  package: {
    id: string;
    name: string;
    lineItems: Array<{
      packageId: string;
      packageName: string;
      quantity: number;
      unitPriceCzk: number | null;
    }>;
  };
  price: {
    amountCzk: number | null;
    currency: string;
  };
  paymentProvider: string | null;
  status: {
    order: string;
    payment: string;
    delivery: string;
  };
  review: {
    reasonCode: string | null;
    note: string | null;
    reviewedAt: string | null;
  } | null;
  paymentAttempt: {
    id: string;
    status: string;
    provider: string;
    providerCheckoutId: string | null;
    providerPaymentId: string | null;
  } | null;
  entitlementStatus: string | null;
  deliveryJob: {
    id: string;
    status: string;
    retryCount: number;
  } | null;
  createdAt: string;
  updatedAt: string;
  paidAt: string | null;
  deliveredAt: string | null;
};

export type AdminCommerceOverviewResponse = {
  counts: {
    awaitingPayment: number;
    paymentProcessing: number;
    paidOrDeliveryQueued: number;
    delivering: number;
    delivered: number;
    paymentFailed: number;
    deliveryFailed: number;
    manualReview: number;
    unmatchedPaymentEvents: number;
    deadLetterDeliveryJobs: number;
    staleLeasedJobs: number;
    paidOrdersWithoutEntitlement: number;
    succeededPaymentsWithoutGrantDeliveryJob: number;
  };
  alerts: Array<{
    code: string;
    severity: "warning" | "blocker";
    count: number;
    label: string;
  }>;
  recentOrders: AdminCommerceOrderSummary[];
  generatedAt: string;
};

export type AdminCommerceOrdersResponse = {
  orders: AdminCommerceOrderSummary[];
  pagination: {
    query: string;
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
};

export type AdminPaymentAttemptSummary = {
  id: string;
  orderId: string;
  status: string;
  provider: string;
  providerCheckoutId: string | null;
  providerPaymentId: string | null;
  amountCzk: number | null;
  lastProviderStatus: string | null;
  lastProviderEventId: string | null;
  continuationAvailable: boolean;
  expiresAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  closedAt: string | null;
};

export type AdminPaymentEventSummary = {
  id: string;
  orderId: string | null;
  paymentAttemptId: string | null;
  provider: string | null;
  providerEventId: string | null;
  providerCheckoutId: string | null;
  providerPaymentId: string | null;
  providerEventType: string | null;
  normalizedEventType: string;
  processingStatus: string;
  amountCzk: number | null;
  currency: string | null;
  review: {
    reasonCode: string | null;
    note: string | null;
  } | null;
  duplicateOfEventId: string | null;
  receivedAt: string | null;
  occurredAt: string | null;
  processedAt: string | null;
  deadLetteredAt: string | null;
};

export type AdminEntitlementSummary = {
  id: string;
  orderId: string;
  userId: string;
  minecraftAccountId: string | null;
  packageId: string;
  packageName: string;
  type: string;
  status: string;
  createdAt: string;
  grantedAt: string | null;
  revokedAt: string | null;
};

export type AdminDeliveryAttemptSummary = {
  id: string;
  deliveryJobId: string;
  attemptNo: number;
  result: string;
  errorCode: string | null;
  errorMessage: string | null;
  startedAt: string;
  finishedAt: string | null;
};

export type AdminDeliveryJobSummary = {
  id: string;
  orderId: string;
  entitlementId: string;
  userId: string;
  minecraftAccountId: string | null;
  type: string;
  status: string;
  retryCount: number;
  maxAttempts: number;
  leaseOwner: string | null;
  leaseExpiresAt: string | null;
  availableAt: string | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  review: {
    reasonCode: string | null;
    note: string | null;
  } | null;
  deadLetteredAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminCommerceTimelineEntry = {
  id: string;
  at: string;
  source: "system" | "provider" | "admin" | "plugin";
  type: string;
  description: string;
  correlationId: string | null;
  providerEventId: string | null;
  actorId: string | null;
};

export type AdminCommerceActionAvailability =
  | boolean
  | {
      allowed: boolean;
      reason?: string | null;
    };

export type AdminCommerceOrderDetailResponse = {
  order: AdminCommerceOrderSummary;
  user: {
    id: string;
    email: string;
  };
  minecraftAccount: {
    id: string | null;
    username: string | null;
    uuid: string | null;
  } | null;
  paymentAttempts: AdminPaymentAttemptSummary[];
  paymentEvents: AdminPaymentEventSummary[];
  entitlement: AdminEntitlementSummary | null;
  deliveryJobs: AdminDeliveryJobSummary[];
  deliveryAttempts: AdminDeliveryAttemptSummary[];
  timeline: AdminCommerceTimelineEntry[];
  actions: {
    reconcileOrder?: AdminCommerceActionAvailability;
    reconcilePaymentAttempt?: AdminCommerceActionAvailability;
    paymentAttempts?: Array<{
      paymentAttemptId: string;
      reconcile: AdminCommerceActionAvailability;
    }>;
    repairArtifacts?: AdminCommerceActionAvailability;
    markManualReview?: AdminCommerceActionAvailability;
    deliveryJobs?: Array<{
      jobId: string;
      retry: AdminCommerceActionAvailability;
      releaseLease: AdminCommerceActionAvailability;
    }>;
    refund?: AdminCommerceActionAvailability;
  };
  blockage: {
    code: string;
    label: string;
  };
};

export type AdminCommerceReconciliationResult = {
  reprocessedCount: number;
  refreshedAttemptCount: number;
  repairedOrderCount: number;
  manualReviewEventCount: number;
  manualReviewOrderCount: number;
  reprocessedEventIds: string[];
  refreshedAttemptIds: string[];
  repairedOrderIds: string[];
  manualReviewEventIds: string[];
  manualReviewOrderIds: string[];
};

export type AdminCommerceMutationResponse =
  | {
      operation: "order_reconciled" | "payment_attempt_reconciled";
      result: AdminCommerceReconciliationResult;
      detail: AdminCommerceOrderDetailResponse;
    }
  | {
      operation: "manual_review_marked";
      detail: AdminCommerceOrderDetailResponse;
    }
  | {
      operation: "artifacts_repaired";
      result: {
        repaired: boolean;
        reason: string | null;
        entitlementCreated: boolean;
        deliveryJobCreated: boolean;
      };
      detail: AdminCommerceOrderDetailResponse;
    }
  | {
      operation: "delivery_retried" | "delivery_lease_released";
      deliveryJob: AdminDeliveryJobSummary;
      detail: AdminCommerceOrderDetailResponse;
    };

export type AdminCommerceManualReviewResponse = {
  orders: AdminCommerceOrderSummary[];
  paymentEvents: AdminPaymentEventSummary[];
  deliveryJobs: AdminDeliveryJobSummary[];
  staleLeasedJobs: AdminDeliveryJobSummary[];
  pagination: {
    limit: number;
    offset: number;
    totals: {
      orders: number;
      paymentEvents: number;
      deliveryJobs: number;
      staleLeasedJobs: number;
    };
    hasMore: boolean;
  };
};

export type AdminCommerceDeliveryJobsResponse = {
  deliveryJobs: Array<{
    job: AdminDeliveryJobSummary;
    order: AdminCommerceOrderSummary | null;
  }>;
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
    status?: string | null;
  };
};

export type AdminReadinessStatus = "PASS" | "WARNING" | "BLOCKER";

export type AdminStagingReadinessResponse = {
  status: AdminReadinessStatus;
  ready: boolean;
  generatedAt: string;
  counts: {
    pass: number;
    warning: number;
    blocker: number;
  };
  checks: Array<{
    id: string;
    label: string;
    status: AdminReadinessStatus;
    message: string;
  }>;
};
