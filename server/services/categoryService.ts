import { pool } from "../db.js";

export async function getCategories(userId: string) {
  const result = await pool.query(
    `
      SELECT
        id,
        name,
        kind,
        is_default,
        is_active
      FROM public.categories
      WHERE user_id = $1
        AND is_active = true
      ORDER BY
        kind ASC,
        name ASC
    `,
    [userId]
  );

  return result.rows;
}