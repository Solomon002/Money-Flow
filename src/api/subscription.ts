import { apiRequest } from "./client.js";

export type Subscription = {
  id: string;
  user_id: string;
  plan: "free" | "pro";
  status:
    | "active"
    | "trialing"
    | "past_due"
    | "cancelled"
    | "expired";
  provider: string | null;
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
};

export type SubscriptionPayment = {
  id: string;
  amount_minor: string;
  currency: string;
  status: "success" | "failed" | "abandoned";
  provider: string;
  provider_reference: string;
  channel: string | null;
  paid_at: string;
};

export async function getSubscription() {
  return apiRequest("/api/subscription", {
    method: "GET",
  }) as Promise<{
    response: Response;
    data: {
      status: string;
      subscription: Subscription;
      message?: string;
    };
  }>;
}

export async function initializeProSubscription() {
  return apiRequest("/api/subscription/initialize", {
    method: "POST",
  }) as Promise<{
    response: Response;
    data: {
      status: string;
      checkout?: {
        authorization_url: string;
        access_code: string;
        reference: string;
      };
      message?: string;
    };
  }>;
}

export async function verifyProSubscription(
  reference: string,
) {
  return apiRequest("/api/subscription/verify", {
    method: "POST",
    body: JSON.stringify({
      reference,
    }),
  }) as Promise<{
    response: Response;
    data: {
      status: string;
      message?: string;
      subscription?: Subscription;
    };
  }>;
}

export async function cancelSubscription() {
  return apiRequest("/api/subscription/cancel", {
    method: "POST",
  }) as Promise<{
    response: Response;
    data: {
      status: string;
      message?: string;
      subscription?: Subscription;
    };
  }>;
}

export async function reactivateSubscription() {
  return apiRequest("/api/subscription/reactivate", {
    method: "POST",
  }) as Promise<{
    response: Response;
    data: {
      status: string;
      message?: string;
      subscription?: Subscription;
    };
  }>;
}

export async function getSubscriptionPayments() {
  return apiRequest("/api/subscription/payments", {
    method: "GET",
  }) as Promise<{
    response: Response;
    data: {
      status: string;
      payments: SubscriptionPayment[];
      message?: string;
    };
  }>;
}