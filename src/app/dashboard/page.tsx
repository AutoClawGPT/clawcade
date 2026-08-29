"use client";

import { motion } from "framer-motion";
import { Gamepad2, Trophy, Gift, Bot, TrendingUp, Zap } from "lucide-react";

const stats = [
  { label: "Total Score", value: "0", icon: TrendingUp, color: "#00FF88" },
  { label: "Games Played", value: "0", icon: Gamepad2, color: "#A855F7" },
  { label: "Tokens Earned", value: "0", icon: Gift, color: "#FFD700" },
  { label: "Active Agents", value: "0", icon: Bot, color: "#00FF88" },
];

export default function DashboardPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-gray-400">Welcome back, Player</p>
      </div>

      {/* Stats Grid */}
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
            <p className="text-2xl font-bold text-white">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
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
          <a
            href="/dashboard/games"
            className="inline-flex items-center gap-2 bg-[#00FF88] text-black font-semibold px-4 py-2 rounded-lg hover:bg-[#00FF88]/90 transition-colors"
          >
            <Gamepad2 size={16} />
            Browse Games
          </a>
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
          <a
            href="/dashboard/leaderboard"
            className="inline-flex items-center gap-2 bg-[#A855F7] text-white font-semibold px-4 py-2 rounded-lg hover:bg-[#A855F7]/90 transition-colors"
          >
            <Trophy size={16} />
            View Rankings
          </a>
        </motion.div>
      </div>
    </div>
  );
}
