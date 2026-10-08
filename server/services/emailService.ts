import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;

const resend = resendApiKey ? new Resend(resendApiKey) : null;

const FROM_ADDRESS = "MoneyFlow <onboarding@resend.dev>";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail({
  to,
  subject,
  html,
}: SendEmailInput): Promise<boolean> {
  if (!resend) {
    console.warn(
      "Resend is not configured (RESEND_API_KEY missing). Email skipped.",
    );
    return false;
  }

  try {
    const result = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject,
      html,
    });

    if (result.error) {
      console.error("Resend returned an error:", result.error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Sending email failed:", error);
    return false;
  }
}