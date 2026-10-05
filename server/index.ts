import express from "express";
import cors from "cors";
import helmet from "helmet";
import { pool } from "./db.js";

import authRoutes from "./routes/authRoutes.js";
import onboardingRoutes from "./routes/onboardingRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import budgetRoutes from "./routes/budgetRoutes.js";
import goalRoutes from "./routes/goalRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import insightRoutes from "./routes/insightRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import coachRoutes from "./routes/coachRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import feedbackRoutes from "./routes/feedbackRoutes.js";
import googleAuthRoutes from "./routes/googleAuthRoutes.js";

const app = express();
const PORT = 5000;

const allowedOrigins: string[] = [
  "http://localhost:5173",
  process.env.FRONTEND_URL,
].filter(
  (origin): origin is string => Boolean(origin),
);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  }),
);

app.use(
  express.json({
    limit: "100kb",
  }),
);

app.use("/api/auth", authRoutes);
app.use("/api/onboarding", onboardingRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/insights", insightRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/coach", coachRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/auth", googleAuthRoutes);

app.get("/api/health", async (_req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    return res.status(200).json({
      status: "ok",
      message: "MoneyFlow backend is running",
      databaseTime: result.rows[0].now,
    });
  } catch (error) {
    console.error("Database connection failed:", error);

    return res.status(500).json({
      status: "error",
      message: "Database connection failed",
    });
  }
});

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(
      `MoneyFlow backend running on http://localhost:${PORT}`,
    );
  });
}

export default app;