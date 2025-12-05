// src/components/PostCard.jsx - WORLD STUDIO LIVE EDITION 📝
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Eye, MessageCircle, Share2, Bookmark, UserPlus, UserCheck, Trash2, MoreHorizontal, X } from "lucide-react";
import { toast } from "react-hot-toast";
import axios from "axios";
import { io } from "socket.io-client";

/* ============================================================
   WORLD STUDIO LIVE CONFIGURATION
   ============================================================ */
const API_BASE_URL = "https://world-studio-production.up.railway.app";
const SOCKET_URL = "https://world-studio-production.up.railway.app";

// Create API instance
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: { "Content-Type": "application/json" },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("ws_token") || localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Socket connection (singleton)
let socket = null;
const getSocket = () => {
    if (!socket) {
        socket = io(SOCKET_URL, {
            transports: ["websocket", "polling"],
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
        });
    }
    return socket;
};

/* ============================================================
   SHARE PLATFORMS
   ============================================================ */
const SHARE_PLATFORMS = [
    {
        name: "WhatsApp",
        icon: "https://cdn-icons-png.flaticon.com/512/733/733585.png",
        color: "#25D366",
        getUrl: (url, text) => `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`,
    },
    {
        name: "X (Twitter)",
        icon: "https://cdn-icons-png.flaticon.com/512/5968/5968958.png",
        color: "#000000",
        getUrl: (url, text) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
    },
    {
        name: "Facebook",
        icon: "https://cdn-icons-png.flaticon.com/512/733/733547.png",
        color: "#1877F2",
        getUrl: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    },
    {
        name: "Telegram",
        icon: "https://cdn-icons-png.flaticon.com/512/2111/2111646.png",
        color: "#0088CC",
        getUrl: (url, text) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
    },
    {
        name: "LinkedIn",
        icon: "https://cdn-icons-png.flaticon.com/512/3536/3536505.png",
        color: "#0A66C2",
        getUrl: (url) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    },
    {
        name: "Reddit",
        icon: "https://cdn-icons-png.flaticon.com/512/2111/2111589.png",
        color: "#FF4500",
        getUrl: (url, text) => `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`,
    },
    {
        name: "Email",
        icon: "📧",
        color: "#EA4335",
        getUrl: (url, text) => `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent("Check this out: " + url)}`,
    },
    {
        name: "Pinterest",
        icon: "https://cdn-icons-png.flaticon.com/512/145/145808.png",
        color: "#E60023",
        getUrl: (url, text) => `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&description=${encodeURIComponent(text)}`,
    },
    {
        name: "Copy Link",
        icon: "📋",
        color: "#6B7280",
        action: "copy",
        message: "Link copied! Paste in TikTok, Instagram, Snapchat, etc.",
    },
];

/* ============================================================
   SHARE MODAL COMPONENT
   ============================================================ */
