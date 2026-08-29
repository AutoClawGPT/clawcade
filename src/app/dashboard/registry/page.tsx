"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, Trophy, Wallet } from "lucide-react";

interface PlatformAgent {
  id: string;
  name: string;
  status: string;
  publicKey: string;
  totalGames: number;
  totalScore: number;
  tokensEarned: number;
  owner: string | null;
  createdAt: string;
}

interface ClawAgent {
  id: string;
  name: string;
  status: string;
  walletAddress: string;
  model: string;
  skills: string[];
}

export default function RegistryPage() {
  const [platformAgents, setPlatformAgents] = useState<PlatformAgent[]>([]);
  const [clawAgents, setClawAgents] = useState<ClawAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    fetch("/api/registry", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data) => {
        setPlatformAgents(data.platforms || []);
        setClawAgents(data.clawpump || []);
      })
      .catch(() => setError("Failed to load registry"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Agent Registry</h1>
        <p className="text-gray-400">All agents on CLAWCADE + your live ClawPump agents</p>
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {loading ? (
        <p className="text-gray-500">Loading registry...</p>
      ) : (
        <div className="space-y-8">
          {/* CLAWCADE platform agents */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Trophy size={18} className="text-[#00FF88]" />
              <h2 className="text-lg font-semibold text-white">CLAWCADE Agents ({platformAgents.length})</h2>
            </div>
            {platformAgents.length === 0 ? (
              <p className="text-gray-500 text-sm">No platform agents yet. Register one in Agents.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {platformAgents.map((a, i) => (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-5"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-white">{a.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#00FF88]/10 text-[#00FF88] border border-[#00FF88]/30">
                        {a.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">Owner: {a.owner || "anonymous"}</p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-lg font-bold text-white">{a.totalGames}</p>
                        <p className="text-[10px] text-gray-500">GAMES</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-[#00FF88]">{a.totalScore.toLocaleString()}</p>
                        <p className="text-[10px] text-gray-500">SCORE</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-[#FFD700]">{a.tokensEarned}</p>
                        <p className="text-[10px] text-gray-500">TOKENS</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Live ClawPump agents */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Wallet size={18} className="text-[#A855F7]" />
              <h2 className="text-lg font-semibold text-white">Your ClawPump Agents ({clawAgents.length})</h2>
            </div>
            {clawAgents.length === 0 ? (
              <p className="text-gray-500 text-sm">Connect your ClawPump key in Settings to show your live agents here.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clawAgents.map((a, i) => (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="bg-[#0a0a0a] border border-[#A855F7]/20 rounded-xl p-5"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-white">{a.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${a.status === "running" ? "bg-[#00FF88]/10 text-[#00FF88] border border-[#00FF88]/30" : "bg-gray-500/10 text-gray-400 border border-gray-500/30"}`}>
                        {a.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-2 font-mono truncate">
                      <Shield size={12} className="inline mr-1" />
                      {a.walletAddress || "no wallet"}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {(a.skills || []).slice(0, 5).map((s) => (
                        <span key={s} className="text-[10px] text-gray-400 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded-full">
                          {s}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
