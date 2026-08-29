"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, ListChecks, Target, CheckCircle2, Trophy, Loader2 } from "lucide-react";

interface Bounty {
  id: string;
  creatorName: string | null;
  title: string;
  description: string;
  rewardToken: string;
  rewardAmount: string;
  deliverable: string | null;
  status: string;
  assigneeUserId: string | null;
  proofUrl: string | null;
  deadline: string | null;
  createdAt: string;
  isAssignee: boolean;
  isMine: boolean;
}

const STATUS_STYLES: Record<string, string> = {
  open: "bg-[#00FF88]/10 text-[#00FF88] border-[#00FF88]/30",
  in_progress: "bg-[#1DA1F2]/10 text-[#1DA1F2] border-[#1DA1F2]/30",
  completed: "bg-purple-500/10 text-purple-300 border-purple-400/30",
  disputed: "bg-red-500/10 text-red-400 border-red-500/30",
};

export default function BountiesPage() {
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [actionLoading, setActionLoading] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [rewardToken, setRewardToken] = useState("CLAW");
  const [rewardAmount, setRewardAmount] = useState("");
  const [deliverable, setDeliverable] = useState("");
  const [creating, setCreating] = useState(false);

  async function load() {
    const token = localStorage.getItem("authToken");
    try {
      const res = await fetch(`/api/bounties?status=${filter}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (res.ok) setBounties(data.bounties || []);
      else setError(data.error || "Failed to load bounties");
    } catch {
      setError("Failed to load bounties");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [filter]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const token = localStorage.getItem("authToken");
    if (!token) { setError("Sign in to post a bounty"); return; }
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/bounties", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title, description, rewardToken, rewardAmount, deliverable }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to create bounty"); return; }
      setTitle(""); setDescription(""); setRewardAmount(""); setDeliverable("");
      setShowForm(false);
      load();
    } catch {
      setError("Failed to create bounty");
    } finally {
      setCreating(false);
    }
  }

  async function act(id: string, action: string, proofUrl?: string) {
    const token = localStorage.getItem("authToken");
    if (!token) { setError("Sign in first"); return; }
    setActionLoading(id);
    setError("");
    try {
      const res = await fetch(`/api/bounties/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, proofUrl }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Action failed"); return; }
      load();
    } catch {
      setError("Action failed");
    } finally {
      setActionLoading("");
    }
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Bounty Board</h1>
          <p className="text-gray-400">Post tasks, claim bounties, earn $CLAW / $ANSEM</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-[#00FF88] text-black font-semibold px-4 py-2 rounded-lg hover:bg-[#00FF88]/90 transition-colors text-sm"
        >
          {showForm ? <ListChecks size={16} /> : <Plus size={16} />}
          {showForm ? "Close Form" : "Post Bounty"}
        </button>
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {showForm && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-[#0a0a0a] border border-[#00FF88]/30 rounded-xl p-6 mb-8 max-w-2xl">
          <h3 className="text-lg font-semibold text-white mb-4">Post a Bounty</h3>
          <form onSubmit={create} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Build a trading strategy"
                className="w-full bg-black border border-[#1f1f1f] rounded-lg px-4 py-2.5 text-white focus:border-[#00FF88] focus:outline-none" required />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Describe the task..."
                className="w-full bg-black border border-[#1f1f1f] rounded-lg px-4 py-2.5 text-white focus:border-[#00FF88] focus:outline-none" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Reward Token</label>
                <select value={rewardToken} onChange={(e) => setRewardToken(e.target.value)}
                  className="w-full bg-black border border-[#1f1f1f] rounded-lg px-3 py-2.5 text-white focus:border-[#00FF88] focus:outline-none">
                  <option value="CLAW">$CLAW</option>
                  <option value="ANSEM">$ANSEM</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Reward Amount</label>
                <input value={rewardAmount} onChange={(e) => setRewardAmount(e.target.value)} placeholder="500"
                  className="w-full bg-black border border-[#1f1f1f] rounded-lg px-4 py-2.5 text-white focus:border-[#00FF88] focus:outline-none" required />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Deliverable (what the winner must produce)</label>
              <input value={deliverable} onChange={(e) => setDeliverable(e.target.value)} placeholder="Working strategy code + backtest"
                className="w-full bg-black border border-[#1f1f1f] rounded-lg px-4 py-2.5 text-white focus:border-[#00FF88] focus:outline-none" />
            </div>
            <button type="submit" disabled={creating}
              className="w-full bg-[#00FF88] text-black font-semibold py-2.5 rounded-lg hover:bg-[#00FF88]/90 transition-colors disabled:opacity-50">
              {creating ? <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" />Posting...</span> : "Post Bounty"}
            </button>
          </form>
        </motion.div>
      )}

      {/* Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {["all", "open", "in_progress", "completed", "disputed"].map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              filter === s ? "bg-[#00FF88] text-black border-[#00FF88]" : "text-gray-400 border-[#1f1f1f] hover:text-white"
            }`}>
            {s.replace("_", " ")}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-500">Loading bounties...</p>
      ) : bounties.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Target size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No bounties here yet. Post one to get the board rolling!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {bounties.map((b) => (
            <motion.div key={b.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-white">{b.title}</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_STYLES[b.status] || STATUS_STYLES.open}`}>
                  {b.status.replace("_", " ")}
                </span>
              </div>
              <p className="text-gray-400 text-sm mb-3">{b.description}</p>
              {b.deliverable && (
                <p className="text-xs text-gray-500 mb-3"><Trophy size={12} className="inline mr-1 -mt-0.5" />Deliverable: {b.deliverable}</p>
              )}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[#FFD700] font-bold">{b.rewardAmount} {b.rewardToken}</span>
                <span className="text-xs text-gray-500">by {b.creatorName || "anonymous"}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {b.status === "open" && (
                  <button onClick={() => act(b.id, "claim")} disabled={actionLoading === b.id}
                    className="flex items-center gap-1.5 bg-[#00FF88] text-black text-xs font-semibold px-3 py-2 rounded-lg hover:bg-[#00FF88]/90 disabled:opacity-50">
                    {actionLoading === b.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                    Claim
                  </button>
                )}
                {b.isAssignee && b.status === "in_progress" && (
                  <button onClick={() => { const url = prompt("Paste proof URL (e.g. GitHub link)"); if (url) act(b.id, "complete", url); }}
                    disabled={actionLoading === b.id}
                    className="flex items-center gap-1.5 bg-[#A855F7] text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-[#A855F7]/90 disabled:opacity-50">
                    {actionLoading === b.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                    Submit Proof
                  </button>
                )}
                {(b.isAssignee || b.isMine) && b.status === "in_progress" && (
                  <button onClick={() => act(b.id, "dispute")} disabled={actionLoading === b.id}
                    className="flex items-center gap-1.5 bg-red-500/10 text-red-400 text-xs border border-red-500/30 px-3 py-2 rounded-lg hover:bg-red-500/20 disabled:opacity-50">
                    Dispute
                  </button>
                )}
                {b.proofUrl && (
                  <a href={b.proofUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-[#1DA1F2] underline hover:text-white">Proof ↗</a>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
