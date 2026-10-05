import crypto from "crypto";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";

const SESSION_DURATION_DAYS = 30;
const ACCESS_TOKEN_DURATION = "15m";

function getAccessTokenSecret(): string {
  const secret = process.env.JWT_ACCESS_SECRET;

  if (!secret) {
    throw new Error("JWT_ACCESS_SECRET is not defined");
  }

  return secret;
}

function generateRefreshToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function hashRefreshToken(refreshToken: string): string {
  return crypto
    .createHash("sha256")
    .update(refreshToken)
    .digest("hex");
}

function createAccessToken(userId: string): string {
  return jwt.sign(
    { userId },
    getAccessTokenSecret(),
    {
      expiresIn: ACCESS_TOKEN_DURATION,
    },
  );
}

export async function createSession(userId: string) {
  const refreshToken = generateRefreshToken();

  const refreshTokenHash =
    hashRefreshToken(refreshToken);

  const accessToken = createAccessToken(userId);

  const expiresAt = new Date(
    Date.now() +
      SESSION_DURATION_DAYS *
        24 *
        60 *
        60 *
        1000,
  );

  const result = await pool.query(
    `
      INSERT INTO public.auth_sessions (
        user_id,
        refresh_token_hash,
        expires_at
      )
      VALUES ($1, $2, $3)
      RETURNING
        id,
        user_id,
        created_at,
        expires_at
    `,
    [
      userId,
      refreshTokenHash,
      expiresAt,
    ],
  );

  return {
    session: result.rows[0],
    accessToken,
    refreshToken,
  };
}

export async function refreshAccessToken(
  refreshToken: string,
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const refreshTokenHash =
      hashRefreshToken(refreshToken);

    const result = await client.query(
      `
        SELECT
          id,
          user_id,
          expires_at
        FROM public.auth_sessions
        WHERE refresh_token_hash = $1
          AND expires_at > NOW()
          AND revoked_at IS NULL
        FOR UPDATE
      `,
      [refreshTokenHash],
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    const session = result.rows[0];

    // Revoke the old refresh token immediately.
    await client.query(
      `
        UPDATE public.auth_sessions
        SET revoked_at = NOW()
        WHERE id = $1
          AND revoked_at IS NULL
      `,
      [session.id],
    );

    // Generate a completely new refresh token.
    const newRefreshToken =
      generateRefreshToken();

    const newRefreshTokenHash =
      hashRefreshToken(newRefreshToken);

    const newExpiresAt = new Date(
      Date.now() +
        SESSION_DURATION_DAYS *
          24 *
          60 *
          60 *
          1000,
    );

    await client.query(
      `
        INSERT INTO public.auth_sessions (
          user_id,
          refresh_token_hash,
          expires_at
        )
        VALUES ($1, $2, $3)
      `,
      [
        session.user_id,
        newRefreshTokenHash,
        newExpiresAt,
      ],
    );

    const accessToken = createAccessToken(
      session.user_id,
    );

    await client.query("COMMIT");

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function revokeSession(
  refreshToken: string,
) {
  const refreshTokenHash =
    hashRefreshToken(refreshToken);

  const result = await pool.query(
    `
      UPDATE public.auth_sessions
      SET revoked_at = NOW()
      WHERE refresh_token_hash = $1
        AND revoked_at IS NULL
      RETURNING id
    `,
    [refreshTokenHash],
  );

  return (result.rowCount ?? 0) > 0;
}

export async function revokeAllUserSessions(
  userId: string,
) {
  const result = await pool.query(
    `
      UPDATE public.auth_sessions
      SET revoked_at = NOW()
      WHERE user_id = $1
        AND revoked_at IS NULL
    `,
    [userId],
  );

  return result.rowCount ?? 0;
}