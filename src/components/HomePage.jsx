import React, { useEffect, useState } from "react";
import { Heart, MessageCircle, Eye, Upload, LogOut, UserCircle2 } from "lucide-react";
import socket from "../api/socket";
import PostCard from "./PostCard";

export default function HomePage({
    currentUser,
    posts,
    users,
    onLike,
    onComment,
    onLogout,
    setCurrentPage,
}) {
    const [commentText, setCommentText] = useState("");

    // ✅ Realtime feed updates
    useEffect(() => {
        socket.on("update_feed", (newPost) => {
            console.log("🆕 New post received:", newPost.title);
        });

        socket.on("update_likes", (likeData) => {
            console.log("❤️ Like received:", likeData.postId);
        });

        socket.on("update_comments", (commentData) => {
            console.log("💬 Comment received:", commentData.postId);
        });

        return () => {
            socket.off("update_feed");
            socket.off("update_likes");
            socket.off("update_comments");
        };
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-black text-white">
            {/* === Top Nav Bar === */}
            <header className="flex items-center justify-between px-8 py-5 border-b border-white/10 bg-black/30 backdrop-blur-xl sticky top-0 z-50">
                <h1 className="text-2xl font-bold text-cyan-400">🌍 World-Studio LIVE</h1>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setCurrentPage("live")}
                        className="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl shadow-lg hover:scale-105 transition-all"
                    >
                        🎥 Go Live
                    </button>
                    <button
                        onClick={() => setCurrentPage("profile")}
                        className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition"
                    >
                        <UserCircle2 className="w-5 h-5" />
                        Profile
                    </button>
                    <button
                        onClick={onLogout}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/40 rounded-xl hover:bg-red-500/30 transition"
                    >
                        <LogOut className="w-5 h-5" /> Logout
                    </button>
                </div>
            </header>

            {/* === FEED SECTION === */}
            <main className="max-w-3xl mx-auto py-10 space-y-8 px-4">
                {Array.isArray(posts) && posts.length === 0 ? (
                    <div className="text-center text-white/60 py-20 text-lg">
                        No posts yet. Be the first to upload something amazing! 🚀
                    </div>
                ) : (
                    posts.map((post) => (
                        <div key={post._id} className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl overflow-hidden shadow-lg transition hover:shadow-cyan-500/20">
                            {/* === HEADER === */}
                            <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10">
                                <img
                                    src={post.avatar || "/default-avatar.png"}
                                    alt="avatar"
                                    className="w-12 h-12 rounded-full object-cover border border-white/20"
                                />
                                <div>
                                    <h3 className="font-semibold text-white">{post.username}</h3>
                                    <p className="text-sm text-white/50">
                                        {new Date(post.timestamp).toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            {/* === MEDIA === */}
                            <div className="bg-black flex justify-center items-center max-h-[600px]">
                                {post.type === "image" && (
                                    <img src={post.fileUrl} alt={post.title} className="w-full object-cover" />
                                )}
                                {post.type === "video" && (
                                    <video src={post.fileUrl} controls className="w-full max-h-[600px] object-cover" />
                                )}
                                {post.type === "audio" && (
                                    <audio src={post.fileUrl} controls className="w-full p-4" />
                                )}
                            </div>

                            {/* === CAPTION === */}
                            <div className="p-6 space-y-2">
                                <h2 className="text-xl font-bold text-cyan-300">{post.title}</h2>
                                <p className="text-white/70">{post.description}</p>
                            </div>

                            {/* === ACTIONS === */}
                            <div className="flex items-center justify-between px-6 pb-5">
                                <div className="flex items-center gap-6 text-white/70">
                                    <button
                                        onClick={() => onLike(post._id)}
                                        className={`flex items-center gap-2 transition ${post.likedBy?.includes(currentUser?.id)
                                            ? "text-red-500"
                                            : "hover:text-red-400"
                                            }`}
                                    >
                                        <Heart
                                            className="w-6 h-6"
                                            fill={post.likedBy?.includes(currentUser?.id) ? "currentColor" : "none"}
                                        />
                                        <span>{post.likes || 0}</span>
                                    </button>

                                    <div className="flex items-center gap-2 text-white/70">
                                        <MessageCircle className="w-6 h-6" />
                                        <span>{post.comments?.length || 0}</span>
                                    </div>

                                    <div className="flex items-center gap-2 text-white/70">
                                        <Eye className="w-6 h-6" />
                                        <span>{post.views || 0}</span>
                                    </div>
                                </div>
                            </div>

                            {/* === COMMENTS === */}
                            <div className="px-6 pb-5 space-y-3">
                                <h4 className="font-semibold text-white/80">Comments</h4>
                                {post.comments?.length > 0 ? (
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {post.comments.map((c, i) => (
                                            <div
                                                key={i}
                                                className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white/80"
                                            >
                                                <span className="font-semibold">{c.username}</span>: {c.text}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-white/50 text-sm">No comments yet</p>
                                )}

                                {/* Comment input */}
                                <div className="flex items-center gap-3">
                                    <input
                                        type="text"
                                        placeholder="Write a comment..."
                                        value={commentText}
                                        onChange={(e) => setCommentText(e.target.value)}
                                        className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:border-cyan-400"
                                    />
                                    <button
                                        onClick={() => {
                                            onComment(post._id, commentText);
                                            setCommentText("");
                                        }}
                                        className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg font-semibold hover:shadow-lg hover:shadow-cyan-500/30 transition"
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
