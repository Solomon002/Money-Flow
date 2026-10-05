import { pool } from "../db.js";

type UpdateSettingsInput = {
  userId: string;
  name: string;
  email: string;
  currencyCode: string;
  incomeSource: string | null;
  monthlyIncomeMinor: number | null;
  monthlySavingsTargetMinor: number | null;
  financialObjective: string | null;
  appearance: "light" | "dark" | "system";
  budgetAlertsEnabled: boolean;
  goalRemindersEnabled: boolean;
  monthlyInsightsEnabled: boolean;
  recurringRemindersEnabled: boolean;
};

export async function getSettings(userId: string) {
  const result = await pool.query(
    `
      SELECT
        u.id,
        u.name,
        u.email,
        u.created_at,

        fp.currency_code,
        fp.income_source,
        fp.monthly_income_minor,
        fp.monthly_savings_target_minor,
        fp.financial_objective,
        fp.appearance,
        fp.budget_alerts_enabled,
        fp.goal_reminders_enabled,
        fp.monthly_insights_enabled,
        fp.recurring_reminders_enabled,

        (
          EXISTS (
            SELECT 1
            FROM public.transactions t
            WHERE t.user_id = u.id
          )
          OR
          EXISTS (
            SELECT 1
            FROM public.budgets b
            WHERE b.user_id = u.id
          )
          OR
          EXISTS (
            SELECT 1
            FROM public.goals g
            WHERE g.user_id = u.id
          )
          OR
          EXISTS (
            SELECT 1
            FROM public.recurring_transactions rt
            WHERE rt.user_id = u.id
          )
        ) AS has_financial_records

      FROM public.users u

      INNER JOIN public.financial_preferences fp
        ON fp.user_id = u.id

      WHERE u.id = $1
    `,
    [userId],
  );

  return result.rows[0] || null;
}

export async function updateSettings({
  userId,
  name,
  email,
  currencyCode,
  incomeSource,
  monthlyIncomeMinor,
  monthlySavingsTargetMinor,
  financialObjective,
  appearance,
  budgetAlertsEnabled,
  goalRemindersEnabled,
  monthlyInsightsEnabled,
  recurringRemindersEnabled,
}: UpdateSettingsInput) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const userResult = await client.query(
      `
        UPDATE public.users
        SET
          name = $1,
          email = $2,
          updated_at = NOW()
        WHERE id = $3
        RETURNING
          id,
          name,
          email,
          created_at
      `,
      [name, email, userId],
    );

    if (userResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    await client.query(
      `
        UPDATE public.financial_preferences
        SET
          currency_code = $1,
          income_source = $2,
          monthly_income_minor = $3,
          monthly_savings_target_minor = $4,
          financial_objective = $5,
          appearance = $6,
          budget_alerts_enabled = $7,
          goal_reminders_enabled = $8,
          monthly_insights_enabled = $9,
          recurring_reminders_enabled = $10,
          updated_at = NOW()
        WHERE user_id = $11
      `,
      [
        currencyCode,
        incomeSource,
        monthlyIncomeMinor,
        monthlySavingsTargetMinor,
        financialObjective,
        appearance,
        budgetAlertsEnabled,
        goalRemindersEnabled,
        monthlyInsightsEnabled,
        recurringRemindersEnabled,
        userId,
      ],
    );

    await client.query("COMMIT");

    return await getSettings(userId);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}