// src/components/PostCard.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Eye, MessageCircle, Share2, Bookmark } from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../api/api";
import socket from "../api/socket";

export default function PostCard({ post, onUpdate }) {
    const navigate = useNavigate();

    // Get current user from localStorage
    const [currentUser, setCurrentUser] = useState(null);
    const [likeLoading, setLikeLoading] = useState(false);
    const [likes, setLikes] = useState(post.likes || 0);
    const [hasLiked, setHasLiked] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [commentText, setCommentText] = useState("");
    const [comments, setComments] = useState(post.comments || []);
    const [isSaved, setIsSaved] = useState(false);

    // Load user from localStorage
    useEffect(() => {
        const storedUser = localStorage.getItem("ws_currentUser");
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                setCurrentUser(user);

                // Check if user has liked this post
                if (Array.isArray(post.likedBy)) {
                    const userId = user._id || user.id;
                    setHasLiked(post.likedBy.includes(userId));
                }
            } catch (e) {
                console.error("Failed to parse user:", e);
            }
        }
    }, [post.likedBy]);

    // Sync likes via realtime socket
    useEffect(() => {
        const handleUpdate = ({ postId, likes: newLikes }) => {
            if (postId === post._id) {
                setLikes(newLikes);
            }
        };

        const handleCommentsUpdate = ({ postId, comments: newComments }) => {
            if (postId === post._id) {
                setComments(newComments);
            }
        };

        socket.on("update_likes", handleUpdate);
        socket.on("update_comments", handleCommentsUpdate);

        return () => {
            socket.off("update_likes", handleUpdate);
            socket.off("update_comments", handleCommentsUpdate);
        };
    }, [post._id]);

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return "Just now";
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
        if (diff < 604800000) return `${Math.floor(diff / 86400000)}d`;
        return date.toLocaleDateString();
    };

    // Handle like
    const handleLike = async () => {
        if (!currentUser) {
            toast.error("Please log in to like posts");
            navigate("/login");
            return;
        }

        if (likeLoading) return;

        setLikeLoading(true);

        // Optimistic update
        const wasLiked = hasLiked;
        setHasLiked(!wasLiked);
        setLikes((prev) => wasLiked ? prev - 1 : prev + 1);

        try {
            await api.post(`/posts/${post._id}/like`);

            // Emit socket event
            socket.emit("likePost", {
                postId: post._id,
                username: currentUser.username,
                likes: wasLiked ? likes - 1 : likes + 1,
            });
        } catch (err) {
            // Rollback on error
            setHasLiked(wasLiked);
            setLikes((prev) => wasLiked ? prev + 1 : prev - 1);
            toast.error("Failed to like post");
        } finally {
            setLikeLoading(false);
        }
    };

    // Handle comment submit
    const handleComment = async (e) => {
        e.preventDefault();

        if (!currentUser) {
            toast.error("Please log in to comment");
            navigate("/login");
            return;
        }

        const text = commentText.trim();
        if (!text) return;

        // Optimistic update
        const newComment = {
            _id: Date.now().toString(),
            username: currentUser.username,
            text,
            createdAt: new Date().toISOString(),
        };
        setComments((prev) => [...prev, newComment]);
        setCommentText("");

        try {
            await api.post(`/posts/${post._id}/comment`, { text });

            // Emit socket event
            socket.emit("commentPost", {
                postId: post._id,
                comment: newComment,
            });
        } catch (err) {
            // Rollback on error
            setComments((prev) => prev.filter((c) => c._id !== newComment._id));
            setCommentText(text);
            toast.error("Failed to post comment");
        }
    };

    // Handle share
    const handleShare = async () => {
        const url = `${window.location.origin}/post/${post._id}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: post.title || "Check out this post",
                    url,
                });
            } catch (err) {
                // User cancelled or error
            }
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(url);
            toast.success("Link copied to clipboard!");
        }
    };

    // Handle save/bookmark
    const handleSave = () => {
        setIsSaved(!isSaved);
        toast.success(isSaved ? "Removed from saved" : "Saved!");
    };

    // Navigate to author profile
    const goToProfile = () => {
        const authorId = post.userId || post.authorId;
        if (authorId) {
            navigate(`/profile/${authorId}`);
        }
    };

    return (
        <article className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition">
            {/* Header */}
            <div
                className="p-4 flex items-center gap-3 cursor-pointer hover:bg-white/5 transition"
                onClick={goToProfile}
            >
                <img
                    src={post.authorPhoto || post.avatar || "/defaults/default-avatar.png"}
                    alt="avatar"
                    className="w-10 h-10 rounded-full object-cover border border-white/20"
                    onError={(e) => { e.target.src = "/defaults/default-avatar.png"; }}
                />
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">
                        {post.author || post.username || "Anonymous"}
                    </h3>
                    <p className="text-xs text-white/50">
                        {formatDate(post.timestamp || post.createdAt)}
                    </p>
                </div>
            </div>

            {/* Title */}
            {post.title && (
                <div className="px-4 pb-2">
                    <h4 className="font-semibold text-white">{post.title}</h4>
                </div>
            )}

            {/* Description/Content */}
            {(post.description || post.content) && (
                <div className="px-4 pb-3 text-white/80">
                    {post.description || post.content}
                </div>
            )}

            {/* Media */}
            {(post.mediaUrl || post.fileUrl || post.media) && (
                <div className="bg-black">
                    {(post.mediaType === "image" || post.type === "image") && (
                        <img
                            src={post.mediaUrl || post.fileUrl || post.media}
                            alt={post.title || "Post"}
                            className="w-full max-h-[500px] object-contain"
                            loading="lazy"
                        />
                    )}

                    {(post.mediaType === "video" || post.type === "video") && (
                        <video
                            src={post.mediaUrl || post.fileUrl || post.media}
                            controls
                            className="w-full max-h-[500px]"
                            poster={post.thumbnail}
                            preload="metadata"
                        />
                    )}

                    {(post.mediaType === "audio" || post.type === "audio") && (
                        <div className="p-4 bg-gradient-to-r from-purple-900/50 to-blue-900/50">
                            <audio
                                src={post.mediaUrl || post.fileUrl || post.media}
                                controls
                                className="w-full"
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-1 p-2 border-t border-white/10">
                {/* Like */}
                <button
                    onClick={handleLike}
                    disabled={likeLoading}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${hasLiked
                            ? "text-red-400 bg-red-500/10"
                            : "text-white/70 hover:bg-white/10"
                        }`}
                >
                    <Heart className={`w-5 h-5 ${hasLiked ? "fill-current" : ""}`} />
                    <span className="text-sm font-medium">{likes}</span>
                </button>

                {/* Comments */}
                <button
                    onClick={() => setShowComments(!showComments)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${showComments
                            ? "text-cyan-400 bg-cyan-500/10"
                            : "text-white/70 hover:bg-white/10"
                        }`}
                >
                    <MessageCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">{comments.length}</span>
                </button>

                {/* Views */}
                <div className="flex items-center gap-2 px-4 py-2 text-white/50">
                    <Eye className="w-5 h-5" />
                    <span className="text-sm">{post.views || 0}</span>
                </div>

                <div className="flex-1" />

                {/* Share */}
                <button
                    onClick={handleShare}
                    className="p-2 text-white/70 hover:bg-white/10 rounded-lg transition"
                    title="Share"
                >
                    <Share2 className="w-5 h-5" />
                </button>

                {/* Save */}
                <button
                    onClick={handleSave}
                    className={`p-2 rounded-lg transition ${isSaved
                            ? "text-yellow-400 bg-yellow-500/10"
                            : "text-white/70 hover:bg-white/10"
                        }`}
                    title={isSaved ? "Unsave" : "Save"}
                >
                    <Bookmark className={`w-5 h-5 ${isSaved ? "fill-current" : ""}`} />
                </button>
            </div>

            {/* Comments section */}
            {showComments && (
                <div className="border-t border-white/10 p-4 space-y-3">
                    {/* Comment list */}
                    {comments.length > 0 ? (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {comments.slice(-10).map((comment, i) => (
                                <div key={comment._id || i} className="bg-white/5 rounded-lg px-3 py-2">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-cyan-400 font-semibold text-sm">
                                            {comment.username}
                                        </span>
                                        <span className="text-white/30 text-xs">
                                            {formatDate(comment.createdAt)}
                                        </span>
                                    </div>
                                    <p className="text-white/80 text-sm mt-1">{comment.text}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-white/40 text-sm text-center py-4">
                            No comments yet. Be the first!
                        </p>
                    )}

                    {/* Comment input */}
                    <form onSubmit={handleComment} className="flex gap-2">
                        <input
                            type="text"
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder={currentUser ? "Add a comment..." : "Log in to comment"}
                            disabled={!currentUser}
                            className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-white/40 outline-none focus:border-cyan-400 transition disabled:opacity-50"
                        />
                        <button
                            type="submit"
                            disabled={!commentText.trim() || !currentUser}
                            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 rounded-lg text-black font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            Post
                        </button>
                    </form>
                </div>
            )}
        </article>
    );
}