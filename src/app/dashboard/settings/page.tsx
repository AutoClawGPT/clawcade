"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Key, Bell, Shield, Save, Eye, EyeOff, Bot, RefreshCw, UserPlus, Loader2 } from "lucide-react";

interface ClawAgent {
  id: string;
  name: string;
  status: string;
  walletAddress: string;
  model: string;
  persona: string;
  skills: string[];
}

interface ClawSkill {
  slug: string;
  name: string;
  description: string;
  alwaysOn: boolean;
}

export default function SettingsPage() {
  const [clawpumpKey, setClawpumpKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [walletAddress, setWalletAddress] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [clawAgents, setClawAgents] = useState<ClawAgent[]>([]);
  const [clawSkills, setClawSkills] = useState<ClawSkill[]>([]);
  const [createName, setCreateName] = useState("");
  const [createPersona, setCreatePersona] = useState("");
  const [createSkills, setCreateSkills] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createResult, setCreateResult] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [keyError, setKeyError] = useState("");

  const loadSettings = useCallback(() => {
    const token = localStorage.getItem("authToken");
    if (!token) return;
    setLoadingProfile(true);
    setKeyError("");
    fetch("/api/user/settings", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) {
          setName(data.settings.name || "");
          setWalletAddress(data.settings.walletAddress || "");
        }
        setHasKey(data.hasClawpumpKey || false);
        if (data.clawpump?.agents) {
          setClawAgents(data.clawpump.agents);
        } else {
          setClawAgents([]);
        }
        if (data.clawpump?.skills) {
          setClawSkills(data.clawpump.skills);
        } else {
          setClawSkills([]);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingProfile(false));
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleCreateAgent = async () => {
    const token = localStorage.getItem("authToken");
    if (!token || !createName.trim()) return;
    setCreating(true);
    setCreateError("");
    setCreateResult(null);
    try {
      const skills = createSkills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await fetch("/api/clawpump/create-agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: createName.trim(),
          persona: createPersona || undefined,
          skills: skills.length > 0 ? skills : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error || "Failed to create agent");
        return;
      }
      setCreateResult(data.agent?.name || "Agent created");
      setCreateName("");
      setCreatePersona("");
      setCreateSkills("");
      loadSettings();
    } catch {
      setCreateError("Network error. Try again.");
    } finally {
      setCreating(false);
    }
  };

  const handleSave = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) return;
    setSaving(true);
    setKeyError("");
    setSaved(false);

    try {
      const res = await fetch("/api/user/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          walletAddress,
          clawpumpApiKey: clawpumpKey || undefined,
          settings: { notifications },
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSaved(true);
        if (clawpumpKey) {
          setHasKey(true);
          if (data.clawpump?.agents) setClawAgents(data.clawpump.agents);
          if (data.clawpump?.skills) setClawSkills(data.clawpump.skills);
          setClawpumpKey("");
        }
        setTimeout(() => setSaved(false), 2000);
      } else {
        setKeyError(data.error || "Failed to save settings");
      }
    } catch {
      setKeyError("Failed to connect. Check your key.");
    }
    setSaving(false);
  };

  const handleDisconnect = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch("/api/user/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, walletAddress, disconnectClawpump: true }),
      });
      if (res.ok) {
        setHasKey(false);
        setClawAgents([]);
        setClawSkills([]);
        setClawpumpKey("");
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {}
    setSaving(false);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Settings</h1>
        <p className="text-gray-400">Manage your account and connected services</p>
      </div>

      <div className="max-w-2xl space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4">Profile</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Display Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="YourName"
                className="w-full bg-black border border-[#1f1f1f] rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:border-[#00FF88] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Solana Wallet Address</label>
              <input
                type="text"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="Your Solana wallet address"
                className="w-full bg-black border border-[#1f1f1f] rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:border-[#00FF88] focus:outline-none font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">Required to receive token rewards</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Key size={18} className="text-[#00FF88]" />
            <h3 className="text-lg font-semibold text-white">ClawPump Integration</h3>
            {hasKey && (
              <span className="text-xs text-[#00FF88] bg-[#00FF88]/10 border border-[#00FF88]/30 px-2 py-0.5 rounded-full">
                Connected
              </span>
            )}
          </div>
          <p className="text-gray-400 text-sm mb-4">
            Connect your own ClawPump API key to fetch and manage your real agents. Get your key at clawpump.tech.
          </p>
          <div className="mb-3">
            <label className="block text-sm text-gray-400 mb-2">ClawPump API Key (cpk_...)</label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={clawpumpKey}
                onChange={(e) => setClawpumpKey(e.target.value)}
                placeholder="cpk_..."
                className="w-full bg-black border border-[#1f1f1f] rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:border-[#00FF88] focus:outline-none pr-10 font-mono text-sm"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {keyError && (
            <p className="text-red-400 text-sm mb-3 border border-red-500/30 bg-red-500/10 rounded-lg px-3 py-2">
              {keyError}
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !clawpumpKey}
              className="flex items-center gap-2 bg-[#00FF88] text-black font-semibold px-4 py-2 rounded-lg hover:bg-[#00FF88]/90 transition-colors disabled:opacity-50 text-sm"
            >
              <Key size={14} />
              {saving ? "Connecting..." : "Connect Key"}
            </button>
            {hasKey && (
              <button
                onClick={handleDisconnect}
                disabled={saving}
                className="flex items-center gap-2 bg-red-500/10 text-red-400 border border-red-500/30 font-semibold px-4 py-2 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50 text-sm"
              >
                Disconnect
              </button>
            )}
          </div>
        </motion.div>

        {hasKey && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.07 }}
            className="bg-[#0a0a0a] border border-[#A855F7]/20 rounded-xl p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <UserPlus size={18} className="text-[#A855F7]" />
              <h3 className="text-lg font-semibold text-white">Create New ClawPump Agent</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Agent Name</label>
                <input
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="MyTradingAgent"
                  className="w-full bg-black border border-[#1f1f1f] rounded-lg px-4 py-2.5 text-white focus:border-[#A855F7] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Persona</label>
                <textarea
                  value={createPersona}
                  onChange={(e) => setCreatePersona(e.target.value)}
                  placeholder="Describe what this agent does..."
                  rows={2}
                  className="w-full bg-black border border-[#1f1f1f] rounded-lg px-4 py-2.5 text-white focus:border-[#A855F7] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Skills (comma-separated)</label>
                <input
                  value={createSkills}
                  onChange={(e) => setCreateSkills(e.target.value)}
                  placeholder="trading, sniper, market-intelligence"
                  className="w-full bg-black border border-[#1f1f1f] rounded-lg px-4 py-2.5 text-white focus:border-[#A855F7] focus:outline-none font-mono text-sm"
                />
                {clawSkills.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {clawSkills.slice(0, 12).map((s) => (
                      <button
                        key={s.slug}
                        onClick={() => setCreateSkills((prev) => prev ? prev + "," + s.slug : s.slug)}
                        className="text-[10px] text-gray-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full hover:text-[#00FF88] hover:border-[#00FF88]/30"
                      >
                        +{s.slug}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {createError && (
                <p className="text-red-400 text-xs border border-red-500/30 bg-red-500/10 rounded-lg px-3 py-2">{createError}</p>
              )}
              {createResult && (
                <p className="text-[#00FF88] text-xs border border-[#00FF88]/30 bg-[#00FF88]/10 rounded-lg px-3 py-2">
                  Created: {createResult}
                </p>
              )}
              <button
                onClick={handleCreateAgent}
                disabled={creating || !createName.trim()}
                className="flex items-center gap-2 bg-[#A855F7] text-white font-semibold px-4 py-2.5 rounded-lg hover:bg-[#A855F7]/90 transition-colors disabled:opacity-50 text-sm"
              >
                {creating ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                {creating ? "Creating..." : "Create Agent"}
              </button>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bot size={18} className="text-[#00FF88]" />
              <h3 className="text-lg font-semibold text-white">Your ClawPump Agents</h3>
            </div>
            <button
              onClick={loadSettings}
              className="flex items-center gap-1 text-gray-400 hover:text-white text-sm"
            >
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>

          {!hasKey ? (
            <p className="text-gray-500 text-sm">
              Connect your ClawPump API key above to see and manage your real agents.
            </p>
          ) : loadingProfile ? (
            <p className="text-gray-500 text-sm">Loading your agents...</p>
          ) : clawAgents.length === 0 ? (
            <p className="text-gray-500 text-sm">
              No ClawPump agents found for this key. Create one at clawpump.tech.
            </p>
          ) : (
            <div className="space-y-3">
              {clawAgents.map((a) => (
                <div
                  key={a.id}
                  className="border border-[#1f1f1f] rounded-lg p-4 hover:border-[#00FF88]/40 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-white">{a.name}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        a.status === "running" || a.status === "active"
                          ? "bg-[#00FF88]/10 text-[#00FF88] border border-[#00FF88]/30"
                          : "bg-gray-500/10 text-gray-400 border border-gray-500/30"
                      }`}
                    >
                      {a.status}
                    </span>
                  </div>
                  {a.persona && (
                    <p className="text-gray-400 text-xs mb-2 line-clamp-2">{a.persona}</p>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {(a.skills || []).map((s) => (
                      <span key={s} className="text-[10px] text-gray-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                        {s}
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-600 mt-2 font-mono truncate">
                    Wallet: {a.walletAddress || "—"} · Model: {a.model || "—"} · {a.id}
                  </p>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {hasKey && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.09 }}
            className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Shield size={18} className="text-[#A855F7]" />
              <h3 className="text-lg font-semibold text-white">ClawPump Skills</h3>
              <span className="text-xs text-gray-500">({clawSkills.length})</span>
            </div>
            {clawSkills.length === 0 ? (
              <p className="text-gray-500 text-sm">No skills catalog returned for this key.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {clawSkills.map((s) => (
                  <div key={s.slug} className="border border-[#1f1f1f] rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-white">{s.name}</span>
                      {s.alwaysOn && (
                        <span className="text-[10px] text-[#A855F7] border border-[#A855F7]/30 bg-[#A855F7]/10 px-1.5 py-0.5 rounded-full">
                          always on
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-2">{s.description}</p>
                    <code className="text-[10px] text-gray-500 font-mono">{s.slug}</code>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Bell size={18} className="text-[#A855F7]" />
            <h3 className="text-lg font-semibold text-white">Notifications</h3>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Reward Notifications</p>
              <p className="text-gray-400 text-xs">Get notified when you win rewards</p>
            </div>
            <button
              onClick={() => setNotifications(!notifications)}
              className={`w-12 h-6 rounded-full transition-colors ${
                notifications ? "bg-[#00FF88]" : "bg-[#1a1a1a]"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  notifications ? "translate-x-6" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Shield size={18} className="text-[#FFD700]" />
            <h3 className="text-lg font-semibold text-white">Security</h3>
          </div>
          <p className="text-gray-400 text-sm mb-2">
            All API keys are encrypted with AES-256-GCM before storage.
          </p>
          <p className="text-gray-400 text-sm">
            Your authToken is your master key. Never share it publicly.
          </p>
        </motion.div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-[#00FF88] text-black font-semibold px-6 py-3 rounded-lg hover:bg-[#00FF88]/90 transition-colors disabled:opacity-50"
        >
          <Save size={16} />
          {saving ? "Saving..." : saved ? "Saved!" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
