import { Router } from "express";
import { Resend } from "resend";
import { pool } from "../db.js";

const router = Router();

const resendApiKey = process.env.RESEND_API_KEY;
const feedbackEmail = process.env.FEEDBACK_EMAIL;

const resend = resendApiKey
  ? new Resend(resendApiKey)
  : null;

router.post("/", async (req, res) => {
  try {
    const {
      feedbackType,
      feedback,
      email,
    } = req.body;

    if (
      typeof feedbackType !== "string" ||
      feedbackType.trim().length === 0
    ) {
      return res.status(400).json({
        status: "error",
        message: "Feedback type is required",
      });
    }

    if (
      typeof feedback !== "string" ||
      feedback.trim().length === 0
    ) {
      return res.status(400).json({
        status: "error",
        message: "Feedback is required",
      });
    }

    if (
      feedback.trim().length < 5
    ) {
      return res.status(400).json({
        status: "error",
        message: "Feedback is too short",
      });
    }

    if (
      email !== undefined &&
      email !== null &&
      email !== ""
    ) {
      if (
        typeof email !== "string" ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          email.trim(),
        )
      ) {
        return res.status(400).json({
          status: "error",
          message: "Invalid email address",
        });
      }
    }

    const cleanFeedbackType =
      feedbackType.trim();

    const cleanFeedback =
      feedback.trim();

    const cleanEmail =
      typeof email === "string" &&
      email.trim().length > 0
        ? email.trim().toLowerCase()
        : null;

    await pool.query(
      `
        INSERT INTO feedback (
          feedback_type,
          feedback,
          email
        )
        VALUES ($1, $2, $3)
      `,
      [
        cleanFeedbackType,
        cleanFeedback,
        cleanEmail,
      ],
    );

    if (resend && feedbackEmail) {
      const emailResult =
        await resend.emails.send({
          from:
            "MoneyFlow Feedback <onboarding@resend.dev>",
          to: feedbackEmail,
          subject:
            `MoneyFlow Feedback — ${cleanFeedbackType}`,
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
              <h2>New MoneyFlow Feedback</h2>

              <p>
                <strong>Type:</strong>
                ${cleanFeedbackType}
              </p>

              <p>
                <strong>Email:</strong>
                ${cleanEmail ?? "Not provided"}
              </p>

              <p>
                <strong>Feedback:</strong>
              </p>

              <div style="
                padding: 16px;
                background: #f8fafc;
                border-radius: 8px;
                white-space: pre-wrap;
              ">
                ${cleanFeedback}
              </div>

              <p style="color: #64748b; font-size: 13px;">
                Submitted through the MoneyFlow landing page.
              </p>
            </div>
          `,
        });

      if (emailResult.error) {
        console.error(
          "Sending feedback email failed:",
          emailResult.error,
        );
      }
    }

    return res.status(201).json({
      status: "success",
      message:
        "Thank you for your feedback",
    });
  } catch (error) {
    console.error(
      "Submitting feedback failed:",
      error,
    );

    return res.status(500).json({
      status: "error",
      message:
        "Unable to submit feedback",
    });
  }
});

export default router;