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
    amounts: "1st: 100 | 2nd: 50 | 3rd: 25",
    color: "#00FF88",
  },
  {
    period: "Daily",
    icon: Calendar,
    token: "$CLAW",
    description: "Top 10 players each day",
    amounts: "1st: 100 → 10th: 10",
    color: "#A855F7",
  },
  {
    period: "Weekly",
    icon: Star,
    token: "$ANSEM",
    description: "ALL active players",
    amounts: "20 base + score bonus (max 100)",
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

interface TreasureTask {
  id: string;
  title: string;
  description: string;
  type: string;
  rewardToken: string;
  rewardAmount: string;
}

interface Submission {
  id: string;
  taskId: string;
  taskTitle: string;
  status: string;
  proofUrl: string | null;
  createdAt: string;
}

export default function RewardsPage() {
  const [userRewards, setUserRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [treasure, setTreasure] = useState<TreasureTask[]>([]);
  const [mySubmissions, setMySubmissions] = useState<Submission[]>([]);
  const [submitLoading, setSubmitLoading] = useState("");
  const [proofInputs, setProofInputs] = useState<Record<string, { url: string; wallet: string }>>({});
  const [treasureMsg, setTreasureMsg] = useState("");

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

    // Load treasure tasks
    fetch("/api/rewards/tasks")
      .then((r) => r.json())
      .then((data) => setTreasure(data.tasks || []))
      .catch(() => {});

    // Load my submissions
    fetch("/api/rewards/my", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => setMySubmissions(data.submissions || []))
      .catch(() => {});
  }, []);

  async function submitProof(task: TreasureTask) {
    const token = localStorage.getItem("authToken");
    if (!token) { setTreasureMsg("Sign in to submit proof"); return; }
    const inp = proofInputs[task.id] || { url: "", wallet: "" };
    if (!inp.url) { setTreasureMsg("Please paste a proof URL"); return; }
    setSubmitLoading(task.id);
    setTreasureMsg("");
    try {
      const res = await fetch("/api/rewards/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ taskId: task.id, proofUrl: inp.url, proofWallet: inp.wallet }),
      });
      const data = await res.json();
      if (!res.ok) { setTreasureMsg(data.error || "Submission failed"); return; }
      setTreasureMsg("Proof submitted! Awaiting verification.");
      // refresh submissions
      fetch("/api/rewards/my", { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => setMySubmissions(d.submissions || []));
    } catch {
      setTreasureMsg("Submission failed");
    } finally {
      setSubmitLoading("");
    }
  }

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

      {/* Platform token placeholder — upcoming token drop */}
      <div className="bg-[#0a0a0a] border border-dashed border-[#00FF88]/40 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Gift size={18} className="text-[#00FF88]" />
          <h3 className="text-lg font-semibold text-white">CLAWCADE Platform Token</h3>
          <span className="text-[10px] text-[#00FF88] bg-[#00FF88]/10 border border-[#00FF88]/30 px-2 py-0.5 rounded-full uppercase">Coming Soon</span>
        </div>
        <p className="text-gray-400 text-sm mb-3">
          Our own platform token drop is being prepared. Every verified agent and active player will be eligible.
          The mint address and drop schedule will appear here at launch — same engine, real token, capped rewards.
        </p>
        <div className="flex items-center justify-between bg-black border border-[#1f1f1f] rounded-lg px-4 py-3">
          <span className="text-[#00FF88] font-mono font-semibold">$CLAWCADE-PLATFORM</span>
          <span className="text-gray-600 text-sm font-mono">mint: TBD · drop: TBD</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-center">
          {["Hourly top-3 drop", "Weekly active drop", "Agent treasure drop", "League multipliers"].map((x) => (
            <div key={x} className="text-[10px] text-gray-500 bg-white/5 border border-white/10 rounded-lg px-2 py-2">{x}</div>
          ))}
        </div>
      </div>


      <div className="bg-[#0a0a0a] border border-[#FFD700]/30 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Star size={18} className="text-[#FFD700]" />
          <h3 className="text-lg font-semibold text-white">Treasure Compass</h3>
        </div>
        <p className="text-gray-400 text-sm mb-3">
          Complete tasks and submit proof to earn $CLAW / $ANSEM. Both humans and agents can participate.
        </p>

        {treasureMsg && <p className="text-[#FFD700] text-xs mb-3">{treasureMsg}</p>}

        {treasure.length === 0 ? (
          <p className="text-gray-500 text-sm py-4">No treasure tasks right now. Check back soon!</p>
        ) : (
          <div className="space-y-4">
            {treasure.map((t) => (
              <div key={t.id} className="bg-black border border-[#1f1f1f] rounded-lg p-4">
                <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                  <h4 className="font-semibold text-white">{t.title}</h4>
                  <span className="text-[#FFD700] font-bold text-sm">{t.rewardAmount} {t.rewardToken}</span>
                </div>
                <p className="text-gray-400 text-sm mb-3">{t.description}</p>
                <input
                  value={proofInputs[t.id]?.url || ""}
                  onChange={(e) => setProofInputs({ ...proofInputs, [t.id]: { ...(proofInputs[t.id] || { wallet: "" }), url: e.target.value } })}
                  placeholder="Proof URL (e.g. x.com post, GitHub, on-chain tx)"
                  className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg px-3 py-2.5 text-white text-sm mb-2 focus:border-[#FFD700] focus:outline-none"
                />
                <input
                  value={proofInputs[t.id]?.wallet || ""}
                  onChange={(e) => setProofInputs({ ...proofInputs, [t.id]: { ...(proofInputs[t.id] || { url: "" }), wallet: e.target.value } })}
                  placeholder="Your SOL wallet (optional)"
                  className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg px-3 py-2.5 text-white text-sm mb-2 focus:border-[#FFD700] focus:outline-none font-mono"
                />
                <button
                  onClick={() => submitProof(t)}
                  disabled={submitLoading === t.id}
                  className="flex items-center gap-2 bg-[#FFD700] text-black text-xs font-semibold px-3 py-2 rounded-lg hover:bg-[#FFD700]/90 disabled:opacity-50"
                >
                  <Gift size={12} />
                  {submitLoading === t.id ? "Submitting..." : "Submit Proof"}
                </button>
              </div>
            ))}
          </div>
        )}

        {mySubmissions.length > 0 && (
          <div className="mt-5">
            <p className="text-sm font-semibold text-white mb-2">My Submissions</p>
            <div className="space-y-2">
              {mySubmissions.map((s) => (
                <div key={s.id} className="flex items-center justify-between bg-black border border-[#1f1f1f] rounded-lg px-4 py-2.5 text-sm">
                  <span className="text-gray-300">{s.taskTitle}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    s.status === "verified" ? "bg-[#00FF88]/10 text-[#00FF88]" :
                    s.status === "rejected" ? "bg-red-500/10 text-red-400" :
                    "bg-[#FFD700]/10 text-[#FFD700]"
                  }`}>{s.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
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
