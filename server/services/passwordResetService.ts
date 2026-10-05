import crypto from "crypto";
import argon2 from "argon2";
import { pool } from "../db.js";

const RESET_TOKEN_DURATION_MINUTES = 30;

function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function hashResetToken(resetToken: string): string {
  return crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
}

export async function createPasswordResetToken(userId: string) {
  const userResult = await pool.query(
    `
      SELECT email
      FROM public.users
      WHERE id = $1
    `,
    [userId],
  );

  if (userResult.rows.length === 0) {
    throw new Error("User not found");
  }

  const resetToken = generateResetToken();
  const resetTokenHash = hashResetToken(resetToken);

  const expiresAt = new Date(
    Date.now() + RESET_TOKEN_DURATION_MINUTES * 60 * 1000,
  );

  await pool.query(
    `
      UPDATE public.password_reset_tokens
      SET used_at = NOW()
      WHERE user_id = $1
        AND used_at IS NULL
    `,
    [userId],
  );

  const result = await pool.query(
    `
      INSERT INTO public.password_reset_tokens (
        user_id,
        token_hash,
        expires_at
      )
      VALUES ($1, $2, $3)
      RETURNING id, user_id, created_at, expires_at
    `,
    [userId, resetTokenHash, expiresAt],
  );

  return {
    resetToken,
    email: userResult.rows[0].email,
    tokenRecord: result.rows[0],
  };
}

export async function resetPassword(
  resetToken: string,
  newPassword: string,
) {
  const resetTokenHash = hashResetToken(resetToken);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const tokenResult = await client.query(
      `
        SELECT id, user_id
        FROM public.password_reset_tokens
        WHERE token_hash = $1
          AND expires_at > NOW()
          AND used_at IS NULL
      `,
      [resetTokenHash],
    );

    if (tokenResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return false;
    }

    const tokenRecord = tokenResult.rows[0];

    const passwordHash = await argon2.hash(newPassword, {
      type: argon2.argon2id,
    });

    await client.query(
      `
        UPDATE public.users
        SET
          password_hash = $1,
          updated_at = NOW()
        WHERE id = $2
      `,
      [passwordHash, tokenRecord.user_id],
    );

    await client.query(
      `
        UPDATE public.password_reset_tokens
        SET used_at = NOW()
        WHERE id = $1
      `,
      [tokenRecord.id],
    );

    await client.query(
      `
        UPDATE public.auth_sessions
        SET revoked_at = NOW()
        WHERE user_id = $1
          AND revoked_at IS NULL
      `,
      [tokenRecord.user_id],
    );

    await client.query("COMMIT");

    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}