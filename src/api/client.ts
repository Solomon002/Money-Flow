import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  saveAuthTokens,
} from "./authStorage.js";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:5000";

// Auth endpoints never trigger an automatic token refresh.
const NO_REFRESH_PATHS = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/refresh",
  "/api/auth/logout",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/google/exchange",
];

// Shared so that concurrent 401s only trigger one refresh
// (refresh tokens are single-use and rotate on every refresh).
let refreshPromise: Promise<string | null> | null = null;

async function refreshTokens(): Promise<string | null> {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    return null;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/auth/refresh`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      },
    );

    const data = await response.json().catch(() => null);

    if (
      !response.ok ||
      typeof data?.accessToken !== "string" ||
      typeof data?.refreshToken !== "string"
    ) {
      clearAuthTokens();
      return null;
    }

    saveAuthTokens(data.accessToken, data.refreshToken);

    return data.accessToken;
  } catch {
    return null;
  }
}

export function refreshSession(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = refreshTokens().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

export async function apiRequest(
  path: string,
  options: RequestInit = {},
) {
  const send = (accessToken: string | null) => {
    const headers = new Headers(options.headers);

    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    if (accessToken) {
      headers.set(
        "Authorization",
        `Bearer ${accessToken}`,
      );
    }

    return fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  };

  const explicitAuthorization = new Headers(
    options.headers,
  )
    .get("Authorization")
    ?.replace(/^Bearer\s+/, "");

  let response = await send(
    explicitAuthorization || getAccessToken(),
  );

  if (
    response.status === 401 &&
    !NO_REFRESH_PATHS.includes(path) &&
    getRefreshToken()
  ) {
    const newAccessToken = await refreshSession();

    if (newAccessToken) {
      response = await send(newAccessToken);
    }
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.message ||
        "Something went wrong. Please try again.",
    );
  }

  return {
    response,
    data,
  };
}
