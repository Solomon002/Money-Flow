import crypto from "crypto";
import { pool } from "../db.js";

const GOOGLE_AUTH_CODE_DURATION_MS = 2 * 60 * 1000;

function generateGoogleAuthCode(): string {
  return crypto.randomBytes(32).toString("hex");
}

function hashGoogleAuthCode(code: string): string {
  return crypto
    .createHash("sha256")
    .update(code)
    .digest("hex");
}

export async function createGoogleAuthCode(
  userId: string,
) {
  const code = generateGoogleAuthCode();
  const codeHash = hashGoogleAuthCode(code);

  const expiresAt = new Date(
    Date.now() + GOOGLE_AUTH_CODE_DURATION_MS,
  );

  await pool.query(
    `
      INSERT INTO public.google_auth_codes (
        user_id,
        code_hash,
        expires_at
      )
      VALUES ($1, $2, $3)
    `,
    [
      userId,
      codeHash,
      expiresAt,
    ],
  );

  return code;
}

export async function exchangeGoogleAuthCode(
  code: string,
) {
  const codeHash = hashGoogleAuthCode(code);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `
        SELECT
          id,
          user_id,
          expires_at,
          used_at
        FROM public.google_auth_codes
        WHERE code_hash = $1
        FOR UPDATE
      `,
      [codeHash],
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    const authCode = result.rows[0];

    if (authCode.used_at) {
      await client.query("ROLLBACK");
      return null;
    }

    if (
      new Date(authCode.expires_at).getTime() <=
      Date.now()
    ) {
      await client.query("ROLLBACK");
      return null;
    }

    await client.query(
      `
        UPDATE public.google_auth_codes
        SET used_at = NOW()
        WHERE id = $1
      `,
      [authCode.id],
    );

    await client.query("COMMIT");

    return {
      userId: authCode.user_id,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}