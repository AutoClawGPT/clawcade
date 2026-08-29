"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Zap, Key, Bot, CheckCircle } from "lucide-react";

interface Skill {
  slug: string;
  name: string;
  description: string;
  alwaysOn: boolean;
}

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [enabledSkills, setEnabledSkills] = useState<Set<string>>(new Set());
  const [hasKey, setHasKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    const token = localStorage.getItem("authToken");
    if (!token) { setLoading(false); return; }
    setLoading(true);
    fetch("/api/user/settings", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        setHasKey(data.hasClawpumpKey || false);
        setSkills(data.clawpump?.skills || []);
        // Mark skills already enabled on the user's agents
        const enabled = new Set<string>();
        for (const a of data.clawpump?.agents || []) {
          for (const s of a.skills || []) enabled.add(s);
        }
        setEnabledSkills(enabled);
      })
      .catch(() => setError("Failed to load skills"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!hasKey) {
    return (
      <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-8 text-center">
        <Zap size={40} className="mx-auto mb-4 text-gray-500" />
        <h3 className="text-lg font-semibold text-white mb-2">Connect your ClawPump key</h3>
        <p className="text-gray-400 text-sm mb-4">
          Connect your own cpk_ key in Settings to see the ClawPump skill catalog.
        </p>
        <a href="/dashboard/settings" className="inline-flex items-center gap-2 bg-[#00FF88] text-black font-semibold px-4 py-2 rounded-lg text-sm">
          Go to Settings
        </a>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Skills</h1>
        <p className="text-gray-400">ClawPump agent skills — what your agents can do</p>
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      <div className="flex items-center gap-2 mb-4">
        <Bot size={18} className="text-[#A855F7]" />
        <h2 className="text-lg font-semibold text-white">Skill Catalog ({skills.length})</h2>
        <span className="text-xs text-gray-500">from your connected key</span>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading skills...</p>
      ) : skills.length === 0 ? (
        <p className="text-gray-500">No skills catalog returned for your key.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {skills.map((skill, i) => (
            <motion.div
              key={skill.slug}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-5"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Zap size={16} className="text-[#A855F7]" />
                  <span className="font-semibold text-white">{skill.name}</span>
                </div>
                {skill.alwaysOn && (
                  <span className="text-[10px] text-[#A855F7] border border-[#A855F7]/30 bg-[#A855F7]/10 px-1.5 py-0.5 rounded-full">
                    always on
                  </span>
                )}
              </div>
              <p className="text-gray-400 text-sm mb-3">{skill.description}</p>
              <div className="flex items-center justify-between">
                <code className="text-[11px] text-gray-500 font-mono">{skill.slug}</code>
                {enabledSkills.has(skill.slug) ? (
                  <span className="flex items-center gap-1 text-xs text-[#00FF88]">
                    <CheckCircle size={13} /> Active on your agents
                  </span>
                ) : (
                  <span className="text-[10px] text-gray-600 border border-white/10 bg-white/5 px-1.5 py-0.5 rounded-full">
                    not enabled
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div className="mt-8 bg-[#0a0a0a] border border-[#A855F7]/20 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
          <Key size={18} className="text-[#A855F7]" />
          How to enable skills
        </h3>
        <ol className="text-gray-400 text-sm space-y-2 list-decimal list-inside">
          <li>Open <a className="text-[#00FF88] underline" href="https://clawpump.tech/dashboard" target="_blank" rel="noreferrer">ClawPump dashboard</a> with your connected key.</li>
          <li>Go to your agent&apos;s Settings → Skills.</li>
          <li>Toggle any skill to arm it on that agent.</li>
          <li>Return here — your agent&apos;s skills show as &quot;Active on your agents&quot;.</li>
        </ol>
      </div>
    </div>
  );
}
