-- MoneyFlow V1 initial schema
-- Requires PostgreSQL 13+ (gen_random_uuid() is built in).
-- All financial values are positive BIGINT minor units in the user's one V1 currency.

BEGIN;

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(120) NOT NULL CHECK (length(btrim(name)) > 0),
    email           VARCHAR(320) NOT NULL CHECK (email = btrim(email) AND email <> ''),
    password_hash   VARCHAR(255) NOT NULL
                    CHECK (password_hash LIKE '$argon2id$%'),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX users_email_lower_uidx ON users (lower(email));

CREATE TABLE categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(60) NOT NULL CHECK (name = btrim(name) AND name <> ''),
    kind        VARCHAR(10) NOT NULL CHECK (kind IN ('income', 'expense')),
    is_default  BOOLEAN NOT NULL DEFAULT false,
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Candidate keys support owner- and kind-aware foreign keys from financial tables.
    CONSTRAINT categories_id_user_uq UNIQUE (id, user_id),
    CONSTRAINT categories_id_user_kind_uq UNIQUE (id, user_id, kind)
);

CREATE UNIQUE INDEX categories_user_kind_name_uidx
    ON categories (user_id, kind, lower(name));

CREATE TABLE financial_preferences (
    user_id                         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    currency_code                   VARCHAR(3) NOT NULL DEFAULT 'NGN'
                                    CHECK (currency_code ~ '^[A-Z]{3}$'),
    monthly_income_minor            BIGINT CHECK (monthly_income_minor IS NULL OR monthly_income_minor >= 0),
    monthly_savings_target_minor    BIGINT CHECK (monthly_savings_target_minor IS NULL OR monthly_savings_target_minor >= 0),
    financial_objective             VARCHAR(120),
    appearance                      VARCHAR(8) NOT NULL DEFAULT 'system'
                                    CHECK (appearance IN ('light', 'dark', 'system')),
    budget_alerts_enabled           BOOLEAN NOT NULL DEFAULT true,
    goal_reminders_enabled          BOOLEAN NOT NULL DEFAULT true,
    monthly_insights_enabled        BOOLEAN NOT NULL DEFAULT true,
    recurring_reminders_enabled     BOOLEAN NOT NULL DEFAULT true,
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE transactions (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id       UUID NOT NULL,
    type              VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
    amount_minor      BIGINT NOT NULL CHECK (amount_minor > 0),
    description       VARCHAR(160) NOT NULL CHECK (length(btrim(description)) > 0),
    transaction_date DATE NOT NULL,
    notes             TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT transactions_category_owner_kind_fk
        FOREIGN KEY (category_id, user_id, type)
        REFERENCES categories (id, user_id, kind)
        ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX transactions_user_date_idx
    ON transactions (user_id, transaction_date DESC, created_at DESC);
CREATE INDEX transactions_user_category_date_idx
    ON transactions (user_id, category_id, transaction_date DESC);
CREATE INDEX transactions_user_type_date_idx
    ON transactions (user_id, type, transaction_date DESC);

CREATE TABLE budgets (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id           UUID NOT NULL,
    category_kind         VARCHAR(10) NOT NULL DEFAULT 'expense'
                          CHECK (category_kind = 'expense'),
    monthly_amount_minor  BIGINT NOT NULL CHECK (monthly_amount_minor > 0),
    month                 SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
    year                  SMALLINT NOT NULL CHECK (year BETWEEN 2000 AND 9999),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT budgets_user_category_month_year_uq
        UNIQUE (user_id, category_id, year, month),
    CONSTRAINT budgets_category_owner_kind_fk
        FOREIGN KEY (category_id, user_id, category_kind)
        REFERENCES categories (id, user_id, kind)
        ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT budgets_id_user_uq UNIQUE (id, user_id)
);

CREATE INDEX budgets_user_year_month_idx ON budgets (user_id, year, month);

CREATE TABLE goals (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name                  VARCHAR(120) NOT NULL CHECK (length(btrim(name)) > 0),
    target_amount_minor   BIGINT NOT NULL CHECK (target_amount_minor > 0),
    current_amount_minor  BIGINT NOT NULL DEFAULT 0 CHECK (current_amount_minor >= 0),
    target_date           DATE,
    description           TEXT,
    status                VARCHAR(12) NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'completed', 'paused', 'archived')),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT goals_id_user_uq UNIQUE (id, user_id)
);

