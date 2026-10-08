import { pool } from "../db.js";

export async function getCategories(userId: string) {
  const result = await pool.query(
    `
      SELECT
        id,
        name,
        kind,
        parent_id,
        is_default,
        is_active
      FROM public.categories
      WHERE user_id = $1
        AND is_active = true
      ORDER BY
        kind ASC,
        parent_id NULLS FIRST,
        name ASC
    `,
    [userId]
  );

  return result.rows;
}

export async function createCategory(
  userId: string,
  name: string,
  kind: "income" | "expense",
  parentId?: string | null
) {
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error("Category name is required");
  }

  if (trimmedName.length > 60) {
    throw new Error("Category name must be 60 characters or less");
  }

  if (parentId) {
    const parentResult = await pool.query(
      `
        SELECT
          id,
          kind,
          parent_id
        FROM public.categories
        WHERE id = $1
          AND user_id = $2
          AND is_active = true
        LIMIT 1
      `,
      [parentId, userId]
    );

    if (parentResult.rows.length === 0) {
      throw new Error("Parent category not found");
    }

    const parent = parentResult.rows[0];

    if (parent.kind !== kind) {
      throw new Error(
        "A subcategory must have the same type as its parent category"
      );
    }

    if (parent.parent_id !== null) {
      throw new Error("Subcategories cannot have their own subcategories");
    }
  }

  const duplicateResult = await pool.query(
    `
      SELECT id
      FROM public.categories
      WHERE user_id = $1
        AND LOWER(name) = LOWER($2)
        AND kind = $3
        AND (
          parent_id = $4
          OR (parent_id IS NULL AND $4::uuid IS NULL)
        )
        AND is_active = true
      LIMIT 1
    `,
    [userId, trimmedName, kind, parentId ?? null]
  );

  if (duplicateResult.rows.length > 0) {
    throw new Error("A category with this name already exists here");
  }

  const result = await pool.query(
    `
      INSERT INTO public.categories (
        user_id,
        name,
        kind,
        parent_id,
        is_default,
        is_active
      )
      VALUES ($1, $2, $3, $4, false, true)
      RETURNING
        id,
        name,
        kind,
        parent_id,
        is_default,
        is_active,
        created_at,
        updated_at
    `,
    [userId, trimmedName, kind, parentId ?? null]
  );

  return result.rows[0];
}