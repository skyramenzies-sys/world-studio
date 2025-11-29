// src/components/PostCard.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Eye, MessageCircle, Share2, Bookmark, UserPlus, UserCheck } from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../api/api";
import socket from "../api/socket";

export default function PostCard({ post, onUpdate }) {
    const navigate = useNavigate();

    const [currentUser, setCurrentUser] = useState(null);
    const [likeLoading, setLikeLoading] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);
    const [likes, setLikes] = useState(post.likes || 0);
    const [hasLiked, setHasLiked] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [commentText, setCommentText] = useState("");
    const [comments, setComments] = useState(post.comments || []);
    const [isSaved, setIsSaved] = useState(false);

    // Get author ID
    const authorId = post.userId?._id || post.userId || post.authorId;

    // Load user from localStorage
    useEffect(() => {
        const storedUser = localStorage.getItem("ws_currentUser");
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                // Ensure arrays exist
                user.following = Array.isArray(user.following) ? user.following : [];
                user.followers = Array.isArray(user.followers) ? user.followers : [];
                setCurrentUser(user);

                // Check if user has liked this post
                if (Array.isArray(post.likedBy)) {
                    const odId = user._id || user.id;
                    setHasLiked(post.likedBy.some(id => String(id) === String(odId)));
                }

                // Check if user is following this author
                if (authorId) {
                    setIsFollowing(user.following.some(id => String(id) === String(authorId)));
                }
            } catch (e) {
                console.error("Failed to parse user:", e);
            }
        }
    }, [post.likedBy, authorId]);

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

    // Handle follow/unfollow
    const handleFollow = async (e) => {
        e.stopPropagation();

        if (!currentUser) {
            toast.error("Please log in to follow users");
            navigate("/login");
            return;
        }

        if (!authorId) {
            toast.error("Cannot follow this user");
            return;
        }

        const myId = currentUser._id || currentUser.id;
        if (String(authorId) === String(myId)) return;

        if (followLoading) return;
        setFollowLoading(true);

        const wasFollowing = isFollowing;
        setIsFollowing(!wasFollowing);

        try {
            await api.post(`/users/${authorId}/follow`);

            // Update localStorage with safe array handling
            const updatedUser = { ...currentUser };
            const currentFollowing = Array.isArray(updatedUser.following) ? updatedUser.following : [];

            if (wasFollowing) {
                updatedUser.following = currentFollowing.filter(id => String(id) !== String(authorId));
            } else {
                updatedUser.following = [...currentFollowing, authorId];
            }
            localStorage.setItem("ws_currentUser", JSON.stringify(updatedUser));
            setCurrentUser(updatedUser);

            toast.success(wasFollowing ? "Unfollowed" : `Following ${post.author || post.username}!`);
        } catch (err) {
            setIsFollowing(wasFollowing);
            const errMsg = err.response?.data?.error || err.response?.data?.message || "Failed to follow user";
            toast.error(errMsg);
        } finally {
            setFollowLoading(false);
        }
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

        const wasLiked = hasLiked;
        setHasLiked(!wasLiked);
        setLikes((prev) => wasLiked ? prev - 1 : prev + 1);

        try {
            await api.post(`/posts/${post._id}/like`);
            socket.emit("likePost", {
                postId: post._id,
                username: currentUser.username,
                likes: wasLiked ? likes - 1 : likes + 1,
            });
        } catch (err) {
            setHasLiked(wasLiked);
            setLikes((prev) => wasLiked ? prev + 1 : prev - 1);
            const errMsg = err.response?.data?.error || err.response?.data?.message || "Failed to like post";
            toast.error(errMsg);
        } finally {
            setLikeLoading(false);
        }
    };

    // Handle comment
    const handleComment = async (e) => {
        e.preventDefault();
        if (!currentUser) {
            toast.error("Please log in to comment");
            navigate("/login");
            return;
        }

        const text = commentText.trim();
        if (!text) return;

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
            socket.emit("commentPost", { postId: post._id, comment: newComment });
        } catch (err) {
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
                await navigator.share({ title: post.title || "Check out this post", url });
            } catch (err) { }
        } else {
            navigator.clipboard.writeText(url);
            toast.success("Link copied to clipboard!");
        }
    };

    // Handle save
    const handleSave = () => {
        setIsSaved(!isSaved);
        toast.success(isSaved ? "Removed from saved" : "Saved!");
    };

    // Navigate to profile
    const goToProfile = () => {
        if (authorId) navigate(`/profile/${authorId}`);
    };

    const isOwnPost = currentUser && String(authorId) === String(currentUser._id || currentUser.id);

    return (
        <article className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition">
            {/* Header */}
            <div className="p-4 flex items-center gap-3">
                <div
                    className="flex items-center gap-3 flex-1 cursor-pointer hover:opacity-80 transition"
                    onClick={goToProfile}
                >
                    <img
                        src={post.authorPhoto || post.avatar || post.userId?.avatar || "/defaults/default-avatar.png"}
                        alt="avatar"
                        className="w-10 h-10 rounded-full object-cover border border-white/20"
                        onError={(e) => { e.target.src = "/defaults/default-avatar.png"; }}
                    />
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white truncate">
                            {post.author || post.username || post.userId?.username || "Anonymous"}
                        </h3>
                        <p className="text-xs text-white/50">
                            {formatDate(post.timestamp || post.createdAt)}
                        </p>
                    </div>
                </div>

                {/* Follow Button */}
                {!isOwnPost && currentUser && (
                    <button
                        onClick={handleFollow}
                        disabled={followLoading}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${isFollowing
                            ? "bg-white/10 text-white/70 hover:bg-red-500/20 hover:text-red-400"
                            : "bg-cyan-500 text-black hover:bg-cyan-400"
                            }`}
                    >
                        {followLoading ? (
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : isFollowing ? (
                            <>
                                <UserCheck className="w-4 h-4" />
                                <span className="hidden sm:inline">Following</span>
                            </>
                        ) : (
                            <>
                                <UserPlus className="w-4 h-4" />
                                <span className="hidden sm:inline">Follow</span>
                            </>
                        )}
                    </button>
                )}
            </div>

            {/* Title */}
            {post.title && (
                <div className="px-4 pb-2">
                    <h4 className="font-semibold text-white">{post.title}</h4>
                </div>
            )}

            {/* Content */}
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
                            <audio src={post.mediaUrl || post.fileUrl || post.media} controls className="w-full" />
                        </div>
                    )}
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-1 p-2 border-t border-white/10">
                <button
                    onClick={handleLike}
                    disabled={likeLoading}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${hasLiked ? "text-red-400 bg-red-500/10" : "text-white/70 hover:bg-white/10"
                        }`}
                >
                    <Heart className={`w-5 h-5 ${hasLiked ? "fill-current" : ""}`} />
                    <span className="text-sm font-medium">{likes}</span>
                </button>

                <button
                    onClick={() => setShowComments(!showComments)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${showComments ? "text-cyan-400 bg-cyan-500/10" : "text-white/70 hover:bg-white/10"
                        }`}
                >
                    <MessageCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">{comments.length}</span>
                </button>

                <div className="flex items-center gap-2 px-4 py-2 text-white/50">
                    <Eye className="w-5 h-5" />
                    <span className="text-sm">{post.views || 0}</span>
                </div>

                <div className="flex-1" />

                <button onClick={handleShare} className="p-2 text-white/70 hover:bg-white/10 rounded-lg transition">
                    <Share2 className="w-5 h-5" />
                </button>

                <button
                    onClick={handleSave}
                    className={`p-2 rounded-lg transition ${isSaved ? "text-yellow-400 bg-yellow-500/10" : "text-white/70 hover:bg-white/10"
                        }`}
                >
                    <Bookmark className={`w-5 h-5 ${isSaved ? "fill-current" : ""}`} />
                </button>
            </div>

            {/* Comments */}
            {showComments && (
                <div className="border-t border-white/10 p-4 space-y-3">
                    {comments.length > 0 ? (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {comments.slice(-10).map((comment, i) => (
                                <div key={comment._id || i} className="bg-white/5 rounded-lg px-3 py-2">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-cyan-400 font-semibold text-sm">{comment.username}</span>
                                        <span className="text-white/30 text-xs">{formatDate(comment.createdAt)}</span>
                                    </div>
                                    <p className="text-white/80 text-sm mt-1">{comment.text}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-white/40 text-sm text-center py-4">No comments yet. Be the first!</p>
                    )}

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