"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Send, Bot, MessageSquare } from "lucide-react";

interface ClawAgent {
  id: string;
  name: string;
  status: string;
  model: string;
  persona: string;
}

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

export default function ChatPage() {
  const [agents, setAgents] = useState<ClawAgent[]>([]);
  const [agentId, setAgentId] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasKey, setHasKey] = useState(false);

  const loadAgents = useCallback(() => {
    const token = localStorage.getItem("authToken");
    if (!token) return;
    fetch("/api/user/settings", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        setHasKey(data.hasClawpumpKey || false);
        const list = data.clawpump?.agents || [];
        setAgents(list);
        if (list.length > 0 && !agentId) setAgentId(list[0].id);
      })
      .catch(() => {});
  }, [agentId]);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !agentId || loading) return;
    const token = localStorage.getItem("authToken");
    if (!token) return;

    const msg = input;
    setInput("");
    setError("");
    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setLoading(true);

    try {
      const res = await fetch("/api/clawpump/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ agentId, message: msg }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to send message");
        setMessages((prev) => prev.slice(0, -1));
        return;
      }
      const resultObj = data?.result && typeof data.result === "object" ? (data.result as Record<string, unknown>) : {};
      const reply = String(resultObj.content ?? resultObj.message ?? "Agent replied.");
      setMessages((prev) => [...prev, { role: "assistant", content: String(reply) }]);
    } catch {
      setError("Network error. Try again.");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Talk to Your Agent</h1>
        <p className="text-gray-400">Chat with your live ClawPump agents</p>
      </div>

      {!hasKey ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-8 text-center"
        >
          <Bot size={40} className="mx-auto mb-4 text-gray-500" />
          <h3 className="text-lg font-semibold text-white mb-2">Connect your ClawPump key</h3>
          <p className="text-gray-400 text-sm mb-4">
            Connect your own cpk_ key in Settings to chat with your real agents.
          </p>
          <a
            href="/dashboard/settings"
            className="inline-flex items-center gap-2 bg-[#00FF88] text-black font-semibold px-4 py-2 rounded-lg hover:bg-[#00FF88]/90 transition-colors text-sm"
          >
            Go to Settings
          </a>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl overflow-hidden"
        >
          {/* Agent selector */}
          <div className="border-b border-[#1f1f1f] p-4">
            <label className="block text-sm text-gray-400 mb-2">Select Agent</label>
            <select
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              className="w-full bg-black border border-[#1f1f1f] rounded-lg px-3 py-2.5 text-white focus:border-[#00FF88] focus:outline-none"
            >
              {agents.length === 0 && <option value="">No agents found</option>}
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.status})
                </option>
              ))}
            </select>
          </div>

          {/* Messages */}
          <div className="h-96 overflow-y-auto p-4 space-y-3 bg-black/40">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 text-sm mt-20">
                <MessageSquare size={36} className="mx-auto mb-3 opacity-40" />
                Send a message to {agents.find((a) => a.id === agentId)?.name || "your agent"}.
                Your agent can trade, research, and act using its skills.
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-2.5 rounded-lg text-sm whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-[#00FF88]/15 text-white border border-[#00FF88]/30"
                      : "bg-[#1a1a1a] text-gray-200 border border-[#1f1f1f]"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-[#1a1a1a] border border-[#1f1f1f] rounded-lg px-4 py-2.5 text-sm text-gray-400">
                  <span className="animate-pulse">Agent is thinking...</span>
                </div>
              </div>
            )}
          </div>

          {error && (
            <p className="text-red-400 text-sm px-4 py-2 bg-red-500/10 border-t border-red-500/20">
              {error}
            </p>
          )}

          {/* Input */}
          <form onSubmit={send} className="border-t border-[#1f1f1f] p-4 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask your agent anything..."
              className="flex-1 bg-black border border-[#1f1f1f] rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:border-[#00FF88] focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || !input.trim() || !agentId}
              className="flex items-center gap-2 bg-[#00FF88] text-black font-semibold px-4 py-2.5 rounded-lg hover:bg-[#00FF88]/90 transition-colors disabled:opacity-50 text-sm"
            >
              <Send size={16} />
              Send
            </button>
          </form>
        </motion.div>
      )}
    </div>
  );
}
