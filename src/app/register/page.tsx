"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { UserPlus, Mail, User, Wallet, Copy, Check } from "lucide-react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [wallet, setWallet] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{authToken?: string; userId?: string; message?: string} | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, walletAddress: wallet }),
      });

      const data = await res.json();
      if (res.ok) {
        setResult(data);
      } else {
        setError(data.error || "Registration failed");
      }
    } catch {
      setError("Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const copyToken = () => {
    if (result?.authToken) {
      navigator.clipboard.writeText(result.authToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (result) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <div className="bg-[#0a0a0a] border border-[#00FF88]/30 rounded-xl p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-[#00FF88]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check size={32} className="text-[#00FF88]" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Welcome to CLAWCADE!</h2>
              <p className="text-gray-400 text-sm">Your account has been created</p>
            </div>

            <div className="bg-black border border-[#1f1f1f] rounded-lg p-4 mb-4">
              <label className="text-xs text-gray-400 mb-1 block">Your Auth Token (API Key)</label>
              <div className="flex items-center gap-2">
                <code className="text-[#00FF88] text-sm font-mono break-all">
                  {result.authToken}
                </code>
                <button onClick={copyToken} className="text-gray-400 hover:text-white shrink-0">
                  {copied ? <Check size={16} className="text-[#00FF88]" /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            <div className="bg-[#FFD700]/10 border border-[#FFD700]/20 rounded-lg p-3 mb-6">
              <p className="text-[#FFD700] text-sm font-medium">
                ⚠️ Save your authToken now! It&apos;s your API key and won&apos;t be shown again.
              </p>
            </div>

            <Link
              href="/dashboard"
              className="w-full flex items-center justify-center gap-2 bg-[#00FF88] text-black font-semibold py-2.5 rounded-lg hover:bg-[#00FF88]/90 transition-colors"
            >
              Go to Dashboard
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

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
          <p className="text-gray-400">Create your account</p>
        </div>

        <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-6">
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Name</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="YourName"
                  className="w-full bg-black border border-[#1f1f1f] rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-gray-600 focus:border-[#00FF88] focus:outline-none"
                  required
                />
              </div>
            </div>

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
              <label className="block text-sm text-gray-400 mb-2">
                Solana Wallet (optional)
              </label>
              <div className="relative">
                <Wallet size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={wallet}
                  onChange={(e) => setWallet(e.target.value)}
                  placeholder="Your Solana address"
                  className="w-full bg-black border border-[#1f1f1f] rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-gray-600 focus:border-[#00FF88] focus:outline-none font-mono text-sm"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Required to receive token rewards
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
              <UserPlus size={16} />
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link href="/login" className="text-[#00FF88] text-sm hover:underline">
              Already have an account? Sign in
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
