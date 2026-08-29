"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Gift, Clock, Calendar, Star, ExternalLink } from "lucide-react";

const REWARD_SCHEDULE = [
  {
    period: "Hourly",
    icon: Clock,
    token: "$CLAW",
    description: "Top 3 players each hour",
    amounts: "1st: 1,000 | 2nd: 500 | 3rd: 250",
    color: "#00FF88",
  },
  {
    period: "Daily",
    icon: Calendar,
    token: "$CLAW",
    description: "Top 10 players each day",
    amounts: "1st: 5,000 → 10th: 250",
    color: "#A855F7",
  },
  {
    period: "Weekly",
    icon: Star,
    token: "$ANSEM",
    description: "ALL active players",
    amounts: "100 base + score bonus",
    color: "#FFD700",
  },
];

interface Reward {
  id: string;
  type: string;
  amount: number;
  token: string;
  status: string;
  rank: number | null;
  createdAt: string;
}

export default function RewardsPage() {
  const [userRewards, setUserRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) { setLoading(false); return; }

    fetch("/api/user/profile", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.recentRewards) setUserRewards(data.recentRewards);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Rewards</h1>
        <p className="text-gray-400">Real token rewards for playing games</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {REWARD_SCHEDULE.map((reward, i) => (
          <motion.div
            key={reward.period}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-6"
            style={{ borderColor: reward.color + "30" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <reward.icon size={18} style={{ color: reward.color }} />
              <h3 className="text-lg font-semibold text-white">{reward.period}</h3>
            </div>
            <p className="text-2xl font-bold mb-1" style={{ color: reward.color }}>
              {reward.token}
            </p>
            <p className="text-gray-400 text-sm mb-2">{reward.description}</p>
            <p className="text-gray-500 text-xs">{reward.amounts}</p>
          </motion.div>
        ))}
      </div>

      <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-6 mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">Token Contracts</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[#00FF88] font-mono">$CLAW</span>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm font-mono truncate max-w-[200px]">
                739dnZEG4yaBWFsY8L8ZwrfhGG6dhtCSercW8Umspump
              </span>
              <a href="https://solscan.io/token/739dnZEG4yaBWFsY8L8ZwrfhGG6dhtCSercW8Umspump" target="_blank" rel="noreferrer" className="text-gray-500 hover:text-white">
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#A855F7] font-mono">$ANSEM</span>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm font-mono truncate max-w-[200px]">
                9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump
              </span>
              <a href="https://solscan.io/token/9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump" target="_blank" rel="noreferrer" className="text-gray-500 hover:text-white">
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Your Rewards</h3>
        {loading ? (
          <p className="text-gray-500 text-sm text-center py-8">Loading...</p>
        ) : userRewards.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Gift size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No rewards yet. Play games to start earning!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {userRewards.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-2 border-b border-[#1f1f1f] last:border-0">
                <div>
                  <p className="text-white text-sm">{r.type} reward</p>
                  <p className="text-gray-500 text-xs">{new Date(r.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-[#00FF88] font-mono text-sm">+{r.amount} ${r.token}</p>
                  <p className="text-gray-500 text-xs">{r.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
