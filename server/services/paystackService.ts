type PaystackInitializeResponse = {
  status: boolean;
  message: string;
  data?: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
};

type PaystackVerifyResponse = {
  status: boolean;
  message: string;
  data?: {
    id: number;
    status: string;
    reference: string;
    amount: number;
    currency: string;
    paid_at: string | null;
    created_at: string;
    customer?: {
      id: number;
      customer_code: string;
      email: string;
    };
    plan?: {
      id?: number;
      name?: string;
      plan_code?: string;
      amount?: number;
      interval?: string;
    } | null;
    plan_object?: {
      id?: number;
      name?: string;
      plan_code?: string;
      amount?: number;
      interval?: string;
    } | null;
    authorization?: {
      authorization_code?: string;
      bin?: string;
      last4?: string;
      exp_month?: string;
      exp_year?: string;
      channel?: string;
      card_type?: string;
      bank?: string;
      country_code?: string;
      brand?: string;
      reusable?: boolean;
      signature?: string;
    } | null;
    metadata?: unknown;
  };
};

const PAYSTACK_API_URL = "https://api.paystack.co";

const DEFAULT_PRO_PRICE_MINOR = 100000;

export function getProPriceMinor(): number {
  const env = (
    globalThis as typeof globalThis & {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process?.env;

  const raw = env?.PRO_PRICE_MINOR;

  if (!raw) {
    return DEFAULT_PRO_PRICE_MINOR;
  }

  const parsed = Number(raw);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_PRO_PRICE_MINOR;
  }

  return Math.round(parsed);
}

const getPaystackSecretKey = () => {
  const env = (
    globalThis as typeof globalThis & {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process?.env;

  const secretKey = env?.PAYSTACK_SECRET_KEY;

  if (!secretKey) {
    throw new Error("PAYSTACK_SECRET_KEY is not configured");
  }

  return secretKey;
};

export async function initializeProSubscription({
  email,
  planCode,
  callbackUrl,
  userId,
}: {
  email: string;
  planCode: string;
  callbackUrl: string;
  userId: string;
}) {
  const secretKey = getPaystackSecretKey();
  const amountMinor = getProPriceMinor();

  const response = await fetch(
    `${PAYSTACK_API_URL}/transaction/initialize`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: String(amountMinor),
        currency: "NGN",
        callback_url: callbackUrl,
        channels: ["card", "bank", "bank_transfer", "ussd"],
        metadata: JSON.stringify({
          userId,
          product: "moneyflow_pro",
        }),
      }),
    },
  );

  const data =
    (await response.json()) as PaystackInitializeResponse;

  if (!response.ok || !data.status || !data.data) {
    throw new Error(
      data.message || "Failed to initialize Paystack transaction",
    );
  }

  return data.data;
}

export async function verifyPaystackTransaction(
  reference: string,
) {
  const secretKey = getPaystackSecretKey();

  const response = await fetch(
    `${PAYSTACK_API_URL}/transaction/verify/${encodeURIComponent(
      reference,
    )}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
    },
  );

  const data =
    (await response.json()) as PaystackVerifyResponse;

  if (!response.ok || !data.status || !data.data) {
    throw new Error(
      data.message || "Failed to verify Paystack transaction",
    );
  }

  return data.data;
}