import { pool } from '../db.js';

type SaveOnboardingInput = {
  userId: string;
  currencyCode: string;
  incomeSource: string;
  monthlyIncomeMinor: number | null;
  financialObjective: string;
};

export async function saveOnboardingPreferences({
  userId,
  currencyCode,
  incomeSource,
  monthlyIncomeMinor,
  financialObjective,
}: SaveOnboardingInput) {
  const result = await pool.query(
    `
      INSERT INTO public.financial_preferences (
        user_id,
        currency_code,
        income_source,
        monthly_income_minor,
        financial_objective
      )
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id)
      DO UPDATE SET
        currency_code = EXCLUDED.currency_code,
        income_source = EXCLUDED.income_source,
        monthly_income_minor = EXCLUDED.monthly_income_minor,
        financial_objective = EXCLUDED.financial_objective,
        updated_at = NOW()
      RETURNING
        user_id,
        currency_code,
        income_source,
        monthly_income_minor,
        financial_objective,
        created_at,
        updated_at
    `,
    [
      userId,
      currencyCode,
      incomeSource,
      monthlyIncomeMinor,
      financialObjective,
    ]
  );

  return result.rows[0];
}

export async function getOnboardingPreferences(
  userId: string
) {
  const result = await pool.query(
    `
      SELECT
        user_id,
        currency_code,
        income_source,
        monthly_income_minor,
        financial_objective,
        created_at,
        updated_at
      FROM public.financial_preferences
      WHERE user_id = $1
        AND currency_code IS NOT NULL
        AND income_source IS NOT NULL
        AND financial_objective IS NOT NULL
    `,
    [userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}