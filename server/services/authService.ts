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

  if (result.rows.length === 0) {
    return null;
  }

  const user = result.rows[0];

  // Google-only accounts do not have a password.
  if (!user.password_hash) {
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
        password_hash
      )
      VALUES ($1, $2, NULL)
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