CREATE INDEX goals_user_status_created_idx
    ON goals (user_id, status, created_at DESC);

CREATE TABLE recurring_transactions (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id    UUID NOT NULL,
    type           VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
    amount_minor   BIGINT NOT NULL CHECK (amount_minor > 0),
    description    VARCHAR(160) NOT NULL CHECK (length(btrim(description)) > 0),
    frequency      VARCHAR(12) NOT NULL
                   CHECK (frequency IN ('weekly', 'monthly', 'quarterly', 'yearly')),
    next_date      DATE NOT NULL,
    active         BOOLEAN NOT NULL DEFAULT true,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT recurring_category_owner_kind_fk
        FOREIGN KEY (category_id, user_id, type)
        REFERENCES categories (id, user_id, kind)
        ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT recurring_id_user_uq UNIQUE (id, user_id)
);

CREATE INDEX recurring_active_next_date_idx
    ON recurring_transactions (next_date) WHERE active;
CREATE INDEX recurring_user_active_next_date_idx
    ON recurring_transactions (user_id, next_date) WHERE active;

CREATE TABLE notifications (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type                     VARCHAR(32) NOT NULL
                             CHECK (type IN ('budget_warning', 'goal_reminder', 'monthly_insight', 'recurring_payment')),
    title                    VARCHAR(160) NOT NULL CHECK (length(btrim(title)) > 0),
    message                  TEXT NOT NULL CHECK (length(btrim(message)) > 0),
    read_at                  TIMESTAMPTZ,
    budget_id                UUID,
    goal_id                  UUID,
    recurring_transaction_id UUID,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT notifications_at_most_one_related_entity_ck
        CHECK (num_nonnulls(budget_id, goal_id, recurring_transaction_id) <= 1),
    CONSTRAINT notifications_related_type_ck CHECK (
        (budget_id IS NULL OR type = 'budget_warning') AND
        (goal_id IS NULL OR type = 'goal_reminder') AND
        (recurring_transaction_id IS NULL OR type = 'recurring_payment')
    ),
    CONSTRAINT notifications_budget_owner_fk
        FOREIGN KEY (budget_id, user_id)
        REFERENCES budgets (id, user_id) ON DELETE CASCADE,
    CONSTRAINT notifications_goal_owner_fk
        FOREIGN KEY (goal_id, user_id)
        REFERENCES goals (id, user_id) ON DELETE CASCADE,
    CONSTRAINT notifications_recurring_owner_fk
        FOREIGN KEY (recurring_transaction_id, user_id)
        REFERENCES recurring_transactions (id, user_id) ON DELETE CASCADE
);

CREATE INDEX notifications_user_created_idx
    ON notifications (user_id, created_at DESC);
CREATE INDEX notifications_user_unread_idx
    ON notifications (user_id, created_at DESC) WHERE read_at IS NULL;

CREATE TABLE auth_sessions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash  VARCHAR(64) NOT NULL UNIQUE
                        CHECK (refresh_token_hash ~ '^[a-f0-9]{64}$'),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at          TIMESTAMPTZ NOT NULL,
    last_used_at        TIMESTAMPTZ,
    revoked_at          TIMESTAMPTZ,
    CONSTRAINT auth_sessions_expiry_ck CHECK (expires_at > created_at),
    CONSTRAINT auth_sessions_revoked_ck CHECK (revoked_at IS NULL OR revoked_at >= created_at)
);

