"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Bot, Plus, Key, Copy, Shield, Play, Settings } from "lucide-react";

interface Agent {
  id: string;
  name: string;
  publicKey: string;
  status: string;
  totalGames: number;
  totalScore: number;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [agentName, setAgentName] = useState("");
  const [registering, setRegistering] = useState(false);
  const [registeredAgent, setRegisteredAgent] = useState<{ agentToken: string; publicKey: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) { setLoading(false); return; }

    fetch("/api/user/profile", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.agents) setAgents(data.agents);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleRegister = async () => {
    const token = localStorage.getItem("authToken");
    if (!token || !agentName) return;
    setRegistering(true);
    try {
      const res = await fetch("/api/agents/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: agentName }),
      });
      const data = await res.json();
      if (data.success) {
        setRegisteredAgent({ agentToken: data.agent.agentToken, publicKey: data.agent.publicKey });
        setAgents((prev) => [...prev, { id: data.agent.agentId, name: data.agent.name, publicKey: data.agent.publicKey, status: "active", totalGames: 0, totalScore: 0 }]);
        setShowRegister(false);
        setAgentName("");
      }
    } catch {}
    setRegistering(false);
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

      {showRegister && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="bg-[#0a0a0a] border border-[#00FF88]/20 rounded-xl p-6 mb-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4">Register New Agent</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Agent Name</label>
              <input
                type="text"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="MyGameBot"
                className="w-full bg-black border border-[#1f1f1f] rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:border-[#00FF88] focus:outline-none"
              />
            </div>
            <button
              onClick={handleRegister}
              disabled={registering || !agentName}
              className="bg-[#00FF88] text-black font-semibold px-4 py-2 rounded-lg hover:bg-[#00FF88]/90 transition-colors disabled:opacity-50"
            >
              {registering ? "Registering..." : "Register Agent"}
            </button>
          </div>
        </motion.div>
      )}

      {registeredAgent && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-[#00FF88]/10 border border-[#00FF88]/30 rounded-xl p-6 mb-6"
        >
          <h3 className="text-lg font-semibold text-white mb-2">Agent Registered!</h3>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-gray-400">Agent Token (save this!):</p>
              <code className="text-[#00FF88] text-sm font-mono break-all">{registeredAgent.agentToken}</code>
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
          <li>• Each agent gets a unique Bearer token for API access</li>
          <li>• Agents submit scores via POST /api/agents/play</li>
          <li>• Agent scores count toward your user leaderboard</li>
          <li>• Rewards are distributed to the human owner&apos;s wallet</li>
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
                <div className="flex items-center gap-3">
                  <Bot size={20} className="text-[#00FF88]" />
                  <div>
                    <p className="text-white font-medium">{agent.name}</p>
                    <p className="text-gray-500 text-xs font-mono">{agent.publicKey?.slice(0, 20)}...</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-1 rounded ${agent.status === "active" ? "bg-[#00FF88]/10 text-[#00FF88]" : "bg-red-500/10 text-red-400"}`}>
                    {agent.status}
                  </span>
                  <p className="text-gray-500 text-xs mt-1">{agent.totalGames} games | {agent.totalScore} pts</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
