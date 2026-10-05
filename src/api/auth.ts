import { apiRequest } from './client.js';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  created_at: string;
};

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type AuthResponse = {
  status: string;
  message: string;
  user?: AuthUser;
  accessToken?: string;
  refreshToken?: string;
  session?: {
    id: string;
    expiresAt: string;
  };
};

export async function registerUser(
  input: RegisterInput
) {
  return apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function loginUser(
  input: LoginInput
) {
  return apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function refreshAccessToken(
  refreshToken: string
) {
  return apiRequest('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({
      refreshToken,
    }),
  });
}

export async function logoutUser(
  refreshToken: string
) {
  return apiRequest('/api/auth/logout', {
    method: 'POST',
    body: JSON.stringify({
      refreshToken,
    }),
  });
}

export async function getCurrentUser(
  accessToken: string
) {
  return apiRequest('/api/auth/me', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function requestPasswordReset(
  email: string
) {
  return apiRequest('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({
      email,
    }),
  });
}

export async function resetPassword(
  token: string,
  newPassword: string
) {
  return apiRequest('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({
      token,
      newPassword,
    }),
  });
}

export function getGoogleSignInUrl() {
  const apiBaseUrl =
    import.meta.env.VITE_API_BASE_URL ||
    'http://localhost:5000';

  return `${apiBaseUrl}/api/auth/google`;
}

export async function exchangeGoogleAuthCode(
  code: string,
) {
  return apiRequest("/api/auth/google/exchange", {
    method: "POST",
    body: JSON.stringify({
      code,
    }),
  });
}