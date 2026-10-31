import crypto from "crypto";
import { Router } from "express";
import { OAuth2Client } from "google-auth-library";

import {
  createGoogleUser,
  findUserByEmail,
} from "../services/authService.js";

import {
  createSession,
} from "../services/sessionService.js";

import {
  createGoogleAuthCode,
  exchangeGoogleAuthCode,
} from "../services/googleAuthService.js";

const router = Router();

const googleClientId =
  process.env.GOOGLE_CLIENT_ID;

const googleClientSecret =
  process.env.GOOGLE_CLIENT_SECRET;

const googleRedirectUri =
  process.env.GOOGLE_REDIRECT_URI ||
  "http://localhost:5000/api/auth/google/callback";

const frontendUrl =
  process.env.FRONTEND_URL ||
  "http://localhost:5173";

if (
  !googleClientId ||
  !googleClientSecret
) {
  console.warn(
    "Google OAuth environment variables are not configured.",
  );
}

const googleClient = new OAuth2Client(
  googleClientId,
  googleClientSecret,
  googleRedirectUri,
);

/*
 * OAuth `state` ties the Google callback to the browser that started
 * the sign-in, so an attacker cannot log a victim into the attacker's
 * account by sending them a callback URL with the attacker's code.
 */
const GOOGLE_STATE_COOKIE = "moneyflow_google_state";
const GOOGLE_STATE_MAX_AGE_MS = 10 * 60 * 1000;

function readCookie(
  cookieHeader: string | undefined,
  name: string,
): string | null {
  if (!cookieHeader) {
    return null;
  }

  for (const part of cookieHeader.split(";")) {
    const [key, ...rest] = part.trim().split("=");

    if (key === name) {
      return decodeURIComponent(rest.join("="));
    }
  }

  return null;
}

function statesMatch(
  expected: string | null,
  received: unknown,
): boolean {
  if (!expected || typeof received !== "string") {
    return false;
  }

  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);

  return (
    expectedBuffer.length === receivedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

router.get("/google", (_req, res) => {
  if (
    !googleClientId ||
    !googleClientSecret
  ) {
    return res.status(500).json({
      status: "error",
      message:
        "Google sign-in is not configured",
    });
  }

  const state = crypto.randomBytes(32).toString("hex");

  res.cookie(GOOGLE_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: GOOGLE_STATE_MAX_AGE_MS,
    path: "/api/auth/google",
  });

  const authorizationUrl =
    googleClient.generateAuthUrl({
      access_type: "offline",
      scope: [
        "openid",
        "email",
        "profile",
      ],
      prompt: "select_account",
      state,
    });

  return res.redirect(
    authorizationUrl,
  );
});

router.get(
  "/google/callback",
  async (req, res) => {
    try {
      const expectedState = readCookie(
        req.headers.cookie,
        GOOGLE_STATE_COOKIE,
      );

      res.clearCookie(GOOGLE_STATE_COOKIE, {
        path: "/api/auth/google",
      });

      if (!statesMatch(expectedState, req.query.state)) {
        return res.redirect(
          `${frontendUrl}/login?error=google_auth_failed`,
        );
      }

      const code =
        typeof req.query.code === "string"
          ? req.query.code
          : null;

      if (!code) {
        return res.redirect(
          `${frontendUrl}/login?error=google_auth_failed`,
        );
      }

      const { tokens } =
        await googleClient.getToken(code);

      if (!tokens.id_token) {
        return res.redirect(
          `${frontendUrl}/login?error=google_auth_failed`,
        );
      }

      const ticket =
        await googleClient.verifyIdToken({
          idToken: tokens.id_token,
          audience: googleClientId,
        });

      const payload =
        ticket.getPayload();

      if (!payload) {
        return res.redirect(
          `${frontendUrl}/login?error=google_auth_failed`,
        );
      }

      const googleEmail =
        payload.email
          ?.trim()
          .toLowerCase();

      const googleName =
        payload.name?.trim() ||
        payload.email?.split("@")[0] ||
        "MoneyFlow User";

      if (
        !googleEmail ||
        payload.email_verified !== true
      ) {
        return res.redirect(
          `${frontendUrl}/login?error=google_email_not_verified`,
        );
      }

      let user =
        await findUserByEmail(
          googleEmail,
        );

      if (!user) {
        user =
          await createGoogleUser({
            name: googleName,
            email: googleEmail,
          });
      }

      /*
       * Do NOT create the MoneyFlow session here.
       *
       * Instead, create a short-lived,
       * single-use exchange code.
       */
      const exchangeCode =
        await createGoogleAuthCode(
          user.id,
        );

      const params =
        new URLSearchParams({
          code: exchangeCode,
        });

      return res.redirect(
        `${frontendUrl}/auth/google/callback?${params.toString()}`,
      );
    } catch (error) {
      console.error(
        "Google authentication failed:",
        error,
      );

      return res.redirect(
        `${frontendUrl}/login?error=google_auth_failed`,
      );
    }
  },
);

router.post(
  "/google/exchange",
  async (req, res) => {
    try {
      const code =
        typeof req.body?.code === "string"
          ? req.body.code.trim()
          : "";

      if (!code) {
        return res.status(400).json({
          status: "error",
          message:
            "Google authentication code is required",
        });
      }

      const exchangeResult =
        await exchangeGoogleAuthCode(
          code,
        );

      if (!exchangeResult) {
        return res.status(401).json({
          status: "error",
          message:
            "Google authentication code is invalid or expired",
        });
      }

      const {
        session,
        accessToken,
        refreshToken,
      } = await createSession(
        exchangeResult.userId,
      );

      return res.json({
        status: "success",
        accessToken,
        refreshToken,
        session: {
          id: session.id,
          expiresAt: session.expires_at,
        },
      });
    } catch (error) {
      console.error(
        "Google authentication code exchange failed:",
        error,
      );

      return res.status(500).json({
        status: "error",
        message:
          "Unable to complete Google sign-in",
      });
    }
  },
);

export default router;