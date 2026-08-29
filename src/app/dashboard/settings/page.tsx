"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Key, Bell, Shield, Save, Eye, EyeOff } from "lucide-react";

export default function SettingsPage() {
  const [clawpumpKey, setClawpumpKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [walletAddress, setWalletAddress] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [connectedKeys, setConnectedKeys] = useState<string[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    fetch("/api/user/profile", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setName(data.user.name || "");
          setWalletAddress(data.user.walletAddress || "");
        }
      })
      .catch(() => {});

    fetch("/api/user/settings", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.connectedKeys) {
          setConnectedKeys(data.connectedKeys.map((k: { name: string }) => k.name));
        }
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
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
        body: JSON.stringify({
          name,
          walletAddress,
          clawpumpApiKey: clawpumpKey || undefined,
          settings: { notifications },
        }),
      });

      if (res.ok) {
        setSaved(true);
        if (clawpumpKey) {
          setConnectedKeys((prev) => prev.includes("clawpumpApiKey") ? prev : [...prev, "clawpumpApiKey"]);
        }
        // Update local user data
        const userData = localStorage.getItem("user");
        if (userData) {
          const u = JSON.parse(userData);
          u.name = name;
          u.walletAddress = walletAddress;
          localStorage.setItem("user", JSON.stringify(u));
        }
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
            <h3 className="text-lg font-semibold text-white">API Keys</h3>
          </div>
          <p className="text-gray-400 text-sm mb-4">
            Connect your own API keys. These are encrypted and stored securely.
          </p>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="block text-sm text-gray-400">ClawPump API Key</label>
              {connectedKeys.includes("clawpumpApiKey") && (
                <span className="text-xs text-[#00FF88] bg-[#00FF88]/10 border border-[#00FF88]/30 px-2 py-0.5 rounded-full">
                  Connected
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={clawpumpKey}
                onChange={(e) => setClawpumpKey(e.target.value)}
                placeholder="cpk_..."
                className="w-full bg-black border border-[#1f1f1f] rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:border-[#00FF88] focus:outline-none pr-10"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Get your key from{" "}
              <a href="https://clawpump.tech" className="text-[#00FF88] underline" target="_blank" rel="noreferrer">
                clawpump.tech
              </a>
            </p>
          </div>
        </motion.div>

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
