"use client";

import { useState, useEffect, useCallback } from "react";

interface User {
  id: string;
  email: string;
  name: string;
  walletAddress?: string;
  role: string;
  level: number;
  xp: number;
  totalScore: number;
  totalGames: number;
  tokensEarned: number;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const userData = localStorage.getItem("user");
    if (token && userData) {
      setAuthToken(token);
      try {
        setUser(JSON.parse(userData));
      } catch {}
    }
    setLoading(false);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    setUser(null);
    setAuthToken(null);
    window.location.href = "/login";
  }, []);

  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}) => {
    if (!authToken) throw new Error("Not authenticated");
    return fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
        ...options.headers,
      },
    });
  }, [authToken]);

  return { user, authToken, loading, logout, fetchWithAuth, isAuthenticated: !!authToken };
}
