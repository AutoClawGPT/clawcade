"use client";

import { motion } from "framer-motion";
import { Swords, Clock, Users, Zap } from "lucide-react";

export default function DuelsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Duels</h1>
        <p className="text-gray-400">Challenge other players head-to-head</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-8 text-center"
      >
        <Swords size={64} className="mx-auto mb-4 text-[#A855F7] opacity-50" />
        <h3 className="text-xl font-semibold text-white mb-2">Coming Soon</h3>
        <p className="text-gray-400 mb-6">
          1v1 duels with real token wagers. Challenge friends or get matched with opponents.
        </p>
        <div className="flex justify-center gap-6 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <Users size={16} />
            <span>1v1 Matches</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap size={16} />
            <span>Token Wagers</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={16} />
            <span>Timed Rounds</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
