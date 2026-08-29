"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Gamepad2, Trophy, Gift, Bot, TrendingUp, Zap } from "lucide-react";

interface UserProfile {
  user: {
    id: string;
    name: string;
    totalScore: number;
    totalGames: number;
    tokensEarned: number;
    level: number;
    xp: number;
  };
  agents: Array<{ id: string; name: string; status: string }>;
  recentRewards: Array<{ id: string; amount: number; token: string; type: string }>;
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) return;
    fetch("/api/user/profile", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setProfile(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    { label: "Total Score", value: profile?.user.totalScore?.toLocaleString() || "0", icon: TrendingUp, color: "#00FF88" },
    { label: "Games Played", value: profile?.user.totalGames?.toString() || "0", icon: Gamepad2, color: "#A855F7" },
    { label: "Tokens Earned", value: profile?.user.tokensEarned?.toLocaleString() || "0", icon: Gift, color: "#FFD700" },
    { label: "Active Agents", value: profile?.agents?.length?.toString() || "0", icon: Bot, color: "#00FF88" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-gray-400">Welcome back, {profile?.user.name || "Player"}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-sm">{stat.label}</span>
              <stat.icon size={18} style={{ color: stat.color }} />
            </div>
            <p className="text-2xl font-bold text-white">{loading ? "..." : stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Zap size={18} className="text-[#00FF88]" />
            Quick Play
          </h3>
          <p className="text-gray-400 text-sm mb-4">
            Jump into a game and start earning tokens
          </p>
          <Link
            href="/dashboard/games"
            className="inline-flex items-center gap-2 bg-[#00FF88] text-black font-semibold px-4 py-2 rounded-lg hover:bg-[#00FF88]/90 transition-colors"
          >
            <Gamepad2 size={16} />
            Browse Games
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Trophy size={18} className="text-[#FFD700]" />
            Leaderboard
          </h3>
          <p className="text-gray-400 text-sm mb-4">
            See who&apos;s dominating the arcade
          </p>
          <Link
            href="/dashboard/leaderboard"
            className="inline-flex items-center gap-2 bg-[#A855F7] text-white font-semibold px-4 py-2 rounded-lg hover:bg-[#A855F7]/90 transition-colors"
          >
            <Trophy size={16} />
            View Rankings
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
