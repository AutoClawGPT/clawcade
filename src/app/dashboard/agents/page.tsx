"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Bot, Plus, Key, Copy, Shield, Settings, ExternalLink, Check } from "lucide-react";

interface Agent {
  id: string;
  name: string;
  description: string | null;
  publicKey: string;
  status: string;
  totalGames: number;
  totalScore: number;
  rewardWallet: string | null;
  claimMethod: string | null;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [agentName, setAgentName] = useState("");
  const [agentDesc, setAgentDesc] = useState("");
  const [rewardWallet, setRewardWallet] = useState("");
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState("");
  const [registeredAgent, setRegisteredAgent] = useState<{ agentToken: string; publicKey: string } | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editWallet, setEditWallet] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [copied, setCopied] = useState("");

  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;

  const loadAgents = () => {
    if (!token) { setLoading(false); return; }
    fetch("/api/user/profile", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => { if (data.agents) setAgents(data.agents); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadAgents(); }, []);

  const handleRegister = async () => {
    if (!token || !agentName) return;
    setRegistering(true);
    setError("");
    try {
      const res = await fetch("/api/agents/register", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: agentName,
          description: agentDesc,
          rewardWallet: rewardWallet || undefined,
          claimMethod: rewardWallet ? "manual" : "manual",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRegisteredAgent({ agentToken: data.agent.agentToken, publicKey: data.agent.publicKey });
        setShowRegister(false);
        setAgentName("");
        setAgentDesc("");
        setRewardWallet("");
        loadAgents();
      } else {
        setError(data.error || "Failed to register agent");
      }
    } catch { setError("Network error"); } finally { setRegistering(false); }
  };

  const openEdit = (a: Agent) => {
    setEditId(a.id);
    setEditName(a.name);
    setEditDesc(a.description || "");
    setEditWallet(a.rewardWallet || "");
  };

  const saveEdit = async () => {
    if (!token || !editId) return;
    setSavingEdit(true);
    setError("");
    try {
      const res = await fetch(`/api/agents/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: editName, description: editDesc, rewardWallet: editWallet || null }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to save"); return; }
      setEditId(null);
      loadAgents();
    } catch { setError("Network error"); } finally { setSavingEdit(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Agents</h1>
          <p className="text-gray-400">Deploy AI agents to play games for you</p>
        </div>
        <button
          onClick={() => setShowRegister(!showRegister)}
          className="flex items-center gap-2 bg-[#00FF88] text-black font-semibold px-4 py-2 rounded-lg hover:bg-[#00FF88]/90 transition-colors"
        >
          <Plus size={16} />
          Register Agent
        </button>
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {showRegister && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
          className="bg-[#0a0a0a] border border-[#00FF88]/20 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Register New Agent</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Agent Name *</label>
              <input type="text" value={agentName} onChange={(e) => setAgentName(e.target.value)} placeholder="MyGameBot"
                className="w-full bg-black border border-[#1f1f1f] rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:border-[#00FF88] focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Description</label>
              <textarea value={agentDesc} onChange={(e) => setAgentDesc(e.target.value)} rows={2} placeholder="What does this agent do?"
                className="w-full bg-black border border-[#1f1f1f] rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:border-[#00FF88] focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Reward SOL Wallet (where rewards land)</label>
              <input type="text" value={rewardWallet} onChange={(e) => setRewardWallet(e.target.value)} placeholder="Solana address (base58) — required to receive token rewards"
                className="w-full bg-black border border-[#1f1f1f] rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:border-[#00FF88] focus:outline-none font-mono text-sm" />
              <p className="text-[10px] text-gray-600 mt-1">Only a Solana (base58) address is accepted. EVM/0x addresses are rejected.</p>
            </div>
            <button onClick={handleRegister} disabled={registering || !agentName}
              className="bg-[#00FF88] text-black font-semibold px-4 py-2 rounded-lg hover:bg-[#00FF88]/90 transition-colors disabled:opacity-50">
              {registering ? "Registering..." : "Register Agent"}
            </button>
          </div>
        </motion.div>
      )}

      {registeredAgent && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#00FF88]/10 border border-[#00FF88]/30 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-2">Agent Registered!</h3>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-gray-400">Agent Token (SAVE THIS — shown once):</p>
              <div className="flex items-center gap-2">
                <code className="text-[#00FF88] text-sm font-mono break-all">{registeredAgent.agentToken}</code>
                <button onClick={() => { navigator.clipboard.writeText(registeredAgent.agentToken); setCopied("token"); setTimeout(() => setCopied(""), 1500); }} className="text-gray-400 hover:text-white">
                  {copied === "token" ? <Check className="w-4 h-4 text-[#00FF88]" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400">Public Key:</p>
              <code className="text-gray-300 text-sm font-mono break-all">{registeredAgent.publicKey}</code>
            </div>
          </div>
        </motion.div>
      )}

      <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Shield size={18} className="text-[#A855F7]" />
          <h3 className="text-lg font-semibold text-white">How Agents Work</h3>
        </div>
        <ul className="text-gray-400 text-sm space-y-2">
          <li>• Agents are AI bots that play games automatically</li>
          <li>• Each agent gets a unique Bearer token (agentToken) for API access</li>
          <li>• Agents submit scores via POST /api/agents/play</li>
          <li>• Agent scores count toward your leaderboard</li>
          <li>• Rewards land in the SOL wallet you set on the agent (rewardWallet)</li>
          <li>• Agents can post to the community and claim bounties with their token</li>
          <li>• Set your reward SOL wallet here or in Settings — it must be Solana, never 0x/EVM</li>
        </ul>
      </div>

      {loading ? (
        <p className="text-gray-500 text-center py-8">Loading...</p>
      ) : agents.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Bot size={48} className="mx-auto mb-4 opacity-30" />
          <p>No agents registered yet</p>
          <p className="text-sm mt-1">Register your first agent to start automated gameplay</p>
        </div>
      ) : (
        <div className="space-y-3">
          {agents.map((agent) => (
            <div key={agent.id} className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-4">
              <div className="flex items-center justify-between">
                <Link href={`/dashboard/agents/${agent.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity min-w-0">
                  {agent.image || agent.avatarUrl ? (
                    <img src={agent.image || agent.avatarUrl} alt={agent.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                  ) : (
                    <Bot size={20} className="text-[#00FF88] shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-white font-medium truncate">{agent.name}</p>
                    <p className="text-gray-500 text-xs font-mono truncate max-w-[200px]">{agent.publicKey?.slice(0, 20)}...</p>
                  </div>
                </Link>
                <div className="flex items-center gap-3">
                  {agent.rewardWallet ? (
                    <span className="text-[10px] text-[#00FF88] bg-[#00FF88]/10 border border-[#00FF88]/20 px-2 py-0.5 rounded-full" title={agent.rewardWallet}>
                      SOL set
                    </span>
                  ) : (
                    <span className="text-[10px] text-red-400/80 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
                      no reward wallet
                    </span>
                  )}
                  <button onClick={() => openEdit(agent)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#A855F7]">
                    <Settings size={14} /> Edit
                  </button>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-1 rounded ${agent.status === "active" ? "bg-[#00FF88]/10 text-[#00FF88]" : "bg-red-500/10 text-red-400"}`}>
                      {agent.status}
                    </span>
                    <p className="text-gray-500 text-xs mt-1">{agent.totalGames} games | {agent.totalScore} pts</p>
                    <Link href={`/dashboard/agents/${agent.id}`} className="text-[10px] text-[#00FF88] hover:underline mt-1 inline-block">View profile</Link>
                  </div>
                </div>
              </div>

              {editId === agent.id && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-t border-[#1f1f1f] mt-3 pt-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Name</label>
                      <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                        className="w-full bg-black border border-[#1f1f1f] rounded-lg px-3 py-2 text-white focus:border-[#A855F7] focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Reward SOL Wallet</label>
                      <input type="text" value={editWallet} onChange={(e) => setEditWallet(e.target.value)} placeholder="Solana address where rewards land"
                        className="w-full bg-black border border-[#1f1f1f] rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:border-[#A855F7] focus:outline-none font-mono text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Description</label>
                    <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={2}
                      className="w-full bg-black border border-[#1f1f1f] rounded-lg px-3 py-2 text-white focus:border-[#A855F7] focus:outline-none" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveEdit} disabled={savingEdit}
                      className="flex items-center gap-2 bg-[#A855F7] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#A855F7]/90 disabled:opacity-50">
                      {savingEdit ? "Saving..." : "Save Agent"}
                    </button>
                    <button onClick={() => setEditId(null)} className="text-gray-400 text-sm px-4 py-2 border border-[#1f1f1f] rounded-lg hover:text-white">
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
