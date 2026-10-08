import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
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
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import advancedReportRoutes from "./routes/advancedReportRoutes.js";
import paystackWebhookRoutes from "./routes/paystackWebhookRoutes.js";

const app = express();
const PORT = Number(process.env.PORT) || 5000;

// Trust the first hop in front of the app (Render, Fly, Vercel, Cloudflare,
// nginx, etc.) so req.ip and rate limiting see the real client IP.
app.set("trust proxy", 1);

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

// General API rate limit: 300 requests per 15 min per IP.
// Auth endpoints have their own stricter limits via rateLimitMiddleware.ts.
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "error",
    message: "Too many requests. Please try again later.",
  },
});

// Stricter limit for subscription initialize: 5 per 15 min per IP.
// Prevents an attacker from spamming Paystack checkout creation.
const initializeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "error",
    message: "Too many checkout attempts. Please try again later.",
  },
});

// Webhook MUST be mounted before express.json() so its raw body is intact.
app.use(
  "/api/subscription/webhook",
  express.raw({
    type: "application/json",
    limit: "100kb",
  }),
  paystackWebhookRoutes,
);

app.use(
  express.json({
    limit: "100kb",
  }),
);

app.use("/api/subscription/initialize", initializeLimiter);

// General limit for everything under /api.
app.use("/api", generalLimiter);

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
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/advanced-reports", advancedReportRoutes);

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

// Final error handler: catches malformed JSON, unhandled errors.
// Never leaks stack traces to the client.
app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error("Unhandled error:", err);

    return res.status(500).json({
      status: "error",
      message: "Something went wrong",
    });
  },
);

app.listen(PORT, () => {
  console.log(`MoneyFlow backend running on http://localhost:${PORT}`);
});

export default app;