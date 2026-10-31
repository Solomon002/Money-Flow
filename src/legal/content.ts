/*
 * DRAFT legal text. Written to match how MoneyFlow actually works, but it
 * must be reviewed by a lawyer before launch. Replace every [PLACEHOLDER].
 *
 * Bump the version (and LEGAL_VERSION in server/utils/legal.ts)
 * whenever the meaning changes, so new acceptances are recorded.
 */

export const LEGAL_VERSION = "2026-11-01";
export const LAST_UPDATED = "1 November 2026";

export const COMPANY = "[COMPANY LEGAL NAME]";
export const CONTACT_EMAIL = "[privacy@your-domain.com]";

export type LegalSection = {
  heading: string;
  paragraphs: string[];
};

export const PRIVACY_POLICY: LegalSection[] = [
  {
    heading: "Who we are",
    paragraphs: [
      `MoneyFlow is operated by ${COMPANY} ("we", "us"). We are the data controller for the personal data described in this policy. You can contact us about privacy at ${CONTACT_EMAIL}.`,
    ],
  },
  {
    heading: "What we collect",
    paragraphs: [
      "Account details: your name, email address, and a password hash (we never store your password itself; it is hashed with argon2id and a unique random salt). If you sign in with Google we receive your name and verified email address from Google.",
      "Financial information you enter or import: transactions, categories, budgets, goals, income source, monthly income and savings targets, currency and preferences. When you import a bank statement, the file is read in your browser and only the transactions you choose to import are sent to us.",
      "MoneyFlow Coach conversations: the questions you ask and the answers you receive.",
      "Subscription and payment records: plan, status, dates, amount, currency, payment channel and the Paystack transaction reference. Card and bank details are handled by Paystack; we never receive or store them.",
      "Feedback you send us, and your email address if you choose to include it.",
      "Technical data: IP address and request information used for security and rate limiting, and items stored in your browser (sign-in tokens and your language choice).",
    ],
  },
  {
    heading: "How we use it",
    paragraphs: [
      "To provide the service: showing your dashboard, reports, budgets, goals, insights and notifications (performance of our contract with you).",
      "To answer MoneyFlow Coach questions: when you use the Coach, a summary of your MoneyFlow financial data and your recent conversation is sent to our AI provider to generate an answer.",
      "To process MoneyFlow Pro payments and manage your subscription.",
      "To keep MoneyFlow secure: preventing fraud, abuse and unauthorized access (our legitimate interests).",
      "To send service emails such as password resets and subscription reminders.",
      "We do not sell your personal data and we do not use it for advertising.",
    ],
  },
  {
    heading: "Who we share it with",
    paragraphs: [
      "We share data only with service providers that process it on our behalf: our hosting and database providers [NAME THEM, e.g. Vercel and your database host]; Google (Google sign-in, and the Gemini API for MoneyFlow Coach); Paystack (payments); and Resend (sending emails).",
      "These providers may process data outside your country, including in the United States. Where required, we rely on appropriate safeguards such as standard contractual clauses.",
      "We may disclose information if required by law or to protect the rights and safety of our users.",
    ],
  },
  {
    heading: "How long we keep it",
    paragraphs: [
      "We keep your data while your account is open. When you delete your account, your profile, financial data, Coach conversations and notifications are deleted from our database immediately. Backups are overwritten within [BACKUP RETENTION, e.g. 30 days].",
      "[CONFIRM WITH YOUR ACCOUNTANT: whether payment records must be retained for tax purposes after account deletion.]",
    ],
  },
  {
    heading: "Your rights",
    paragraphs: [
      "You can access and download your data (Settings → Download my data), correct it in the app, and delete your account at any time (Settings → Delete account).",
      "Depending on where you live (for example under the GDPR in the EU/UK or the Nigeria Data Protection Act 2023), you may also have the right to object to or restrict processing, and to complain to your data protection authority.",
      `To exercise any right, contact ${CONTACT_EMAIL}.`,
    ],
  },
  {
    heading: "Security",
    paragraphs: [
      "We use encryption in transit (HTTPS), hashed passwords, short-lived sign-in tokens, rate limiting and access controls so that each account can only reach its own data. No system is perfectly secure; please use a strong, unique password.",
    ],
  },
  {
    heading: "Children",
    paragraphs: [
      "MoneyFlow is not intended for anyone under 18, and we do not knowingly collect data from children.",
    ],
  },
  {
    heading: "Changes",
    paragraphs: [
      "If we make important changes to this policy we will tell you in the app or by email before they take effect.",
    ],
  },
];

export const TERMS_OF_SERVICE: LegalSection[] = [
  {
    heading: "Agreement",
    paragraphs: [
      `These terms are an agreement between you and ${COMPANY}. By creating an account or using MoneyFlow you agree to them and to our Privacy Policy. You must be at least 18 years old.`,
    ],
  },
  {
    heading: "What MoneyFlow is",
    paragraphs: [
      "MoneyFlow is a personal finance tracking and planning tool. It does not hold, move or invest your money, and it is not a bank, payment service or investment service.",
      "Information in MoneyFlow, including reports, insights, forecasts and MoneyFlow Coach answers, is for general information only and is not financial, investment, tax or legal advice. Decisions about your money are yours.",
      "MoneyFlow Coach uses artificial intelligence and can be wrong. Check important information before relying on it.",
    ],
  },
  {
    heading: "Your account",
    paragraphs: [
      "Keep your password private and tell us immediately if you think someone else has accessed your account. You are responsible for the information you enter and import.",
      "Do not misuse MoneyFlow: no attempts to access other users' data, to disrupt or overload the service, to bypass payment or usage limits, or to use MoneyFlow for anything illegal.",
    ],
  },
  {
    heading: "MoneyFlow Pro",
    paragraphs: [
      "MoneyFlow Pro is a paid plan billed in advance for 30-day periods through Paystack. Prices are shown before you pay. A Pro period starts when your payment is confirmed; paying again before it ends adds another 30 days.",
      "You can cancel at any time in Settings. You keep Pro until the end of the period you paid for, and it is not renewed afterwards.",
      "[REFUND POLICY: state whether and when refunds are given, and how to request one.]",
      "We may change Pro features or prices for future periods; we will tell you before a price change affects you.",
    ],
  },
  {
    heading: "Availability and changes",
    paragraphs: [
      "We work to keep MoneyFlow available and your data safe, but the service is provided \"as is\" and may occasionally be unavailable. We may change or discontinue features, and will give reasonable notice of significant changes.",
    ],
  },
  {
    heading: "Ending your account",
    paragraphs: [
      "You can delete your account at any time in Settings. We may suspend or close accounts that break these terms, and will tell you why unless the law prevents us.",
    ],
  },
  {
    heading: "Liability",
    paragraphs: [
      "To the extent the law allows, we are not liable for indirect or consequential losses, or for financial decisions you make based on information in MoneyFlow. Our total liability to you is limited to the amount you paid us in the 12 months before the claim. Nothing in these terms limits rights you have under consumer protection law that cannot be excluded.",
    ],
  },
  {
    heading: "Law and contact",
    paragraphs: [
      "These terms are governed by the laws of [JURISDICTION, e.g. the Federal Republic of Nigeria]. If you live in the EU/UK you also keep the protection of the mandatory consumer laws of your country.",
      `Questions about these terms: ${CONTACT_EMAIL}.`,
    ],
  },
];
