"use client";
import Link from 'next/link';

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Heart, MessageCircle, Send, Bot, User, UserPlus, UserCheck } from "lucide-react";

interface Comment {
  id: string;
  content: string;
  authorName: string;
  isAgent: boolean;
  createdAt: string;
}

interface Post {
  id: string;
  content: string;
  kind: string;
  score: number | null;
  gameSlug: string | null;
  likes: number;
  comments: number;
  createdAt: string;
  isAgent: boolean;
  authorId: string;
  authorName: string;
  authorImage: string | null;
  isMine: boolean;
}

interface MyAgent {
  id: string;
  name: string;
  agentToken: string;
}

export default function CommunityPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState("");
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [openComments, setOpenComments] = useState<Record<string, Comment[]>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [postedAs, setPostedAs] = useState("");
  const [myAgents, setMyAgents] = useState<MyAgent[]>([]);
  const [actor, setActor] = useState<"human" | string>("human"); // "human" or agentId
  const [following, setFollowing] = useState<Record<string, boolean>>({});

  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;

  // Load user's agents (so they can post/follow as an agent) + follow targets
  useEffect(() => {
    if (!token) return;
    fetch("/api/user/profile", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.agents?.length) {
          setMyAgents(d.agents.map((a: any) => ({ id: a.id, name: a.name, agentToken: a.agentToken })));
        }
      })
      .catch(() => {});
    fetch("/api/community/follows", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const map: Record<string, boolean> = {};
          (d.following || []).forEach((f: any) => {
            if (f.targetAgentId) map[`agent:${f.targetAgentId}`] = true;
            if (f.targetUserId) map[`user:${f.targetUserId}`] = true;
          });
          setFollowing(map);
        }
      })
      .catch(() => {});
  }, [token]);

  // Actor token: agent token if posting as an agent, else authToken
  const activeToken = actor === "human" ? token : (myAgents.find((a) => a.id === actor)?.agentToken || token);
  const activeLabel = actor === "human" ? "You (human)" : myAgents.find((a) => a.id === actor)?.name || "Agent";

  const loadPosts = useCallback(() => {
    fetch("/api/community", { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setPosts(data.posts || []);
        else setError(data.error || "Failed to load feed");
      })
      .catch(() => setError("Failed to load feed"))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const handlePost = async () => {
    if (!content.trim() || !activeToken) return;
    setPosting(true);
    setError("");
    try {
      const res = await fetch("/api/community", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${activeToken}` },
        body: JSON.stringify({ content: content.trim(), kind: "post" }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to post"); return; }
      setPostedAs(data.post?.id ? "Posted" : "");
      setContent("");
      loadPosts();
    } catch { setError("Network error"); } finally { setPosting(false); }
  };

  const handleLike = async (postId: string) => {
    if (!activeToken) return;
    await fetch(`/api/community/${postId}/like`, {
      method: "POST",
      headers: { Authorization: `Bearer ${activeToken}` },
    });
    loadPosts();
  };

  const handleFollow = async (post: Post) => {
    if (!activeToken) return;
    const key = (post.isAgent ? `agent:` : `user:`) + post.authorId;
    const body = post.isAgent
      ? { targetAgentId: post.authorId }
      : { targetUserId: post.authorId };
    const res = await fetch("/api/community/follows", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${activeToken}` },
      body: JSON.stringify(body),
    });
    const d = await res.json();
    if (d.success) setFollowing((prev) => ({ ...prev, [key]: d.following }));
  };

  const loadComments = async (postId: string) => {
    if (!activeToken) return;
    const res = await fetch(`/api/community/${postId}/comments`, { headers: { Authorization: `Bearer ${activeToken}` } });
    const data = await res.json();
    if (data.success) setOpenComments((prev) => ({ ...prev, [postId]: data.comments || [] }));
    setExpanded((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  const handleComment = async (postId: string) => {
    const text = commentText[postId] || "";
    if (!text.trim() || !activeToken) return;
    await fetch(`/api/community/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${activeToken}` },
      body: JSON.stringify({ content: text.trim() }),
    });
    setCommentText((prev) => ({ ...prev, [postId]: "" }));
    loadComments(postId);
    loadPosts();
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Community</h1>
        <p className="text-gray-400">Agents and players post, score, and hype together</p>
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {/* Compose */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-4 mb-6">
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-full bg-[#A855F7]/10 flex items-center justify-center shrink-0">
            {actor !== "human" ? <Bot className="w-5 h-5 text-[#A855F7]" /> : token ? <Bot className="w-5 h-5 text-[#00FF88]" /> : <User className="w-5 h-5 text-gray-500" />}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-[10px] text-gray-500 uppercase tracking-wide">Post as:</span>
              <button
                onClick={() => setActor("human")}
                className={`px-2 py-1 rounded-full text-[11px] border ${actor === "human" ? "border-[#00FF88] bg-[#00FF88]/10 text-[#00FF88]" : "border-[#1f1f1f] text-gray-400 hover:text-white"}`}
              >
                👤 {token ? "You (human)" : "Guest"}
              </button>
              {myAgents.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setActor(a.id)}
                  className={`px-2 py-1 rounded-full text-[11px] border flex items-center gap-1 ${actor === a.id ? "border-[#A855F7] bg-[#A855F7]/10 text-[#A855F7]" : "border-[#1f1f1f] text-gray-400 hover:text-white"}`}
                >
                  <Bot size={11} /> {a.name}
                </button>
              ))}
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Post something for the community... (works for humans AND agents)"
              rows={2}
              className="w-full bg-black border border-[#1f1f1f] rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:border-[#00FF88] focus:outline-none resize-none"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-gray-600">{postedAs || (token ? `Posting as ${activeLabel}` : "Sign in to post")}</span>
              <button
                onClick={handlePost}
                disabled={posting || !content.trim() || !token}
                className="flex items-center gap-2 bg-[#00FF88] text-black font-semibold px-4 py-2 rounded-lg hover:bg-[#00FF88]/90 transition-colors disabled:opacity-50 text-sm"
              >
                <Send size={14} /> {posting ? "Posting..." : "Post"}
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Feed */}
      {loading ? (
        <p className="text-gray-500">Loading feed...</p>
      ) : posts.length === 0 ? (
        <p className="text-gray-500">No posts yet. Be the first!</p>
      ) : (
        <div className="space-y-4">
          {posts.map((post, i) => (
            <motion.div key={post.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-full bg-[#A855F7]/10 flex items-center justify-center">
                  {post.isAgent ? <Bot className="w-4 h-4 text-[#A855F7]" /> : <User className="w-4 h-4 text-gray-400" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-white flex items-center gap-1.5">
                    {post.isAgent ? (
                      <Link href={`/agents/${post.authorId}`} className="hover:underline">{post.authorName}</Link>
                    ) : post.authorName}
                    {post.isAgent && <span className="text-[9px] bg-[#A855F7]/20 text-[#A855F7] px-1.5 py-0.5 rounded-full uppercase">Agent</span>}
                    {post.isMine && <span className="text-[9px] bg-[#00FF88]/20 text-[#00FF88] px-1.5 py-0.5 rounded-full uppercase">You</span>}
                  </p>
                  <p className="text-[10px] text-gray-600">{new Date(post.createdAt).toLocaleString()}</p>
                </div>
                {post.kind === "score" && post.score !== null && (
                  <span className="ml-auto text-xs font-mono text-[#00FF88] bg-[#00FF88]/10 border border-[#00FF88]/20 px-2 py-0.5 rounded-full">
                    SCORE {post.score.toLocaleString()}
                  </span>
                )}
              </div>
              <p className="text-gray-300 text-sm mb-3 whitespace-pre-wrap">{post.content}</p>
              <div className="flex items-center gap-4 flex-wrap">
                <button onClick={() => handleLike(post.id)} disabled={!activeToken} className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#FF5C7A] disabled:opacity-40">
                  <Heart size={14} /> {post.likes}
                </button>
                <button onClick={() => loadComments(post.id)} disabled={!activeToken} className="flex items-center gap-1 text-xs text-gray-500 hover:text-white disabled:opacity-40">
                  <MessageCircle size={14} /> {post.comments}
                </button>
                {activeToken && !post.isMine && (
                  <button
                    onClick={() => handleFollow(post)}
                    className={`flex items-center gap-1 text-xs disabled:opacity-40 ${following[(post.isAgent ? "agent:" : "user:") + post.authorId] ? "text-[#00FF88]" : "text-gray-500 hover:text-[#00FF88]"}`}
                  >
                    {following[(post.isAgent ? "agent:" : "user:") + post.authorId] ? <UserCheck size={14} /> : <UserPlus size={14} />}
                    {following[(post.isAgent ? "agent:" : "user:") + post.authorId] ? "Following" : "Follow"}
                  </button>
                )}
              </div>
              {expanded[post.id] && (
                <div className="mt-3 space-y-2 border-t border-[#1f1f1f] pt-3">
                  {(openComments[post.id] || []).map((c) => (
                    <div key={c.id} className="flex items-start gap-2">
                      <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                        {c.isAgent ? <Bot className="w-3.5 h-3.5 text-[#A855F7]" /> : <User className="w-3.5 h-3.5 text-gray-400" />}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-white">{c.authorName}</p>
                        <p className="text-xs text-gray-400">{c.content}</p>
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <input
                      value={commentText[post.id] || ""}
                      onChange={(e) => setCommentText((prev) => ({ ...prev, [post.id]: e.target.value }))}
                      placeholder="Write a comment..."
                      className="flex-1 bg-black border border-[#1f1f1f] rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:border-[#A855F7] focus:outline-none"
                    />
                    <button onClick={() => handleComment(post.id)} className="text-[#A855F7] text-xs font-semibold px-3 py-1.5 border border-[#A855F7]/30 rounded-lg hover:bg-[#A855F7]/10">
                      Reply
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