const ShareModal = ({ isOpen, onClose, postUrl, postTitle }) => {
    if (!isOpen) return null;

    const handleShare = (platform) => {
        if (platform.action === "copy") {
            navigator.clipboard.writeText(postUrl);
            toast.success(platform.message || "Link copied to clipboard!");
        } else if (platform.getUrl) {
            window.open(platform.getUrl(postUrl, postTitle), "_blank", "width=600,height=400");
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 w-full max-w-md border border-white/10 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white">Share to</h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
                        <X size={20} className="text-white/70" />
                    </button>
                </div>

                <div className="grid grid-cols-5 gap-4">
                    {SHARE_PLATFORMS.map((platform) => (
                        <button
                            key={platform.name}
                            onClick={() => handleShare(platform)}
                            className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-white/10 transition group"
                        >
                            {platform.icon.startsWith("http") ? (
                                <img src={platform.icon} alt={platform.name} className="w-10 h-10 rounded-xl group-hover:scale-110 transition" />
                            ) : (
                                <span className="text-3xl group-hover:scale-110 transition">{platform.icon}</span>
                            )}
                            <span className="text-xs text-white/70 text-center leading-tight">{platform.name}</span>
                        </button>
                    ))}
                </div>

                <div className="mt-6 p-3 bg-black/30 rounded-xl">
                    <p className="text-xs text-white/50 mb-1">Post URL:</p>
                    <p className="text-sm text-cyan-400 truncate">{postUrl}</p>
                </div>
            </div>
        </div>
    );
};

/* ============================================================
   DELETE MODAL COMPONENT
   ============================================================ */
const DeleteModal = ({ isOpen, onClose, onConfirm, isDeleting }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 w-full max-w-sm border border-white/10 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
                        <Trash2 size={32} className="text-red-500" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Delete Post?</h3>
                    <p className="text-white/60 mb-6">This action cannot be undone.</p>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            disabled={isDeleting}
                            className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-semibold transition disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isDeleting}
                            className="flex-1 py-3 bg-red-500 hover:bg-red-400 rounded-xl font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isDeleting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                <>
                                    <Trash2 size={18} />
                                    Delete
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ============================================================
   MAIN COMPONENT
   ============================================================ */
export default function PostCard({ post, onUpdate, onDelete }) {
    const navigate = useNavigate();
    const socketRef = useRef(null);

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
    const [showShareModal, setShowShareModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const menuRef = useRef(null);

    const authorId = post.userId?._id || post.userId || post.authorId;

    // Initialize socket
    useEffect(() => {
        socketRef.current = getSocket();
        return () => { };
    }, []);

    // Load user from localStorage
    useEffect(() => {
        const storedUser = localStorage.getItem("ws_currentUser");
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                user.following = Array.isArray(user.following) ? user.following : [];
                user.followers = Array.isArray(user.followers) ? user.followers : [];
                setCurrentUser(user);

                if (Array.isArray(post.likedBy)) {
                    const odId = user._id || user.id;
                    setHasLiked(post.likedBy.some(id => String(id) === String(odId)));
                }

                if (authorId) {
                    setIsFollowing(user.following.some(id => String(id) === String(authorId)));
                }
            } catch (e) {
                console.error("Failed to parse user:", e);
            }
        }
    }, [post.likedBy, authorId]);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setShowMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Socket events
    useEffect(() => {
        const socket = socketRef.current;
        if (!socket) return;

        const handleUpdate = ({ postId, likes: newLikes }) => {
            if (postId === post._id) setLikes(newLikes);
        };

        const handleCommentsUpdate = ({ postId, comments: newComments }) => {
            if (postId === post._id) setComments(newComments);
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
            await api.post(`/api/users/${authorId}/follow`);

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
            toast.error(err.response?.data?.error || "Failed to follow user");
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
            await api.post(`/api/posts/${post._id}/like`);
            const socket = socketRef.current;
            if (socket) {
                socket.emit("likePost", {
                    postId: post._id,
                    username: currentUser.username,
                    likes: wasLiked ? likes - 1 : likes + 1,
                });
            }
        } catch (err) {
            setHasLiked(wasLiked);
            setLikes((prev) => wasLiked ? prev + 1 : prev - 1);
            toast.error("Failed to like post");
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
            avatar: currentUser.avatar,
            text,
            createdAt: new Date().toISOString(),
        };
        setComments((prev) => [...prev, newComment]);
        setCommentText("");

        try {
            await api.post(`/api/posts/${post._id}/comment`, { text });
            const socket = socketRef.current;
            if (socket) {
                socket.emit("commentPost", { postId: post._id, comment: newComment });
            }
        } catch (err) {
            setComments((prev) => prev.filter((c) => c._id !== newComment._id));
            setCommentText(text);
            toast.error("Failed to post comment");
        }
    };

    // Handle delete post
    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await api.delete(`/api/posts/${post._id}`);
            toast.success("Post deleted!");
            setShowDeleteModal(false);
            onDelete?.(post._id);
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to delete post");
        } finally {
            setIsDeleting(false);
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
    const postUrl = `${window.location.origin}/post/${post._id}`;
    const postTitle = post.title || post.caption || "Check out this post on World-Studio!";

    return (
        <>
            <article className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition">
                {/* Header */}
                <div className="p-4 flex items-center gap-3">
                    <div className="flex items-center gap-3 flex-1 cursor-pointer hover:opacity-80 transition" onClick={goToProfile}>
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
                            <p className="text-xs text-white/50">{formatDate(post.timestamp || post.createdAt)}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {!isOwnPost && currentUser && (
                            <button
                                onClick={handleFollow}
                                disabled={followLoading}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition ${isFollowing
                                        ? "bg-white/10 text-white/70 hover:bg-white/20"
                                        : "bg-cyan-500 text-white hover:bg-cyan-400"
                                    }`}
                            >
                                {followLoading ? (
                                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                ) : isFollowing ? (
                                    <><UserCheck size={16} /> Following</>
                                ) : (
                                    <><UserPlus size={16} /> Follow</>
                                )}
                            </button>
                        )}

                        <div className="relative" ref={menuRef}>
                            <button onClick={() => setShowMenu(!showMenu)} className="p-2 hover:bg-white/10 rounded-full transition">
                                <MoreHorizontal size={20} className="text-white/70" />
                            </button>

                            {showMenu && (
                                <div className="absolute right-0 top-full mt-1 w-48 bg-gray-900 border border-white/10 rounded-xl shadow-xl overflow-hidden z-10">
                                    <button
                                        onClick={() => { setShowShareModal(true); setShowMenu(false); }}
                                        className="w-full px-4 py-3 text-left text-white hover:bg-white/10 transition flex items-center gap-3"
                                    >
                                        <Share2 size={18} />
                                        Share post
                                    </button>
                                    <button
                                        onClick={() => { handleSave(); setShowMenu(false); }}
                                        className="w-full px-4 py-3 text-left text-white hover:bg-white/10 transition flex items-center gap-3"
                                    >
                                        <Bookmark size={18} className={isSaved ? "fill-current" : ""} />
                                        {isSaved ? "Unsave" : "Save post"}
                                    </button>
                                    {isOwnPost && (
                                        <button
                                            onClick={() => { setShowDeleteModal(true); setShowMenu(false); }}
                                            className="w-full px-4 py-3 text-left text-red-400 hover:bg-red-500/10 transition flex items-center gap-3"
                                        >
                                            <Trash2 size={18} />
                                            Delete post
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Caption/Title */}
                {(post.caption || post.title) && (
                    <div className="px-4 pb-3">
                        <p className="text-white/90">{post.caption || post.title}</p>
                    </div>
                )}

                {/* Media */}
                {(post.fileUrl || post.mediaUrl || post.image || post.video) && (
                    <div className="relative bg-black">
                        {(post.type === "video" || post.mediaType === "video" || post.video) ? (
                            <video
                                src={post.fileUrl || post.mediaUrl || post.video}
                                controls
                                className="w-full max-h-[500px] object-contain"
                                poster={post.thumbnail}
                                playsInline
                            />
                        ) : (post.type === "audio" || post.mediaType === "audio") ? (
                            <div className="p-6 flex items-center justify-center bg-gradient-to-br from-purple-900/50 to-blue-900/50">
                                <audio src={post.fileUrl || post.mediaUrl} controls className="w-full max-w-md" />
                            </div>
                        ) : (
                            <img
                                src={post.fileUrl || post.mediaUrl || post.image}
                                alt={post.title || post.caption || "Post"}
                                className="w-full max-h-[500px] object-contain"
                                loading="lazy"
                                onError={(e) => { e.target.onerror = null; e.target.src = "/defaults/default-post.png"; }}
                            />
                        )}
                    </div>
                )}

                {/* Actions */}
                <div className="p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={handleLike}
                                disabled={likeLoading}
                                className={`flex items-center gap-2 transition ${hasLiked ? "text-red-500" : "text-white/70 hover:text-red-500"}`}
                            >
                                <Heart size={22} className={hasLiked ? "fill-current" : ""} />
                                <span className="font-medium">{likes}</span>
                            </button>

                            <button
                                onClick={() => setShowComments(!showComments)}
                                className="flex items-center gap-2 text-white/70 hover:text-cyan-400 transition"
                            >
                                <MessageCircle size={22} />
                                <span className="font-medium">{comments.length}</span>
                            </button>

                            <div className="flex items-center gap-2 text-white/50">
                                <Eye size={20} />
                                <span>{post.views || 0}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button onClick={() => setShowShareModal(true)} className="p-2 text-white/70 hover:text-cyan-400 hover:bg-white/5 rounded-full transition">
                                <Share2 size={20} />
                            </button>
                            <button onClick={handleSave} className={`p-2 rounded-full transition ${isSaved ? "text-yellow-400" : "text-white/70 hover:text-yellow-400"}`}>
                                <Bookmark size={20} className={isSaved ? "fill-current" : ""} />
                            </button>
                        </div>
                    </div>

                    {/* Comments Section */}
                    {showComments && (
                        <div className="mt-4 pt-4 border-t border-white/10">
                            <div className="space-y-3 max-h-60 overflow-y-auto mb-4">
                                {comments.length === 0 ? (
                                    <p className="text-white/40 text-center py-4">No comments yet</p>
                                ) : (
                                    comments.map((comment, idx) => (
                                        <div key={comment._id || idx} className="flex gap-3">
                                            <img
                                                src={comment.avatar || "/defaults/default-avatar.png"}
                                                alt=""
                                                className="w-8 h-8 rounded-full object-cover"
                                                onError={(e) => { e.target.src = "/defaults/default-avatar.png"; }}
                                            />
                                            <div className="flex-1 bg-white/5 rounded-xl px-3 py-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-sm text-white">{comment.username}</span>
                                                    <span className="text-xs text-white/40">{formatDate(comment.createdAt)}</span>
                                                </div>
                                                <p className="text-white/80 text-sm">{comment.text}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {currentUser && (
                                <form onSubmit={handleComment} className="flex gap-2">
                                    <img
                                        src={currentUser.avatar || "/defaults/default-avatar.png"}
                                        alt=""
                                        className="w-8 h-8 rounded-full object-cover"
                                        onError={(e) => { e.target.src = "/defaults/default-avatar.png"; }}
                                    />
                                    <input
                                        type="text"
                                        value={commentText}
                                        onChange={(e) => setCommentText(e.target.value)}
                                        placeholder="Write a comment..."
                                        className="flex-1 px-4 py-2 bg-white/10 border border-white/10 rounded-full text-white placeholder-white/40 text-sm focus:outline-none focus:border-cyan-400"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!commentText.trim()}
                                        className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 rounded-full text-white text-sm font-medium transition disabled:opacity-50"
                                    >
                                        Post
                                    </button>
                                </form>
                            )}
                        </div>
                    )}
                </div>
            </article>

            <ShareModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} postUrl={postUrl} postTitle={postTitle} />
            <DeleteModal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} onConfirm={handleDelete} isDeleting={isDeleting} />
        </>
    );
}