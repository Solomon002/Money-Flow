import { pool } from "../db.js";
import { createNotification } from "./notificationService.js";

type CreateGoalInput = {
  userId: string;
  name: string;
  targetAmountMinor: number;
  currentAmountMinor: number;
  targetDate: string | null;
  description: string | null;
};

type UpdateGoalInput = {
  userId: string;
  goalId: string;
  name: string;
  targetAmountMinor: number;
  targetDate: string | null;
  description: string | null;
  status: "active" | "completed" | "paused" | "archived";
};

export async function createGoal({
  userId,
  name,
  targetAmountMinor,
  currentAmountMinor,
  targetDate,
  description,
}: CreateGoalInput) {
  const result = await pool.query(
    `
      INSERT INTO public.goals (
        user_id,
        name,
        target_amount_minor,
        current_amount_minor,
        target_date,
        description
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING
        id,
        user_id,
        name,
        target_amount_minor,
        current_amount_minor,
        target_date,
        description,
        status,
        created_at,
        updated_at
    `,
    [
      userId,
      name,
      targetAmountMinor,
      currentAmountMinor,
      targetDate,
      description,
    ],
  );

  return result.rows[0];
}

export async function getGoals(userId: string) {
  const result = await pool.query(
    `
      SELECT
        id,
        user_id,
        name,
        target_amount_minor,
        current_amount_minor,
        target_date,
        description,
        status,
        created_at,
        updated_at
      FROM public.goals
      WHERE user_id = $1
      ORDER BY
        CASE
          WHEN status = 'active' THEN 1
          WHEN status = 'paused' THEN 2
          WHEN status = 'completed' THEN 3
          ELSE 4
        END,
        target_date ASC NULLS LAST,
        created_at DESC
    `,
    [userId],
  );

  return result.rows;
}

export async function updateGoal({
  userId,
  goalId,
  name,
  targetAmountMinor,
  targetDate,
  description,
  status,
}: UpdateGoalInput) {
  const existingGoal = await pool.query(
    `
      SELECT
        current_amount_minor
      FROM public.goals
      WHERE id = $1
        AND user_id = $2
    `,
    [goalId, userId],
  );

  if (existingGoal.rows.length === 0) {
    return null;
  }

  const currentAmountMinor = Number(
    existingGoal.rows[0].current_amount_minor,
  );

  if (
    status === "completed" &&
    currentAmountMinor < targetAmountMinor
  ) {
    const error = new Error(
      "A goal can only be marked as completed when the current amount reaches the target amount.",
    );

    (error as Error & { code?: string }).code =
      "GOAL_NOT_COMPLETED";

    throw error;
  }

  const result = await pool.query(
    `
      UPDATE public.goals
      SET
        name = $1,
        target_amount_minor = $2,
        target_date = $3,
        description = $4,
        status = $5,
        updated_at = NOW()
      WHERE id = $6
        AND user_id = $7
      RETURNING
        id,
        user_id,
        name,
        target_amount_minor,
        current_amount_minor,
        target_date,
        description,
        status,
        created_at,
        updated_at
    `,
    [
      name,
      targetAmountMinor,
      targetDate,
      description,
      status,
      goalId,
      userId,
    ],
  );

  return result.rows[0] || null;
}

export async function addMoneyToGoal(
  userId: string,
  goalId: string,
  amountMinor: number,
) {
  const existingGoal = await pool.query(
    `
      SELECT
        id,
        name,
        current_amount_minor,
        target_amount_minor,
        status
      FROM public.goals
      WHERE id = $1
        AND user_id = $2
    `,
    [goalId, userId],
  );

  if (existingGoal.rows.length === 0) {
    return null;
  }

  const currentGoal = existingGoal.rows[0];

  const currentAmountMinor = Number(
    currentGoal.current_amount_minor,
  );

  const targetAmountMinor = Number(
    currentGoal.target_amount_minor,
  );

  const newAmountMinor =
    currentAmountMinor + amountMinor;

  const shouldComplete =
    newAmountMinor >= targetAmountMinor;

  const wasAlreadyCompleted =
    currentGoal.status === "completed";

  const result = await pool.query(
    `
      UPDATE public.goals
      SET
        current_amount_minor = current_amount_minor + $1,
        status = CASE
          WHEN current_amount_minor + $1 >= target_amount_minor
            THEN 'completed'
          ELSE status
        END,
        updated_at = NOW()
      WHERE id = $2
        AND user_id = $3
      RETURNING
        id,
        user_id,
        name,
        target_amount_minor,
        current_amount_minor,
        target_date,
        description,
        status,
        created_at,
        updated_at
    `,
    [amountMinor, goalId, userId],
  );

  const goal = result.rows[0] || null;

  if (
    goal &&
    shouldComplete &&
    !wasAlreadyCompleted
  ) {
    try {
      const targetAmount = targetAmountMinor / 100;

      const formatter = new Intl.NumberFormat(
        "en-NG",
        {
          style: "currency",
          currency: "NGN",
          maximumFractionDigits: 2,
        },
      );

      const formattedTarget = formatter.format(
        targetAmount,
      );

      await createNotification({
        userId,
        type: "goal_completed",
        title: "🎉 Goal completed!",
        message:
          `Congratulations! You've reached your ` +
          `${formattedTarget} ${goal.name} goal. ` +
          `Great job staying on track!`,
        goalId: goal.id,
      });
    } catch (error) {
      console.error(
        "Creating goal completion notification failed:",
        error,
      );
    }
  }

  return goal;
}

export async function deleteGoal(
  userId: string,
  goalId: string,
) {
  const result = await pool.query(
    `
      DELETE FROM public.goals
      WHERE id = $1
        AND user_id = $2
      RETURNING id
    `,
    [goalId, userId],
  );

  return result.rows[0] || null;
}