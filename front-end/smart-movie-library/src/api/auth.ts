import type { User } from "../types";

// Use VITE_API_URL directly - it should be the full base URL (e.g., http://localhost:8000)
// Don't append /api since FastAPI routes are at root level (/auth/login, not /api/auth/login)
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface TokenResponse {
  access_token: string;
  token_type: string;
}

/**
 * Auth API - matches FastAPI backend with OAuth2PasswordRequestForm
 */
export const authApi = {
  /**
   * Login - sends form-urlencoded data as FastAPI expects
   */
  login: async (email: string, password: string): Promise<{ token: string; user: User }> => {
    const formBody = new URLSearchParams();
    formBody.set("username", email);
    formBody.set("password", password);

    const url = `${API_BASE}/auth/login`;

    let tokenResponse: Response;
    try {
      tokenResponse = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formBody,
      });
    } catch (networkError) {
      console.error("[Auth] Network error:", networkError);
      throw new Error("Cannot connect to server");
    }

    const responseText = await tokenResponse.text();
    
    if (!tokenResponse.ok) {
      let errorMessage = "Invalid email or password";
      if (responseText) {
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch {
          errorMessage = responseText || errorMessage;
        }
      }
      throw new Error(errorMessage);
    }

    const tokenData: TokenResponse = JSON.parse(responseText);
    
    if (!tokenData.access_token) {
      throw new Error("No access token received");
    }

    const token = tokenData.access_token;
    localStorage.setItem("token", token);

    const user = await authApi.getMe();
    
    return { token, user };
  },

  /**
   * Register a new user
   */
  register: async (name: string, email: string, password: string): Promise<{ token: string; user: User }> => {
    const url = `${API_BASE}/auth/register`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
    } catch (networkError) {
      console.error("[Auth] Network error:", networkError);
      throw new Error("Cannot connect to server");
    }

    const responseText = await response.text();

    if (!response.ok) {
      let errorMessage = "Registration failed";
      if (responseText) {
        try {
          const errorData = JSON.parse(responseText);
          if (typeof errorData.detail === "string") {
            errorMessage = errorData.detail;
          } else if (Array.isArray(errorData.detail)) {
            errorMessage = (errorData.detail as { msg: string }[]).map(d => d.msg).join(", ");
          }
        } catch {
          errorMessage = responseText;
        }
      }
      throw new Error(errorMessage);
    }

    // After registration, log the user in
    return authApi.login(email, password);
  },

  /**
   * Get current user profile
   */
  getMe: async (): Promise<User> => {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("Not authenticated");

    const url = `${API_BASE}/auth/me`;

    const response = await fetch(url, {
      headers: { "Authorization": `Bearer ${token}` },
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        throw new Error("Session expired");
      }
      throw new Error("Failed to get user profile");
    }

    const user: User = await response.json();
    return user;
  },

  logout: async (): Promise<void> => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  },

  isAuthenticated: (): boolean => !!localStorage.getItem("token"),
  getToken: (): string | null => localStorage.getItem("token"),
};