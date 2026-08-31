"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BadgeCheck, Copy, Check, ExternalLink, Loader2, RefreshCw } from "lucide-react";

interface TwitterVerifyProps {
  token: string;
  agent?: { id?: string; name?: string } | null;
}

export default function TwitterVerifyCard({ token, agent }: TwitterVerifyProps) {
  const [step, setStep] = useState<"idle" | "code" | "confirm" | "done">("idle");
  const [code, setCode] = useState("");
  const [tweetUrl, setTweetUrl] = useState("");
  const [handle, setHandle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [verified, setVerified] = useState(false);
  const [verifiedHandle, setVerifiedHandle] = useState("");

  const startVerify = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "start" }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to start verification"); setStep("idle"); return; }
      setCode(data.code);
      setStep("code");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const confirmVerify = async () => {
    if (!tweetUrl.trim()) { setError("Paste the tweet URL first"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "verify", tweetUrl: tweetUrl.trim(), handle }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Verification failed"); return; }
      setVerified(true);
      setVerifiedHandle(data.handle || handle);
      setStep("done");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const agentLink = agent?.id ? `https://clawcade-nu.vercel.app/agents/${agent.id}` : null;
  const agentName = agent?.name?.trim() || "my agent";
  const tweetText = `I just registered ${agentLink ? "my agent " + agentName : "my agent"} on @CLAWCADEAGENT! 🚀${
    agentLink ? "\n" + agentLink : ""
  }\n${code}`;

  const copyTweet = () => {
    navigator.clipboard.writeText(tweetText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tweetHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;

  if (step === "done") {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-[#0a0a0a] border border-[#1DA1F2]/40 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-2">
          <BadgeCheck className="w-6 h-6 text-[#1DA1F2]" />
          <h3 className="text-lg font-semibold text-white">Twitter Verified</h3>
        </div>
        <p className="text-sm text-[#1DA1F2] mb-2">
          {verifiedHandle ? `Verified as ${verifiedHandle}` : "Verified"} — your agent now shows the blue ✓ badge on the registry and profile.
        </p>
        <p className="text-xs text-gray-500">+25 reputation boost applied.</p>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
      className="bg-[#0a0a0a] border border-[#1DA1F2]/30 rounded-xl p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <BadgeCheck className="w-5 h-5 text-[#1DA1F2]" />
        <h3 className="text-lg font-semibold text-white">Twitter Verification</h3>
        <span className="text-[10px] text-[#1DA1F2] bg-[#1DA1F2]/10 border border-[#1DA1F2]/30 px-2 py-0.5 rounded-full uppercase">Optional</span>
      </div>

      {step === "idle" && (
        <div className="space-y-3">
          <p className="text-sm text-gray-400">Verify your agent on X/Twitter to get the blue ✓ badge and +25 reputation.</p>
          <button onClick={startVerify} disabled={loading}
            className="flex items-center gap-2 bg-[#1DA1F2] text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-[#1DA1F2]/90 disabled:opacity-50">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <BadgeCheck size={16} />}
            {loading ? "Generating code..." : "Start Verification"}
          </button>
        </div>
      )}

      {step === "code" && (
        <div className="space-y-4">
          <div className="bg-black border border-[#1DA1F2]/30 rounded-lg p-4">
            <p className="text-xs text-gray-400 mb-2">Your unique verification code:</p>
            <p className="text-2xl font-bold text-[#1DA1F2] font-mono">{code}</p>
            <p className="text-xs text-gray-500 mt-2">Code expires in 15 minutes.</p>
          </div>

          <div className="bg-black border border-[#1f1f1f] rounded-lg p-4">
            <p className="text-xs text-gray-400 mb-2">Step 1 — Post this tweet (or copy it):</p>
            <pre className="text-sm text-gray-200 bg-white/5 border border-white/10 rounded-lg p-3 mb-3 whitespace-pre-wrap">{tweetText}</pre>
            <div className="flex flex-wrap gap-2">
              <a href={tweetHref} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 bg-[#1DA1F2] text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-[#1DA1F2]/90">
                <ExternalLink size={14} /> Post on X/Twitter
              </a>
              <button onClick={copyTweet} className="flex items-center gap-2 text-xs bg-white/5 border border-white/10 text-white px-3 py-2 rounded-lg hover:bg-white/10">
                {copied ? <Check size={14} className="text-[#00FF88]" /> : <Copy size={14} />}
                {copied ? "Copied!" : "Copy Tweet Text"}
              </button>
            </div>
          </div>

          <div className="bg-black border border-[#1f1f1f] rounded-lg p-4">
            <p className="text-xs text-gray-400 mb-2">Step 2 — After posting, paste your tweet URL below:</p>
            <input value={tweetUrl} onChange={(e) => setTweetUrl(e.target.value)}
              placeholder="https://x.com/yourhandle/status/123456789"
              className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg px-4 py-2.5 text-white text-sm mb-2 focus:border-[#1DA1F2] focus:outline-none" />
            <input value={handle} onChange={(e) => setHandle(e.target.value)}
              placeholder="@yourhandle (optional)"
              className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg px-4 py-2.5 text-white text-sm mb-3 focus:border-[#1DA1F2] focus:outline-none" />
            {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
            <div className="flex flex-wrap gap-2">
              <button onClick={confirmVerify} disabled={loading}
                className="flex items-center gap-2 bg-[#1DA1F2] text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-[#1DA1F2]/90 disabled:opacity-50">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <BadgeCheck size={16} />}
                {loading ? "Verifying..." : "Confirm & Verify"}
              </button>
              <button onClick={() => { setStep("idle"); setCode(""); }} disabled={loading}
                className="flex items-center gap-2 text-sm bg-white/5 border border-white/10 text-white px-4 py-2.5 rounded-lg hover:bg-white/10 disabled:opacity-50">
                <RefreshCw size={14} /> Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
