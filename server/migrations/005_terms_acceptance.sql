-- Records when (and to which version of) the Terms and Privacy Policy each
-- user agreed. Idempotent.

BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_version VARCHAR(20);

COMMIT;
