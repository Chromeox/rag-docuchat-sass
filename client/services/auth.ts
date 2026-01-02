import api from "./api";

export interface User {
  id: number;
  username: string;
  role: string;
}

export async function loginUser(username: string, password: string): Promise<User> {
  const res = await api.post("/auth/login", {
    username,
    password,
  });

  const { access_token, refresh_token, user } = res.data;

  if (typeof window !== "undefined") {
    localStorage.setItem("access_token", access_token);
    localStorage.setItem("refresh_token", refresh_token);
    localStorage.setItem("user", JSON.stringify(user));
  }

  return user;
}

export function getUser(): User | null {
  if (typeof window === "undefined") return null;
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

export function logoutUser() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user");
}