CREATE INDEX auth_sessions_user_active_expiry_idx
    ON auth_sessions (user_id, expires_at) WHERE revoked_at IS NULL;

CREATE TABLE password_reset_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(64) NOT NULL UNIQUE CHECK (token_hash ~ '^[a-f0-9]{64}$'),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    CONSTRAINT password_reset_expiry_ck CHECK (expires_at > created_at),
    CONSTRAINT password_reset_used_ck CHECK (used_at IS NULL OR used_at >= created_at)
);

CREATE INDEX password_reset_user_pending_idx
    ON password_reset_tokens (user_id, expires_at) WHERE used_at IS NULL;

-- Keep updated_at consistent for rows modified by the API.
CREATE FUNCTION moneyflow_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION moneyflow_set_updated_at();
CREATE TRIGGER categories_set_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION moneyflow_set_updated_at();
CREATE TRIGGER transactions_set_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION moneyflow_set_updated_at();
CREATE TRIGGER budgets_set_updated_at BEFORE UPDATE ON budgets
    FOR EACH ROW EXECUTE FUNCTION moneyflow_set_updated_at();
CREATE TRIGGER goals_set_updated_at BEFORE UPDATE ON goals
    FOR EACH ROW EXECUTE FUNCTION moneyflow_set_updated_at();
CREATE TRIGGER recurring_set_updated_at BEFORE UPDATE ON recurring_transactions
    FOR EACH ROW EXECUTE FUNCTION moneyflow_set_updated_at();
CREATE TRIGGER preferences_set_updated_at BEFORE UPDATE ON financial_preferences
    FOR EACH ROW EXECUTE FUNCTION moneyflow_set_updated_at();

-- Seed each new account with its own default categories and preferences.
CREATE FUNCTION moneyflow_initialize_user()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO financial_preferences (user_id) VALUES (NEW.id);

    INSERT INTO categories (user_id, name, kind, is_default)
    VALUES
        (NEW.id, 'Food', 'expense', true),
        (NEW.id, 'Transport', 'expense', true),
        (NEW.id, 'Shopping', 'expense', true),
        (NEW.id, 'Bills', 'expense', true),
        (NEW.id, 'Entertainment', 'expense', true),
        (NEW.id, 'Health', 'expense', true),
        (NEW.id, 'Education', 'expense', true),
        (NEW.id, 'Housing', 'expense', true),
        (NEW.id, 'Other', 'expense', true),
        (NEW.id, 'Salary', 'income', true),
        (NEW.id, 'Freelance', 'income', true),
        (NEW.id, 'Business', 'income', true),
        (NEW.id, 'Gift', 'income', true),
        (NEW.id, 'Other', 'income', true);

    RETURN NEW;
END;
$$;

CREATE TRIGGER users_initialize_moneyflow AFTER INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION moneyflow_initialize_user();

-- A currency preference change must not silently reinterpret existing minor units.
CREATE FUNCTION moneyflow_prevent_currency_reinterpretation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.currency_code IS DISTINCT FROM OLD.currency_code AND (
        OLD.monthly_income_minor IS NOT NULL OR
        OLD.monthly_savings_target_minor IS NOT NULL OR
        EXISTS (SELECT 1 FROM transactions WHERE user_id = OLD.user_id) OR
        EXISTS (SELECT 1 FROM budgets WHERE user_id = OLD.user_id) OR
        EXISTS (SELECT 1 FROM goals WHERE user_id = OLD.user_id) OR
        EXISTS (SELECT 1 FROM recurring_transactions WHERE user_id = OLD.user_id)
    ) THEN
        RAISE EXCEPTION 'Currency cannot be changed after financial amounts have been recorded';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER preferences_prevent_currency_reinterpretation
    BEFORE UPDATE OF currency_code ON financial_preferences
    FOR EACH ROW EXECUTE FUNCTION moneyflow_prevent_currency_reinterpretation();

COMMIT;
