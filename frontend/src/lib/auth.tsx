"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "./api";
import { User } from "./types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  async function refreshUser() {
    try {
      const u = await api.get<User>("/api/auth/me");
      setUser(u);
      localStorage.setItem("car_inventory_user", JSON.stringify(u));
    } catch {
      localStorage.removeItem("car_inventory_token");
      localStorage.removeItem("car_inventory_user");
      setUser(null);
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("car_inventory_token");
    const stored = localStorage.getItem("car_inventory_user");
    if (token) {
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch {}
      }
      refreshUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  async function login(username: string, password: string) {
    const res = await api.post<{ token: string; user: User }>("/api/auth/login", {
      username,
      password,
    });
    localStorage.setItem("car_inventory_token", res.token);
    localStorage.setItem("car_inventory_user", JSON.stringify(res.user));
    setUser(res.user);
    window.location.href = "/dashboard";
  }

  function logout() {
    localStorage.removeItem("car_inventory_token");
    localStorage.removeItem("car_inventory_user");
    setUser(null);
    window.location.href = "/login";
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
