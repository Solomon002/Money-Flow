import argon2 from "argon2";
import { pool } from "../db.js";

/*
 * Everything MoneyFlow stores about one user, for "Download my data"
 * (right of access / portability). Secrets are excluded: password hash,
 * session and reset token hashes.
 */
export async function exportUserData(userId: string) {
  const query = async (sql: string) =>
    (await pool.query(sql, [userId])).rows;

  const [user] = await query(`
    SELECT id, name, email, created_at, updated_at, email_verified_at,
           terms_accepted_at, terms_version
    FROM public.users WHERE id = $1
  `);

  if (!user) {
    return null;
  }

  return {
    exportedAt: new Date().toISOString(),
    account: user,
    preferences: (await query(`SELECT * FROM public.financial_preferences WHERE user_id = $1`))[0] ?? null,
    categories: await query(`SELECT id, name, kind, parent_id, is_default, is_active, created_at FROM public.categories WHERE user_id = $1 ORDER BY created_at`),
    transactions: await query(`SELECT id, category_id, type, amount_minor, description, transaction_date, notes, created_at FROM public.transactions WHERE user_id = $1 ORDER BY transaction_date, created_at`),
    budgets: await query(`SELECT id, category_id, monthly_amount_minor, month, year, created_at FROM public.budgets WHERE user_id = $1 ORDER BY year, month`),
    goals: await query(`SELECT id, name, target_amount_minor, current_amount_minor, target_date, description, status, created_at FROM public.goals WHERE user_id = $1 ORDER BY created_at`),
    notifications: await query(`SELECT id, type, title, message, read_at, created_at FROM public.notifications WHERE user_id = $1 ORDER BY created_at`),
    coachChats: await query(`
      SELECT c.id, c.title, c.created_at,
             COALESCE(json_agg(json_build_object('role', m.role, 'content', m.content, 'created_at', m.created_at) ORDER BY m.created_at) FILTER (WHERE m.id IS NOT NULL), '[]') AS messages
      FROM public.coach_chats c
      LEFT JOIN public.coach_messages m ON m.chat_id = c.id
      WHERE c.user_id = $1
      GROUP BY c.id
      ORDER BY c.created_at
    `),
    subscription: (await query(`SELECT plan, status, provider, current_period_start, current_period_end, created_at FROM public.subscriptions WHERE user_id = $1`))[0] ?? null,
    payments: await query(`SELECT amount_minor, currency, status, provider, provider_reference, channel, paid_at FROM public.subscription_payments WHERE user_id = $1 ORDER BY paid_at`),
  };
}

export type DeleteAccountResult =
  | "deleted"
  | "not_found"
  | "password_incorrect"
  | "confirmation_incorrect";

/*
 * Permanently deletes the account. Every table references users with
 * ON DELETE CASCADE, so one delete removes all of the user's data.
 *
 * Password accounts must re-enter their password; Google-only accounts
 * (no password) must type their email address instead.
 */
export async function deleteAccount({
  userId,
  password,
  confirmEmail,
}: {
  userId: string;
  password: unknown;
  confirmEmail: unknown;
}): Promise<DeleteAccountResult> {
  const result = await pool.query(
    `SELECT email, password_hash FROM public.users WHERE id = $1`,
    [userId],
  );

  const user = result.rows[0];

  if (!user) {
    return "not_found";
  }

  if (user.password_hash) {
    if (
      typeof password !== "string" ||
      password.length === 0 ||
      password.length > 256 ||
      !(await argon2.verify(user.password_hash, password))
    ) {
      return "password_incorrect";
    }
  } else if (
    typeof confirmEmail !== "string" ||
    confirmEmail.trim().toLowerCase() !== user.email.toLowerCase()
  ) {
    return "confirmation_incorrect";
  }

  await pool.query(`DELETE FROM public.users WHERE id = $1`, [userId]);

  return "deleted";
}

export async function hasPassword(userId: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT password_hash IS NOT NULL AS has_password FROM public.users WHERE id = $1`,
    [userId],
  );

  return Boolean(result.rows[0]?.has_password);
}
