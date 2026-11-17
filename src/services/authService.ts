import { apiRequest, setAuthToken } from "@/src/services/apiClient";
import type {
  AuthTokens,
  LoginCredentials,
  RegisterPayload,
  User,
} from "@/src/types";

export const authService = {
  async login(
    credentials: LoginCredentials
  ): Promise<{ user: User; tokens: AuthTokens }> {
    const result = await apiRequest<{ user: User; access_token: string; token_type: string }>(
      "/api/v1/auth/login",
      {
        method: "POST",
        body: JSON.stringify(credentials),
      }
    );
    setAuthToken(result.access_token);
    return {
      user: result.user,
      tokens: {
        accessToken: result.access_token,
        tokenType: result.token_type || "bearer",
      },
    };
  },

  async register(
    payload: RegisterPayload
  ): Promise<{ user: User; tokens: AuthTokens }> {
    const result = await apiRequest<{ user: User; access_token: string; token_type: string }>(
      "/api/v1/auth/register",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
    setAuthToken(result.access_token);
    return {
      user: result.user,
      tokens: {
        accessToken: result.access_token,
        tokenType: result.token_type || "bearer",
      },
    };
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    return apiRequest<{ message: string }>("/api/v1/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  async getCurrentUser(): Promise<User> {
    return apiRequest<User>("/api/v1/auth/me");
  },

  async logout(): Promise<void> {
    try {
      await apiRequest<void>("/api/v1/auth/logout", { method: "POST" });
    } finally {
      setAuthToken(null);
    }
  },
};
