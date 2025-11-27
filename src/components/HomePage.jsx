// src/components/HomePage.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Eye, Send } from "lucide-react";
import { toast } from "react-hot-toast";
import useSWR from "swr";
import socket from "../api/socket";
import api from "../api/api";

// Fetcher voor SWR
const fetcher = (url) => api.get(url).then((r) => r.data);

export default function HomePage() {
    const navigate = useNavigate();
    const feedRef = useRef(null);

    // Get current user from localStorage
    const [currentUser, setCurrentUser] = useState(null);
    const [posts, setPosts] = useState([]);
    const [commentInputs, setCommentInputs] = useState({});
    const [likingPost, setLikingPost] = useState(null);

    // Load user from localStorage
    useEffect(() => {
        const storedUser = localStorage.getItem("ws_currentUser");
        if (storedUser) {
            try {
                setCurrentUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Failed to parse user:", e);
            }
        }
    }, []);

    // Fetch posts with SWR
    const { data, error, isLoading, mutate } = useSWR("/posts", fetcher, {
        refreshInterval: 10000,
        revalidateOnFocus: true,
        onSuccess: (res) => {
            const postsData = Array.isArray(res) ? res : res.posts || [];
            setPosts(postsData);
        },
    });

    // Socket.io realtime events
    useEffect(() => {
        socket.on("post_created", (newPost) => {
            setPosts((prev) => [newPost, ...prev]);
            toast.success("🆕 New post!");
        });

        socket.on("update_likes", ({ postId, likes }) => {
            setPosts((prev) =>
                prev.map((p) => (p._id === postId ? { ...p, likes } : p))
            );
        });

        socket.on("update_comments", ({ postId, comments }) => {
            setPosts((prev) =>
                prev.map((p) => (p._id === postId ? { ...p, comments } : p))
            );
        });

        return () => {
            socket.off("post_created");
            socket.off("update_likes");
            socket.off("update_comments");
        };
    }, []);

    // Handle like
    const handleLike = async (postId) => {
        if (!currentUser) {
            toast.error("Please log in to like posts");
            navigate("/login");
            return;
        }

        setLikingPost(postId);
        setPosts((prev) =>
            prev.map((p) =>
                p._id === postId ? { ...p, likes: (p.likes || 0) + 1 } : p
            )
        );

        try {
            await api.post(`/posts/${postId}/like`);
        } catch (err) {
            setPosts((prev) =>
                prev.map((p) =>
                    p._id === postId ? { ...p, likes: Math.max(0, (p.likes || 1) - 1) } : p
                )
            );
            toast.error("Failed to like post");
        } finally {
            setLikingPost(null);
        }
    };

    // Handle comment
    const handleSendComment = async (postId) => {
        const commentText = commentInputs[postId]?.trim();
        if (!commentText) return;

        if (!currentUser) {
            toast.error("Please log in to comment");
            navigate("/login");
            return;
        }

        const newComment = {
            username: currentUser.username,
            text: commentText,
        };

        setPosts((prev) =>
            prev.map((p) =>
                p._id === postId
                    ? { ...p, comments: [...(p.comments || []), newComment] }
                    : p
            )
        );

        setCommentInputs((prev) => ({ ...prev, [postId]: "" }));

        try {
            await api.post(`/posts/${postId}/comment`, { text: commentText });
        } catch (err) {
            setPosts((prev) =>
                prev.map((p) =>
                    p._id === postId
                        ? { ...p, comments: (p.comments || []).slice(0, -1) }
                        : p
                )
            );
            toast.error("Failed to post comment");
        }
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return "Just now";
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
        return date.toLocaleDateString();
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-black flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mb-4"></div>
                    <p className="text-white/70">Loading feed...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-black flex items-center justify-center">
                <div className="text-center p-8 bg-white/5 rounded-2xl border border-white/10">
                    <p className="text-red-400 mb-4">Failed to load feed</p>
                    <button
                        onClick={() => mutate()}
                        className="px-6 py-2 bg-cyan-500 rounded-lg hover:bg-cyan-400"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-black text-white">
            <main className="max-w-2xl mx-auto py-6 px-4 space-y-6" ref={feedRef}>

                {/* Welcome message */}
                {currentUser && (
                    <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 p-4 rounded-xl border border-cyan-500/20">
                        <p className="text-white/80">
                            Welcome, <span className="text-cyan-400 font-semibold">{currentUser.username}</span>! 👋
                        </p>
                    </div>
                )}

                {/* Empty state */}
                {posts.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-6xl mb-4">📭</p>
                        <p className="text-white/60 mb-4">No posts yet.</p>
                        <button
                            onClick={() => navigate("/upload")}
                            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-semibold"
                        >
                            Create First Post
                        </button>
                    </div>
                ) : (
                    posts.map((post) => (
                        <article
                            key={post.id || post.id || post._id}
                            className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl overflow-hidden"
                        >
                            {/* POST HEADER */}
                            <div
                                className="flex items-center gap-3 px-5 py-4 border-b border-white/10 cursor-pointer hover:bg-white/5"
                                onClick={() => navigate(`/profile/${post.userId}`)}
                            >
                                <img
                                    src={post.avatar || "/defaults/default-avatar.png"}
                                    alt="avatar"
                                    className="w-11 h-11 rounded-full object-cover border-2 border-white/20"
                                    onError={(e) => { e.target.src = "/defaults/default-avatar.png"; }}
                                />
                                <div>
                                    <h3 className="font-semibold">{post.username || "Anonymous"}</h3>
                                    <p className="text-xs text-white/50">
                                        {formatDate(post.timestamp || post.createdAt)}
                                    </p>
                                </div>
                            </div>

                            {/* MEDIA */}
                            {post.fileUrl && (
                                <div className="bg-black flex justify-center">
                                    {post.type === "image" && (
                                        <img src={post.fileUrl} className="w-full max-h-[500px] object-contain" alt="post" />
                                    )}
                                    {post.type === "video" && (
                                        <video src={post.fileUrl} controls className="w-full max-h-[500px]" />
                                    )}
                                    {post.type === "audio" && (
                                        <audio src={post.fileUrl} controls className="w-full p-4" />
                                    )}
                                </div>
                            )}

                            {/* CONTENT */}
                            {(post.description || post.title) && (
                                <div className="px-5 py-4">
                                    {post.title && <h4 className="font-semibold mb-1">{post.title}</h4>}
                                    {post.description && <p className="text-white/80">{post.description}</p>}
                                </div>
                            )}

                            {/* ACTIONS */}
                            <div className="flex items-center gap-6 px-5 py-3 border-t border-white/10 text-white/70">
                                <button
                                    onClick={() => handleLike(post.id || post._id)}
                                    disabled={likingPost === (post.id || post._id)}
                                    className="flex items-center gap-2 hover:text-red-400 disabled:opacity-50"
                                >
                                    <Heart className={`w-5 h-5 ${likingPost === (post.id || post._id) ? "animate-pulse" : ""}`} />
                                    <span>{post.likes || 0}</span>
                                </button>

                                <div className="flex items-center gap-2">
                                    <MessageCircle className="w-5 h-5" />
                                    <span>{(post.comments || []).length}</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Eye className="w-5 h-5" />
                                    <span>{post.views || 0}</span>
                                </div>
                            </div>

                            {/* COMMENTS */}
                            <div className="px-5 pb-5 space-y-3">
                                {(post.comments || []).length > 0 && (
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {(post.comments || []).slice(-5).map((c, i) => (
                                            <div key={i} className="bg-white/5 rounded-lg px-3 py-2 text-sm">
                                                <span className="font-semibold text-cyan-400">{c.username}:</span>{" "}
                                                <span className="text-white/80">{c.text}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        placeholder={currentUser ? "Write a comment..." : "Log in to comment"}
                                        value={commentInputs[post.id || post._id] || ""}
                                        onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id || post._id]: e.target.value }))}
                                        onKeyPress={(e) => e.key === "Enter" && handleSendComment(post.id || post._id)}
                                        disabled={!currentUser}
                                        className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-sm placeholder-white/40 focus:outline-none focus:border-cyan-400 disabled:opacity-50"
                                    />
                                    <button
                                        onClick={() => handleSendComment(post.id || post._id)}
                                        disabled={!commentInputs[post.id || post._id]?.trim() || !currentUser}
                                        className="p-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg disabled:opacity-50"
                                    >
                                        <Send className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </article>
                    ))
                )}

                {posts.length > 0 && (
                    <p className="text-center text-white/40 text-sm py-8">You're all caught up! 🎉</p>
                )}
            </main>
        </div>
    );
}