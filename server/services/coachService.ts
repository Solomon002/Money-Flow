import { GoogleGenAI } from "@google/genai";
import { pool } from "../db.js";

export type CoachMessage = {
  role: "user" | "assistant";
  content: string;
};

type FinancialContext = {
  userName: string;
  currencyCode: string;
  currentMonth: string;
  previousMonth: string;
  currentDate: string;
  currentTime: string;
  timezone: string;

  currentMonthIncome: number;
  currentMonthExpenses: number;
  previousMonthIncome: number;
  previousMonthExpenses: number;

  expenseCategories: Array<{
    category: string;
    amount: number;
  }>;

  budgets: Array<{
    category: string;
    budget: number;
    spent: number;
    remaining: number;
    percentageUsed: number;
  }>;

  goals: Array<{
    name: string;
    targetAmount: number;
    currentAmount: number;
    remainingAmount: number;
    targetDate: string | null;
    status: string;
  }>;

  recentTransactions: Array<{
    type: string;
    amount: number;
    category: string;
    description: string | null;
    date: string;
  }>;
};

function getGeminiApiKey(): string {
  const apiKey =
    process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not defined",
    );
  }

  return apiKey;
}

function getModel(): string {
  return (
    process.env.GEMINI_MODEL ||
    "gemini-3.8-flash"
  );
}

function formatMonth(
  date: Date,
): string {
  return date.toLocaleDateString(
    "en-NG",
    {
      month: "long",
      year: "numeric",
      timeZone: "Africa/Lagos",
    },
  );
}

function getMonthRange(
  offset: number,
) {
  const now = new Date();

  const start = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth() + offset,
      1,
    ),
  );

  const end = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth() +
        offset +
        1,
      1,
    ),
  );

  return {
    start,
    end,
  };
}

async function buildFinancialContext(
  userId: string,
): Promise<FinancialContext> {
  const now = new Date();

  const currentDate =
    now.toLocaleDateString("en-NG", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "Africa/Lagos",
    });

  const currentTime =
    now.toLocaleTimeString("en-NG", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Africa/Lagos",
    });

  const currentMonthRange =
    getMonthRange(0);

  const previousMonthRange =
    getMonthRange(-1);

  const userResult =
    await pool.query(
      `
        SELECT
          u.name,
          fp.currency_code
        FROM public.users u
        INNER JOIN public.financial_preferences fp
          ON fp.user_id = u.id
        WHERE u.id = $1
      `,
      [userId],
    );

  if (userResult.rows.length === 0) {
    throw new Error(
      "User financial profile not found",
    );
  }

  const user =
    userResult.rows[0];

  const currentTotalsResult =
    await pool.query(
      `
        SELECT
          COALESCE(
            SUM(
              CASE
                WHEN type = 'income'
                THEN amount_minor
                ELSE 0
              END
            ),
            0
          ) AS income,

          COALESCE(
            SUM(
              CASE
                WHEN type = 'expense'
                THEN amount_minor
                ELSE 0
              END
            ),
            0
          ) AS expenses

        FROM public.transactions

        WHERE user_id = $1
          AND transaction_date >= $2
          AND transaction_date < $3
      `,
      [
        userId,
        currentMonthRange.start,
        currentMonthRange.end,
      ],
    );

  const previousTotalsResult =
    await pool.query(
      `
        SELECT
          COALESCE(
            SUM(
              CASE
                WHEN type = 'income'
                THEN amount_minor
                ELSE 0
              END
            ),
            0
          ) AS income,

          COALESCE(
            SUM(
              CASE
                WHEN type = 'expense'
                THEN amount_minor
                ELSE 0
              END
            ),
            0
          ) AS expenses

        FROM public.transactions

        WHERE user_id = $1
          AND transaction_date >= $2
          AND transaction_date < $3
      `,
      [
        userId,
        previousMonthRange.start,
        previousMonthRange.end,
      ],
    );

  const categoryResult =
    await pool.query(
      `
        SELECT
          c.name AS category,
          COALESCE(
            SUM(t.amount_minor),
            0
          ) AS amount

        FROM public.transactions t

        INNER JOIN public.categories c
          ON c.id = t.category_id

        WHERE t.user_id = $1
          AND t.type = 'expense'
          AND t.transaction_date >= $2
          AND t.transaction_date < $3

        GROUP BY c.name

        ORDER BY amount DESC
      `,
      [
        userId,
        currentMonthRange.start,
        currentMonthRange.end,
      ],
    );

  const budgetResult =
    await pool.query(
      `
        SELECT
          c.name AS category,
          b.monthly_amount_minor AS budget,

          COALESCE(
            (
              SELECT SUM(t.amount_minor)
              FROM public.transactions t
              WHERE t.user_id = b.user_id
                AND t.category_id = b.category_id
                AND t.type = 'expense'
                AND t.transaction_date >= $2
                AND t.transaction_date < $3
            ),
            0
          ) AS spent

        FROM public.budgets b

        INNER JOIN public.categories c
          ON c.id = b.category_id

        WHERE b.user_id = $1
          AND b.year =
            EXTRACT(
              YEAR FROM $2::date
            )
          AND b.month =
            EXTRACT(
              MONTH FROM $2::date
            )

        ORDER BY c.name
      `,
      [
        userId,
        currentMonthRange.start,
        currentMonthRange.end,
      ],
    );

  const goalResult =
    await pool.query(
      `
        SELECT
          name,
          target_amount_minor,
          current_amount_minor,
          target_date,
          status

        FROM public.goals

        WHERE user_id = $1
          AND status IN (
            'active',
            'completed',
            'paused'
          )

        ORDER BY target_date ASC NULLS LAST
      `,
      [userId],
    );

  const recentTransactionsResult =
    await pool.query(
      `
        SELECT
          t.type,
          t.amount_minor,
          c.name AS category,
          t.description,
          t.transaction_date

        FROM public.transactions t

        INNER JOIN public.categories c
          ON c.id = t.category_id

        WHERE t.user_id = $1

        ORDER BY
          t.transaction_date DESC,
          t.created_at DESC

        LIMIT 15
      `,
      [userId],
    );

  const toMoney = (
    value: number | string,
  ) =>
    Number(value) / 100;

  return {
    userName: user.name,
    currencyCode:
      user.currency_code,
    currentMonth:
      formatMonth(
        currentMonthRange.start,
      ),
    previousMonth:
      formatMonth(
        previousMonthRange.start,
      ),
    currentDate,
    currentTime,
    timezone: "Africa/Lagos",

    currentMonthIncome:
      toMoney(
        currentTotalsResult.rows[0]
          .income,
      ),

    currentMonthExpenses:
      toMoney(
        currentTotalsResult.rows[0]
          .expenses,
      ),

    previousMonthIncome:
      toMoney(
        previousTotalsResult.rows[0]
          .income,
      ),

    previousMonthExpenses:
      toMoney(
        previousTotalsResult.rows[0]
          .expenses,
      ),

    expenseCategories:
      categoryResult.rows.map(
        (row) => ({
          category:
            row.category,
          amount:
            toMoney(row.amount),
        }),
      ),

    budgets:
      budgetResult.rows.map(
        (row) => {
          const budget =
            toMoney(
              row.budget,
            );

          const spent =
            toMoney(
              row.spent,
            );

          return {
            category:
              row.category,
            budget,
            spent,
            remaining:
              budget - spent,
            percentageUsed:
              budget > 0
                ? (spent / budget) *
                  100
                : 0,
          };
        },
      ),

    goals:
      goalResult.rows.map(
        (row) => {
          const targetAmount =
            toMoney(
              row.target_amount_minor,
            );

          const currentAmount =
            toMoney(
              row.current_amount_minor,
            );

          return {
            name: row.name,
            targetAmount,
            currentAmount,
            remainingAmount:
              Math.max(
                targetAmount -
                  currentAmount,
                0,
              ),
            targetDate:
              row.target_date,
            status:
              row.status,
          };
        },
      ),

    recentTransactions:
      recentTransactionsResult.rows.map(
        (row) => ({
          type: row.type,
          amount:
            toMoney(
              row.amount_minor,
            ),
          category:
            row.category,
          description:
            row.description,
          date:
            row.transaction_date,
        }),
      ),
  };
}

