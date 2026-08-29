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
  trustTier: string;
  reputationScore: number;
  twitterVerified: boolean;
  twitterHandle?: string | null;
  avatarUrl?: string | null;
  image?: string | null;
}

const TIER_COLORS: Record<string, string> = {
  platinum: "bg-purple-500/20 text-purple-300 border-purple-400/40",
  gold: "bg-[#FFD700]/20 text-[#FFD700] border-[#FFD700]/40",
  silver: "bg-gray-400/20 text-gray-300 border-gray-400/40",
  bronze: "bg-orange-500/20 text-orange-300 border-orange-400/40",
  unrated: "bg-gray-500/10 text-gray-400 border-gray-500/30",
};

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
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyPhase, setVerifyPhase] = useState<"start" | "verify" | "done">("start");
  const [verifyCode, setVerifyCode] = useState("");
  const [tweetUrl, setTweetUrl] = useState("");
  const [verifyHandle, setVerifyHandle] = useState("");
  const [verifyMsg, setVerifyMsg] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);

  async function startVerify() {
    const token = localStorage.getItem("authToken");
    if (!token) { setError("Sign in to verify Twitter"); return; }
    setVerifyLoading(true); setVerifyMsg("");
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "start" }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to start verification"); return; }
      setVerifyCode(data.code);
      setVerifyPhase("verify");
    } catch { setError("Verification start failed"); }
    finally { setVerifyLoading(false); }
  }

  async function submitVerify() {
    const token = localStorage.getItem("authToken");
    if (!token) return;
    setVerifyLoading(true); setVerifyMsg("");
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "verify", tweetUrl, handle: verifyHandle }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Verification failed"); return; }
      setVerifyMsg(data.message);
      setVerifyPhase("done");
      // refresh
      window.location.reload();
    } catch { setError("Verification failed"); }
    finally { setVerifyLoading(false); }
  }

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
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={() => { setVerifyOpen(!verifyOpen); if (!verifyOpen) setVerifyPhase("start"); }}
            className="flex items-center gap-2 bg-[#1DA1F2]/10 border border-[#1DA1F2]/40 text-[#1DA1F2] text-sm px-4 py-2 rounded-lg hover:bg-[#1DA1F2]/20 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-[#1DA1F2]" />
            Verify Twitter
          </button>
        </div>

        {verifyOpen && (
          <div className="mt-4 bg-[#0a0a0a] border border-[#1DA1F2]/30 rounded-xl p-5 max-w-md">
            {verifyPhase === "start" && (
              <div>
                <p className="text-sm text-gray-300 mb-3">
                  Verify your X/Twitter account to earn a verified badge on the registry and a reputation boost.
                </p>
                <button
                  onClick={startVerify}
                  disabled={verifyLoading}
                  className="w-full bg-[#1DA1F2] text-white font-semibold py-2.5 rounded-lg hover:bg-[#1DA1F2]/90 transition-colors disabled:opacity-50 text-sm"
                >
                  {verifyLoading ? "Generating code..." : "Start Verification"}
                </button>
              </div>
            )}
            {verifyPhase === "verify" && (
              <div>
                <p className="text-xs text-gray-400 mb-2">Your verification code:</p>
                <div className="bg-black border border-[#1DA1F2]/40 rounded-lg px-4 py-3 mb-3 text-center">
                  <code className="text-[#1DA1F2] text-xl font-bold">{verifyCode}</code>
                </div>
                <p className="text-xs text-gray-400 mb-3">
                  Post a tweet with this code + your agent profile link, then paste the tweet URL below.
                </p>
                <input
                  value={tweetUrl}
                  onChange={(e) => setTweetUrl(e.target.value)}
                  placeholder="https://x.com/user/status/123..."
                  className="w-full bg-black border border-[#1f1f1f] rounded-lg px-3 py-2.5 text-white text-sm mb-2 focus:border-[#1DA1F2] focus:outline-none"
                />
                <input
                  value={verifyHandle}
                  onChange={(e) => setVerifyHandle(e.target.value)}
                  placeholder="your_x_handle (optional)"
                  className="w-full bg-black border border-[#1f1f1f] rounded-lg px-3 py-2.5 text-white text-sm mb-3 focus:border-[#1DA1F2] focus:outline-none"
                />
                <button
                  onClick={submitVerify}
                  disabled={verifyLoading || !tweetUrl}
                  className="w-full bg-[#1DA1F2] text-white font-semibold py-2.5 rounded-lg hover:bg-[#1DA1F2]/90 transition-colors disabled:opacity-50 text-sm"
                >
                  {verifyLoading ? "Verifying..." : "Submit Tweet URL"}
                </button>
              </div>
            )}
            {verifyPhase === "done" && (
              <div>
                <p className="text-[#00FF88] text-sm font-medium">{verifyMsg || "Verified!"}</p>
              </div>
            )}
          </div>
        )}
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
                      <span className="font-semibold text-white flex items-center gap-2">
                        {a.avatarUrl || a.image ? (
                          <img src={a.avatarUrl || a.image || ""} alt={a.name} className="w-6 h-6 rounded-full object-cover" />
                        ) : null}
                        {a.name}
                        {a.twitterVerified && (
                          <span title="Twitter verified" className="w-4 h-4 rounded-full bg-[#1DA1F2] flex items-center justify-center text-[9px] font-bold text-white">✓</span>
                        )}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#00FF88]/10 text-[#00FF88] border border-[#00FF88]/30">
                        {a.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mb-2">
                      {a.trustTier && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${TIER_COLORS[a.trustTier] || TIER_COLORS.unrated}`}>
                          {a.trustTier.toUpperCase()}
                        </span>
                      )}
                      {typeof a.reputationScore === "number" && a.reputationScore > 0 && (
                        <span className="text-[10px] text-gray-400">{a.reputationScore} rep</span>
                      )}
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
