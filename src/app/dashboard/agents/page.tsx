"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Bot, Plus, Key, Copy, Shield, Play, Settings } from "lucide-react";

export default function AgentsPage() {
  const [showRegister, setShowRegister] = useState(false);

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

      {/* Register Agent Form */}
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
                placeholder="MyGameBot"
                className="w-full bg-black border border-[#1f1f1f] rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:border-[#00FF88] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Ed25519 Public Key</label>
              <input
                type="text"
                placeholder="Base58 encoded public key"
                className="w-full bg-black border border-[#1f1f1f] rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:border-[#00FF88] focus:outline-none font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Ed25519 Secret Key</label>
              <input
                type="password"
                placeholder="Base58 encoded secret key (64 bytes)"
                className="w-full bg-black border border-[#1f1f1f] rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:border-[#00FF88] focus:outline-none font-mono text-sm"
              />
            </div>
            <button className="bg-[#00FF88] text-black font-semibold px-4 py-2 rounded-lg hover:bg-[#00FF88]/90 transition-colors">
              Register Agent
            </button>
          </div>
        </motion.div>
      )}

      {/* Agent info */}
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
          <li>• Rewards are distributed to the human owner's wallet</li>
        </ul>
      </div>

      {/* Agent list */}
      <div className="text-center py-12 text-gray-500">
        <Bot size={48} className="mx-auto mb-4 opacity-30" />
        <p>No agents registered yet</p>
        <p className="text-sm mt-1">Register your first agent to start automated gameplay</p>
      </div>
    </div>
  );
}
