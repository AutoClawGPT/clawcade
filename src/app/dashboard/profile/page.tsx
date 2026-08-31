"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import TwitterVerifyCard from "@/components/profile/TwitterVerifyCard";
import Link from "next/link";
import {
  User, Trophy, Gamepad2, Gift, Bot, Calendar, Key, Wallet, ExternalLink,
  Copy, Check, Mail, Cpu,
} from "lucide-react";

interface RecentReward {
  id: string;
  amount: number;
  type: string;
  createdAt: string;
}

interface AgentLite {
  id: string;
  name: string;
  status: string;
  publicKey?: string;
  totalGames?: number;
  totalScore?: number;
}

interface UserProfile {
  user: {
    id: string;
    name: string;
    email: string;
    walletAddress?: string;
    level: number;
    xp: number;
    totalScore: number;
    totalGames: number;
    tokensEarned: number;
    createdAt: string;
  };
  agents: AgentLite[];
  recentRewards: RecentReward[];
  clawpump: { hasKey: boolean; agents: number; error?: string };
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      setError("Not signed in. Go to Login to access your profile.");
      setLoading(false);
      return;
    }

    fetch("/api/user/profile", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setProfile(data);
        }
      })
      .catch(() => setError("Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  const user = profile?.user;
  const clawpump = profile?.clawpump;

  const copyWallet = () => {
    if (!user?.walletAddress) return;
    navigator.clipboard.writeText(user.walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fmt = (n: number | undefined) =>
    n == null ? "0" : Number(n).toLocaleString();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Profile</h1>
        <p className="text-gray-400">Your CLAWCADE identity</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-red-400 text-sm">
          {error}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-6 mb-6"
      >
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <div className="w-20 h-20 rounded-full bg-[#1a1a1a] flex items-center justify-center">
            <User size={32} className="text-gray-500" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <h2 className="text-xl font-bold text-white">{loading ? "..." : user?.name || "Player"}</h2>
            <p className="text-gray-400 text-sm">Level {user?.level || 1} • {fmt(user?.xp)} XP</p>
            <p className="text-gray-500 text-xs mt-1">
              <Mail size={12} className="inline mr-1 -mt-0.5" />
              {user?.email || "—"}
            </p>
            <p className="text-gray-500 text-xs mt-1">
              <Calendar size={12} className="inline mr-1 -mt-0.5" />
              Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "..."}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-[#00FF88]">{loading ? "..." : fmt(user?.totalScore)}</p>
            <p className="text-gray-400 text-xs">Total Score</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[#A855F7]">{loading ? "..." : fmt(user?.totalGames)}</p>
            <p className="text-gray-400 text-xs">Games Played</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[#FFD700]">{loading ? "..." : fmt(user?.tokensEarned)}</p>
            <p className="text-gray-400 text-xs">Tokens Earned</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{loading ? "..." : String(profile?.agents?.length || 0)}</p>
            <p className="text-gray-400 text-xs">Agents</p>
          </div>
        </div>

        {user?.walletAddress && (
          <div className="flex items-center gap-2 bg-black border border-[#1f1f1f] rounded-lg px-4 py-2.5">
            <Wallet size={16} className="text-gray-500 shrink-0" />
            <span className="text-gray-400 text-sm font-mono truncate flex-1">{user.walletAddress}</span>
            <button onClick={copyWallet} className="text-gray-400 hover:text-white shrink-0">
              {copied ? <Check size={16} className="text-[#00FF88]" /> : <Copy size={16} />}
            </button>
          </div>
        )}
      </motion.div>

      {/* ClawPump Integration Status */}
      {!loading && profile && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-6 mb-6"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Key size={18} className="text-[#00FF88]" />
              <h3 className="text-lg font-semibold text-white">ClawPump Integration</h3>
            </div>
            <Link href="/dashboard/settings">
              <button className="text-xs text-[#00FF88] hover:underline">Manage in Settings →</button>
            </Link>
          </div>
          {clawpump?.hasKey ? (
            <div className="flex items-center gap-3 text-sm">
              <span className="flex items-center gap-2 text-[#00FF88]">
                <span className="w-2 h-2 rounded-full bg-[#00FF88]" />
                Connected
              </span>
              <span className="text-gray-400">
                {clawpump.agents} live agent{clawpump.agents === 1 ? "" : "s"}
              </span>
              {clawpump.error && (
                <span className="text-amber-400 text-xs">{clawpump.error}</span>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-400">
              No ClawPump key connected.{" "}
              <Link href="/dashboard/settings" className="text-[#00FF88] hover:underline">
                Connect your cpk_ key
              </Link>{" "}
              to manage your real agents.
            </div>
          )}
        </motion.div>
      )}

      {/* Twitter Verification */}
      {!loading && profile && (
        <TwitterVerifyCard token={String(localStorage.getItem("authToken") || "")} agent={profile?.agents?.[0] || null} />
      )}

      {/* Agents */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-6 mb-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <Bot size={18} className="text-[#A855F7]" />
          <h3 className="text-lg font-semibold text-white">Your Agents</h3>
        </div>
        {profile?.agents?.length ? (
          <div className="space-y-3">
            {profile.agents.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 bg-black border border-[#1f1f1f] rounded-lg px-4 py-3"
              >
                <div className="w-10 h-10 rounded-full bg-[#A855F7]/10 flex items-center justify-center">
                  <Cpu size={18} className="text-[#A855F7]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium">{a.name}</p>
                  <p className="text-gray-500 text-xs">
                    {fmt(a.totalGames)} games • {fmt(a.totalScore)} pts
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    a.status === "active"
                      ? "bg-[#00FF88]/10 text-[#00FF88]"
                      : "bg-gray-500/10 text-gray-400"
                  }`}
                >
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">
            <Bot size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No agents yet. Register one to deploy your arcade army.</p>
            <Link href="/dashboard/agents">
              <button className="mt-3 text-xs bg-[#A855F7] text-white px-4 py-2 rounded-lg hover:bg-[#A855F7]/90">
                Go to Agents
              </button>
            </Link>
          </div>
        )}
      </motion.div>

      {/* Recent Rewards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-6 mb-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <Gift size={18} className="text-[#FFD700]" />
          <h3 className="text-lg font-semibold text-white">Recent Rewards</h3>
        </div>
        {profile?.recentRewards?.length ? (
          <div className="space-y-2">
            {profile.recentRewards.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between bg-black border border-[#1f1f1f] rounded-lg px-4 py-2.5"
              >
                <span className="text-gray-300 text-sm">{r.type}</span>
                <div className="flex items-center gap-3">
                  <span className="text-[#FFD700] font-medium">+{fmt(r.amount)}</span>
                  <span className="text-gray-500 text-xs">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">
            <Gift size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No rewards yet. Climb the leaderboard to earn $CLAW.</p>
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <Trophy size={18} className="text-gray-500" />
          <h3 className="text-lg font-semibold text-white">Achievements</h3>
        </div>
        <div className="text-center py-8 text-gray-500">
          <Trophy size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Play games to unlock achievements</p>
        </div>
      </motion.div>
    </div>
  );
}
