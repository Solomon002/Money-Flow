import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
} from "../api/auth.js";
import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  saveAuthTokens,
} from "../api/authStorage.js";
import { getOnboardingPreferences } from "../api/onboarding.js";
import type { AuthUser, LoginInput } from "../api/auth.js";

/*
 * ⚠️  CRITICAL INVARIANT — DO NOT BREAK
 *
 * This provider has a subtle race condition that historically caused
 * direct navigation to any /app/* route (e.g. /app/pro?reference=...) to
 * be silently redirected to /app. The bug was:
 *
 *   1. On mount, `user` is null and `onboardingLoading` starts true.
 *   2. The `useEffect([user])` below ran with `user = null` and set
 *      `onboardingLoading = false` immediately.
 *   3. Between the session restore completing and
 *      `loadOnboardingPreferences()` running, guards saw the state as
 *      "authenticated user with no onboarding preferences" and rendered
 *      <Navigate to="/onboarding" replace />.
 *   4. `OnboardingAccessGuard` then saw the (already-loaded) preferences
 *      and rendered <Navigate to="/app" replace />, discarding the
 *      original URL — including Paystack's ?reference=... parameter.
 *
 * The fix, which must be preserved:
 *
 *   - `onboardingLoading` MUST stay true until preferences are actually
 *     fetched for the authenticated user.
 *   - The `useEffect([user])` below MUST NOT set `onboardingLoading` to
 *     false when `user` is null.
 *   - `restoreSession()` is the only place that may set
 *     `onboardingLoading` to false during the "no token" path.
 *
 * If you refactor this file, verify that navigating directly to
 * /app/pro?reference=TEST still renders ProPage with the reference intact
 * and does NOT redirect to /app or /onboarding.
 */

export type OnboardingPreferences = {
  user_id: string;
  currency_code: string;
  income_source: string;
  monthly_income_minor: number | null;
  financial_objective: string;
  created_at: string;
  updated_at: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  onboardingPreferences: OnboardingPreferences | null;
  onboardingLoading: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const [onboardingPreferences, setOnboardingPreferences] =
    useState<OnboardingPreferences | null>(null);

  const [onboardingLoading, setOnboardingLoading] = useState(true);

  const [isLoading, setIsLoading] = useState(true);

  const initializationPromise = useRef<Promise<void> | null>(null);

  useEffect(() => {
    initializeAuth();
  }, []);

  useEffect(() => {
    if (!user) {
      setOnboardingPreferences(null);
      // ⚠️  Do NOT set onboardingLoading to false here — see invariant above.
      return;
    }

    loadOnboardingPreferences();
  }, [user]);

  async function loadOnboardingPreferences() {
    setOnboardingLoading(true);

    try {
      const result = await getOnboardingPreferences();

      if (result.response.ok) {
        setOnboardingPreferences(result.data.preferences);
        return;
      }

      if (result.response.status === 404) {
        setOnboardingPreferences(null);
        return;
      }

      console.error("Unable to load onboarding preferences:", result.data);
    } catch (error) {
      console.error("Loading onboarding preferences failed:", error);
    } finally {
      setOnboardingLoading(false);
    }
  }

  async function initializeAuth() {
    if (initializationPromise.current) {
      return initializationPromise.current;
    }

    initializationPromise.current = restoreSession();

    try {
      await initializationPromise.current;
    } finally {
      initializationPromise.current = null;
    }
  }

  async function restoreSession() {
    setIsLoading(true);

    const accessToken = getAccessToken();
    const refreshToken = getRefreshToken();

    if (!accessToken || !refreshToken) {
      setUser(null);
      setOnboardingLoading(false);
      setIsLoading(false);
      return;
    }

    try {
      const currentUserResult = await getCurrentUser(accessToken);

      if (currentUserResult.response.ok) {
        setUser(currentUserResult.data.user);
        return;
      }

      const latestRefreshToken = getRefreshToken();

      if (!latestRefreshToken) {
        setUser(null);
        return;
      }

      const refreshResult = await refreshAccessToken(latestRefreshToken);

      if (!refreshResult.response.ok) {
        clearAuthTokens();
        setUser(null);
        return;
      }

      const newAccessToken = refreshResult.data.accessToken;

      if (!newAccessToken) {
        clearAuthTokens();
        setUser(null);
        return;
      }

      saveAuthTokens(newAccessToken, latestRefreshToken);

      const refreshedUserResult = await getCurrentUser(newAccessToken);

      if (refreshedUserResult.response.ok) {
        setUser(refreshedUserResult.data.user);
        return;
      }

      clearAuthTokens();
      setUser(null);
    } catch (error) {
      console.error("Authentication initialization failed:", error);

      clearAuthTokens();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(input: LoginInput) {
    const result = await loginUser(input);

    if (!result.response.ok) {
      throw new Error(result.data.message || "Unable to log in");
    }

    if (
      !result.data.accessToken ||
      !result.data.refreshToken ||
      !result.data.user
    ) {
      throw new Error("Login response is missing authentication data");
    }

    saveAuthTokens(result.data.accessToken, result.data.refreshToken);

    setUser(result.data.user);
  }

  async function logout() {
    const refreshToken = getRefreshToken();

    try {
      if (refreshToken) {
        await logoutUser(refreshToken);
      }
    } finally {
      clearAuthTokens();
      setUser(null);
      setOnboardingPreferences(null);
      setOnboardingLoading(false);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        onboardingPreferences,
        onboardingLoading,
        isLoading,
        isAuthenticated: user !== null,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
