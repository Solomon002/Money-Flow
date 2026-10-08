-- Adds subscription_expiring to the allowed notifications.type values.
-- Safe to run multiple times: drops the constraint (if present) and re-adds it.

BEGIN;

ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (
    type IN (
      'budget_warning',
      'goal_reminder',
      'monthly_insight',
      'recurring_payment',
      'goal_completed',
      'subscription_expiring'
    )
  );

COMMIT;