function buildSystemInstruction(
  financialData: FinancialContext,
): string {
  return `
You are MoneyFlow Coach, the AI financial assistant inside the MoneyFlow personal finance application.

You are having a natural conversation with the user. You are not a scripted chatbot.

The user's name is ${financialData.userName}.
Their currency is ${financialData.currencyCode}.

CURRENT DATE AND TIME:
Date: ${financialData.currentDate}
Time: ${financialData.currentTime}
Timezone: ${financialData.timezone}

Use this date and time when answering questions about today, yesterday, tomorrow, this week, this month, or relative dates.

Do not say that you do not know the current date or time when the information above is provided.

FINANCIAL DATA:

${JSON.stringify(
  financialData,
  null,
  2,
)}

IMPORTANT RULES:

1. Use the financial data above as the source of truth for the user's MoneyFlow financial information.

2. Never invent transactions, income, expenses, budgets, goals, balances, or other financial facts.

3. If the requested information is not available in the data, clearly say that it is not available.

4. Be conversational and natural.

5. Remember previous messages in the conversation and understand follow-up questions and pronouns.

6. Use the user's name naturally when appropriate.

7. Use the user's currency when discussing money.

8. When comparing spending, calculate from the provided financial data.

9. When discussing whether the user can afford something, explain the relevant financial position, spending, budget, savings goals, and trade-offs. Do not simply make the decision for the user.

10. You are an AI financial assistant, not a human financial adviser.

11. Keep responses reasonably concise unless the user asks for more detail.

12. If the user asks a general conversational question that does not require financial data, answer naturally.

13. If the user asks about their finances, use their actual MoneyFlow data.

14. If the user asks for advice, provide useful financial reasoning while making clear that the final decision belongs to the user.
`;
}

function buildConversationInput(
  conversation: CoachMessage[],
  question: string,
) {
  const input = conversation
    .slice(-12)
    .map((message) => {
      if (
        message.role === "user"
      ) {
        return {
          type: "user_input" as const,
          content: [
            {
              type: "text" as const,
              text: message.content,
            },
          ],
        };
      }

      return {
        type: "model_output" as const,
        content: [
          {
            type: "text" as const,
            text: message.content,
          },
        ],
      };
    });

  input.push({
    type: "user_input" as const,
    content: [
      {
        type: "text" as const,
        text: question,
      },
    ],
  });

  return input;
}

export async function askMoneyFlowCoach(
  userId: string,
  question: string,
  conversation: CoachMessage[] = [],
) {
  const ai = new GoogleGenAI({
    apiKey: getGeminiApiKey(),
  });

  const financialData =
    await buildFinancialContext(
      userId,
    );

  const systemInstruction =
    buildSystemInstruction(
      financialData,
    );

  const input =
    buildConversationInput(
      conversation,
      question,
    );

  const interaction =
    await ai.interactions.create({
      model: getModel(),
      system_instruction:
        systemInstruction,
      input,
      store: false,
    });

  return {
    answer:
      interaction.output_text,
    context: {
      currencyCode:
        financialData.currencyCode,
      currentMonth:
        financialData.currentMonth,
      previousMonth:
        financialData.previousMonth,
    },
  };
}