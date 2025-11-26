import React, { useEffect, useRef, useState } from "react";
import { Heart, MessageCircle, Eye, LogOut, UserCircle2 } from "lucide-react";
import { toast } from "react-hot-toast";
import useSWR from "swr";
import socket from "../api/socket";
import api from "../api/api"; // ✅ Import de api module

// ✅ Gebruik api instance voor fetcher
const fetcher = (url) => api.get(url).then((r) => r.data);

export default function HomePage({ currentUser, onLike, onComment, onLogout, setCurrentPage }) {
    const feedRef = useRef(null);
    const [posts, setPosts] = useState([]);
    const [comment, setComment] = useState("");

    // ✅ Gebruik relatieve URL - api.js voegt baseURL toe
    const { data, error, isLoading, mutate } = useSWR("/posts", fetcher, {
        refreshInterval: 5000,
        onSuccess: (res) => setPosts(res.posts || res || []),
    });

    // Realtime events
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

    function handleLike(postId) {
        setPosts((prev) =>
            prev.map((p) =>
                p._id === postId
                    ? {
                        ...p,
                        likes: (p.likes || 0) + 1,
                    }
                    : p
            )
        );

        onLike?.(postId);
    }

    function handleSendComment(postId) {
        if (!comment.trim()) return;
        setPosts((prev) =>
            prev.map((p) =>
                p._id === postId
                    ? {
                        ...p,
                        comments: [
                            ...(p.comments || []),
                            { username: currentUser?.username || "Anonymous", text: comment },
                        ],
                    }
                    : p
            )
        );

        onComment?.(postId, comment);
        setComment("");
    }

    if (isLoading)
        return (
            <div className="text-center text-white py-20">
                Loading feed...
            </div>
        );

    if (error)
        return (
            <div className="text-center text-red-400 py-20">
                Error loading feed. Please try again.
            </div>
        );

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-black text-white">
            {/* NAVBAR */}
            <header className="flex items-center justify-between px-8 py-5 border-b border-white/10 bg-black/30 backdrop-blur-xl sticky top-0 z-50">
                <h1 className="text-2xl font-bold text-cyan-400">🌌 World-Studio</h1>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setCurrentPage?.("live")}
                        className="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-600 rounded-xl"
                    >
                        🎥 Go Live
                    </button>

                    <button
                        onClick={() => setCurrentPage?.("profile")}
                        className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl"
                    >
                        <UserCircle2 className="w-5 h-5" />
                        Profile
                    </button>

                    <button
                        onClick={onLogout}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/40 rounded-xl"
                    >
                        <LogOut className="w-5 h-5" />
                        Logout
                    </button>
                </div>
            </header>

            {/* FEED */}
            <main className="max-w-3xl mx-auto py-10 px-4 space-y-8" ref={feedRef}>
                {posts.length === 0 ? (
                    <p className="text-center text-white/60">No posts yet.</p>
                ) : (
                    posts.map((post) => (
                        <div
                            key={post._id}
                            className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl shadow-lg"
                        >
                            {/* HEADER */}
                            <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10">
                                <img
                                    src={post.authorPhoto || "/default-avatar.png"}
                                    alt="avatar"
                                    className="w-12 h-12 rounded-full object-cover"
                                />
                                <div>
                                    <h3 className="font-semibold">{post.author}</h3>
                                    <p className="text-sm text-white/50">
                                        {post.timestamp
                                            ? new Date(post.timestamp).toLocaleString()
                                            : ""}
                                    </p>
                                </div>
                            </div>

                            {/* MEDIA */}
                            <div className="bg-black flex justify-center">
                                {post.mediaType === "image" && (
                                    <img src={post.mediaUrl} className="w-full object-cover" alt="post" />
                                )}
                                {post.mediaType === "video" && (
                                    <video src={post.mediaUrl} controls className="w-full" />
                                )}
                                {post.mediaType === "audio" && (
                                    <audio src={post.mediaUrl} controls className="w-full p-3" />
                                )}
                            </div>

                            {/* CAPTION */}
                            <div className="p-6">
                                <p className="text-white/80">{post.content}</p>
                            </div>

                            {/* ACTIONS */}
                            <div className="flex items-center gap-6 px-6 pb-5 text-white/70">
                                <button
                                    onClick={() => handleLike(post._id)}
                                    className="flex items-center gap-2 hover:text-red-400"
                                >
                                    <Heart className="w-6 h-6" />
                                    <span>{post.likes || 0}</span>
                                </button>

                                <div className="flex items-center gap-2">
                                    <MessageCircle className="w-6 h-6" />
                                    <span>{(post.comments || []).length}</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Eye className="w-6 h-6" />
                                    <span>{post.views || 0}</span>
                                </div>
                            </div>

                            {/* COMMENTS */}
                            <div className="px-6 pb-5 space-y-3">
                                <h4 className="font-semibold text-white/80">Comments</h4>

                                {(post.comments || []).map((c, i) => (
                                    <div key={i} className="bg-white/5 rounded-lg px-4 py-2 text-sm">
                                        <b>{c.username}:</b> {c.text}
                                    </div>
                                ))}

                                <div className="flex items-center gap-3">
                                    <input
                                        type="text"
                                        placeholder="Write a comment..."
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2"
                                    />
                                    <button
                                        onClick={() => handleSendComment(post._id)}
                                        disabled={!comment.trim()}
                                        className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg disabled:opacity-50"
                                    >
                                        Send
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </main>
        </div>
    );
}