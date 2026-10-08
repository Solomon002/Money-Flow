import { useEffect, useState } from "react";
import { getSubscription, type Subscription } from "../api/subscription.js";

export type ProExpiryInfo = {
  subscription: Subscription | null;
  isLoading: boolean;
  isPro: boolean;
  daysUntilExpiry: number | null;
  daysSinceExpiry: number | null;
  isExpiringSoon: boolean;
  isInGracePeriod: boolean;
  isExpired: boolean;
};

const REMINDER_WINDOW_DAYS = 7;
const GRACE_PERIOD_DAYS = 5;

export function useProExpiry(): ProExpiryInfo {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await getSubscription();

        if (cancelled) return;

        if (response.response.ok) {
          setSubscription(response.data.subscription);
        } else {
          setSubscription(null);
        }
      } catch (error) {
        if (cancelled) return;
        console.error("Loading subscription for expiry check failed:", error);
        setSubscription(null);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const isPro =
    subscription?.plan === "pro" &&
    (subscription.status === "active" ||
      subscription.status === "trialing" ||
      subscription.status === "cancelled");

  let daysUntilExpiry: number | null = null;

  if (isPro && subscription?.current_period_end) {
    const expiry = new Date(subscription.current_period_end).getTime();
    const now = Date.now();
    const diffMs = expiry - now;
    daysUntilExpiry = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

  const isExpired = isPro && daysUntilExpiry !== null && daysUntilExpiry <= 0;

  const isExpiringSoon =
    isPro &&
    daysUntilExpiry !== null &&
    daysUntilExpiry > 0 &&
    daysUntilExpiry <= REMINDER_WINDOW_DAYS;

  const daysSinceExpiry =
    isExpired && daysUntilExpiry !== null ? Math.abs(daysUntilExpiry) : null;

  const isInGracePeriod =
    isExpired &&
    daysSinceExpiry !== null &&
    daysSinceExpiry <= GRACE_PERIOD_DAYS;

  return {
    subscription,
    isLoading,
    isPro,
    daysUntilExpiry,
    daysSinceExpiry,
    isExpiringSoon,
    isInGracePeriod,
    isExpired,
  };
}