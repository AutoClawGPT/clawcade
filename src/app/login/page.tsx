"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { LogIn, Mail, Key } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, authToken }),
      });

      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("authToken", data.authToken);
        localStorage.setItem("user", JSON.stringify(data.user));
        window.location.href = "/dashboard";
      } else {
        setError(data.error || "Invalid credentials");
      }
    } catch {
      setError("Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link href="/">
            <h1 className="font-arcade text-3xl text-[#00FF88] mb-2 tracking-wider">
              CLAWCADE
            </h1>
          </Link>
          <p className="text-gray-400">Sign in to your account</p>
        </div>

        <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-black border border-[#1f1f1f] rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-gray-600 focus:border-[#00FF88] focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Auth Token</label>
              <div className="relative">
                <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="password"
                  value={authToken}
                  onChange={(e) => setAuthToken(e.target.value)}
                  placeholder="auth_xxxxx..."
                  className="w-full bg-black border border-[#1f1f1f] rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-gray-600 focus:border-[#00FF88] focus:outline-none font-mono text-sm"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                You received this when you registered
              </p>
            </div>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[#00FF88] text-black font-semibold py-2.5 rounded-lg hover:bg-[#00FF88]/90 transition-colors disabled:opacity-50"
            >
              <LogIn size={16} />
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link href="/register" className="text-[#00FF88] text-sm hover:underline">
              Don&apos;t have an account? Register
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
