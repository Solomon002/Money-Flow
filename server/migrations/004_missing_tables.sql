-- Tables the application uses that earlier migrations never created.
-- Written so it is safe to run against a database that already has them:
-- every statement is IF NOT EXISTS / idempotent.

BEGIN;

-- Google-only accounts have no password.
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Set once the person has proven they own the address (Google sign-in or a
-- completed password reset). Used to stop pre-registration account takeover.
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

-- Subcategories. The composite FK keeps a parent inside the same account.
ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_id UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'categories_parent_owner_fk'
    ) THEN
        ALTER TABLE categories
            ADD CONSTRAINT categories_parent_owner_fk
            FOREIGN KEY (parent_id, user_id)
            REFERENCES categories (id, user_id) ON DELETE CASCADE;
    END IF;
END $$;

ALTER TABLE financial_preferences
    ADD COLUMN IF NOT EXISTS income_source VARCHAR(120);

-- goal_completed notifications point at their goal.
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_related_type_ck;
ALTER TABLE notifications ADD CONSTRAINT notifications_related_type_ck CHECK (
    (budget_id IS NULL OR type = 'budget_warning') AND
    (goal_id IS NULL OR type IN ('goal_reminder', 'goal_completed')) AND
    (recurring_transaction_id IS NULL OR type = 'recurring_payment')
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                   UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    plan                      VARCHAR(8) NOT NULL DEFAULT 'free'
                              CHECK (plan IN ('free', 'pro')),
    status                    VARCHAR(12) NOT NULL DEFAULT 'active'
                              CHECK (status IN ('active', 'trialing', 'past_due', 'cancelled', 'expired')),
    provider                  VARCHAR(32),
    provider_customer_id      VARCHAR(128),
    provider_subscription_id  VARCHAR(128),
    current_period_start      TIMESTAMPTZ,
    current_period_end        TIMESTAMPTZ,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscriptions_provider_customer_idx
    ON subscriptions (provider, provider_customer_id);

CREATE TABLE IF NOT EXISTS google_auth_codes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash   VARCHAR(64) NOT NULL UNIQUE CHECK (code_hash ~ '^[a-f0-9]{64}$'),
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS feedback (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feedback_type  VARCHAR(50) NOT NULL,
    feedback       TEXT NOT NULL CHECK (length(feedback) <= 5000),
    email          VARCHAR(320),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS coach_chats (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(120) NOT NULL DEFAULT 'New Chat',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS coach_chats_user_updated_idx
    ON coach_chats (user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS coach_messages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id     UUID NOT NULL REFERENCES coach_chats(id) ON DELETE CASCADE,
    role        VARCHAR(10) NOT NULL CHECK (role IN ('user', 'assistant')),
    content     TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS coach_messages_chat_created_idx
    ON coach_messages (chat_id, created_at);

COMMIT;
