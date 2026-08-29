"use client";

import { motion } from "framer-motion";
import { BarChart3, TrendingUp, Gamepad2, Trophy, Gift } from "lucide-react";

export default function AnalyticsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Analytics</h1>
        <p className="text-gray-400">Track your performance and earnings</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-[#00FF88]" />
            <h3 className="text-lg font-semibold text-white">Score Trend</h3>
          </div>
          <div className="h-48 flex items-center justify-center text-gray-500">
            <p className="text-sm">Play games to see your score trend</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Gamepad2 size={18} className="text-[#A855F7]" />
            <h3 className="text-lg font-semibold text-white">Games Played</h3>
          </div>
          <div className="h-48 flex items-center justify-center text-gray-500">
            <p className="text-sm">Play games to see your activity</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Trophy size={18} className="text-[#FFD700]" />
            <h3 className="text-lg font-semibold text-white">Rank History</h3>
          </div>
          <div className="h-48 flex items-center justify-center text-gray-500">
            <p className="text-sm">Play games to track your rank</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Gift size={18} className="text-[#00FF88]" />
            <h3 className="text-lg font-semibold text-white">Earnings</h3>
          </div>
          <div className="h-48 flex items-center justify-center text-gray-500">
            <p className="text-sm">Earn tokens to see your earnings chart</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
