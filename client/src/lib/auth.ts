import { apiUrl } from "./config";

const TOKEN_KEY = "techmart_jwt_token";

export interface AuthUser {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  created_at: string;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const token = getToken();
  if (!token) return null;

  try {
    const res = await fetch(apiUrl("/auth/me"), {
      headers: {
        ...getAuthHeaders(),
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        removeToken();
      }
      return null;
    }

    return await res.json();
  } catch {
    return null;
  }
}

export async function loginUser(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
  const res = await fetch(apiUrl("/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Login failed" }));
    throw new Error(err.detail || `Login failed with status ${res.status}`);
  }

  const data = await res.json();
  setToken(data.access_token);

  const user = await fetchCurrentUser();
  if (!user) {
    throw new Error("Could not retrieve user profile after login");
  }

  return { token: data.access_token, user };
}

export async function registerUser(
  email: string,
  password: string,
  fullName?: string
): Promise<{ user: AuthUser; token: string }> {
  const res = await fetch(apiUrl("/auth/register"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      full_name: fullName || null,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Registration failed" }));
    throw new Error(err.detail || `Registration failed with status ${res.status}`);
  }

  // Automatically log in after registration
  return loginUser(email, password);
}
