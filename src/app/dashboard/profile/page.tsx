"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Trophy, Gamepad2, Gift, Bot, Calendar } from "lucide-react";

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
  agents: Array<{ id: string; name: string; status: string }>;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) { setLoading(false); return; }

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

  const user = profile?.user;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Profile</h1>
        <p className="text-gray-400">Your CLAWCADE identity</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-6 mb-6"
      >
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 rounded-full bg-[#1a1a1a] flex items-center justify-center">
            <User size={32} className="text-gray-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{loading ? "..." : user?.name || "Player"}</h2>
            <p className="text-gray-400 text-sm">Level {user?.level || 1} • {user?.xp || 0} XP</p>
            <p className="text-gray-500 text-xs mt-1">
              Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "..."}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-[#00FF88]">{loading ? "..." : (user?.totalScore?.toLocaleString() || "0")}</p>
            <p className="text-gray-400 text-xs">Total Score</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[#A855F7]">{loading ? "..." : (user?.totalGames?.toString() || "0")}</p>
            <p className="text-gray-400 text-xs">Games Played</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[#FFD700]">{loading ? "..." : (user?.tokensEarned?.toLocaleString() || "0")}</p>
            <p className="text-gray-400 text-xs">Tokens Earned</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{loading ? "..." : (profile?.agents?.length?.toString() || "0")}</p>
            <p className="text-gray-400 text-xs">Agents</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-4">Achievements</h3>
        <div className="text-center py-8 text-gray-500">
          <Trophy size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Play games to unlock achievements</p>
        </div>
      </motion.div>
    </div>
  );
}
