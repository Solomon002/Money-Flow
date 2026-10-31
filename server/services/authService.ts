import argon2 from "argon2";
import { pool } from "../db.js";

type RegisterUserInput = {
  name: string;
  email: string;
  password: string;
};

type LoginUserInput = {
  email: string;
  password: string;
};

let dummyHashPromise: Promise<string> | null = null;

function getDummyHash(): Promise<string> {
  if (!dummyHashPromise) {
    dummyHashPromise = argon2.hash(
      "moneyflow-timing-equalizer",
      { type: argon2.argon2id },
    );
  }

  return dummyHashPromise;
}

/*
 * Decides whether an email change may go ahead.
 * Unchanged email → "ok". Changed email → the current password must
 * be supplied and correct.
 */
export async function verifyEmailChange({
  userId,
  newEmail,
  currentPassword,
}: {
  userId: string;
  newEmail: string;
  currentPassword: unknown;
}): Promise<"ok" | "password_required" | "password_not_set"> {
  const result = await pool.query(
    `
      SELECT email, password_hash
      FROM public.users
      WHERE id = $1
    `,
    [userId],
  );

  const user = result.rows[0];

  if (!user || user.email.toLowerCase() === newEmail) {
    return "ok";
  }

  if (!user.password_hash) {
    return "password_not_set";
  }

  if (
    typeof currentPassword !== "string" ||
    currentPassword.length === 0 ||
    currentPassword.length > 256 ||
    !(await argon2.verify(user.password_hash, currentPassword))
  ) {
    return "password_required";
  }

  return "ok";
}

export async function registerUser({
  name,
  email,
  password,
}: RegisterUserInput) {
  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
  });

  const result = await pool.query(
    `
      INSERT INTO public.users (
        name,
        email,
        password_hash
      )
      VALUES ($1, $2, $3)
      RETURNING
        id,
        name,
        email,
        created_at
    `,
    [name, email, passwordHash],
  );

  return result.rows[0];
}

export async function loginUser({
  email,
  password,
}: LoginUserInput) {
  const result = await pool.query(
    `
      SELECT
        id,
        name,
        email,
        password_hash,
        created_at
      FROM public.users
      WHERE email = $1
    `,
    [email],
  );

  const user = result.rows[0];

  // Unknown emails and Google-only accounts still pay for one argon2
  // verify, so response time doesn't reveal which emails have accounts.
  if (!user || !user.password_hash) {
    await argon2.verify(await getDummyHash(), password);
    return null;
  }

  const passwordIsValid = await argon2.verify(
    user.password_hash,
    password,
  );

  if (!passwordIsValid) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    created_at: user.created_at,
  };
}

export async function findUserByEmail(
  email: string,
) {
  const result = await pool.query(
    `
      SELECT
        id,
        name,
        email,
        created_at
      FROM public.users
      WHERE email = $1
    `,
    [email],
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

/*
 * Called when Google has just proven the person owns this account's email.
 *
 * Password signups never verify their email, so an attacker could register
 * victim@gmail.com first and wait for the real owner to sign in with Google
 * into an account whose password the attacker knows. If the email was never
 * verified, the unproven password is removed and every existing session is
 * revoked; the owner can set a new password with "Forgot password".
 */
export async function claimAccountWithVerifiedEmail(
  userId: string,
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `
        SELECT password_hash, email_verified_at
        FROM public.users
        WHERE id = $1
        FOR UPDATE
      `,
      [userId],
    );

    const user = result.rows[0];

    if (user && user.email_verified_at === null) {
      if (user.password_hash) {
        await client.query(
          `
            UPDATE public.auth_sessions
            SET revoked_at = NOW()
            WHERE user_id = $1
              AND revoked_at IS NULL
          `,
          [userId],
        );
      }

      await client.query(
        `
          UPDATE public.users
          SET
            password_hash = NULL,
            email_verified_at = NOW(),
            updated_at = NOW()
          WHERE id = $1
        `,
        [userId],
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function createGoogleUser({
  name,
  email,
}: {
  name: string;
  email: string;
}) {
  const result = await pool.query(
    `
      INSERT INTO public.users (
        name,
        email,
        password_hash,
        email_verified_at
      )
      VALUES ($1, $2, NULL, NOW())
      RETURNING
        id,
        name,
        email,
        created_at
    `,
    [name, email],
  );

  return result.rows[0];
}

export async function changePassword({
  userId,
  currentPassword,
  newPassword,
}: {
  userId: string;
  currentPassword: string;
  newPassword: string;
}) {
  const result = await pool.query(
    `
      SELECT password_hash
      FROM public.users
      WHERE id = $1
    `,
    [userId],
  );

  if (result.rows.length === 0) {
    return {
      success: false,
      reason: "user_not_found",
    } as const;
  }

  const user = result.rows[0];

  // Google-only accounts do not have a password
  // to verify for the current-password flow.
  if (!user.password_hash) {
    return {
      success: false,
      reason: "password_not_set",
    } as const;
  }

  const currentPasswordIsValid =
    await argon2.verify(
      user.password_hash,
      currentPassword,
    );

  if (!currentPasswordIsValid) {
    return {
      success: false,
      reason: "invalid_current_password",
    } as const;
  }

  const newPasswordHash = await argon2.hash(
    newPassword,
    {
      type: argon2.argon2id,
    },
  );

  const updateResult = await pool.query(
    `
      UPDATE public.users
      SET
        password_hash = $1,
        updated_at = NOW()
      WHERE id = $2
      RETURNING id
    `,
    [newPasswordHash, userId],
  );

  if (updateResult.rows.length === 0) {
    return {
      success: false,
      reason: "user_not_found",
    } as const;
  }

  return {
    success: true,
  } as const;
}