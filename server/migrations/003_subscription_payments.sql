-- Records every successful MoneyFlow Pro payment.
-- One row per payment event, newest at the top when queried by paid_at DESC.
-- Referenced by the payment history endpoint and rendered on /app/pro.

BEGIN;

CREATE TABLE subscription_payments (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount_minor             BIGINT NOT NULL CHECK (amount_minor > 0),
    currency                 VARCHAR(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
    status                   VARCHAR(16) NOT NULL
                             CHECK (status IN ('success', 'failed', 'abandoned')),
    provider                 VARCHAR(32) NOT NULL DEFAULT 'paystack',
    provider_reference       VARCHAR(64) NOT NULL,
    provider_transaction_id  BIGINT,
    channel                  VARCHAR(32),
    paid_at                  TIMESTAMPTZ NOT NULL,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX subscription_payments_provider_reference_uidx
    ON subscription_payments (provider, provider_reference);

CREATE INDEX subscription_payments_user_paid_at_idx
    ON subscription_payments (user_id, paid_at DESC);

COMMIT;