// src/components/PostCard.jsx - WORLD STUDIO LIVE ULTIMATE EDITION 📝
import React, {
    useState,
    useEffect,
    useRef,
    useMemo,
} from "react";
import { useNavigate } from "react-router-dom";
import {
    Heart,
    Eye,
    MessageCircle,
    Share2,
    Bookmark,
    UserPlus,
    UserCheck,
    Trash2,
    MoreHorizontal,
    X,
} from "lucide-react";
import { toast } from "react-hot-toast";

import api from "../api/api"; // centrale API (zelfde als ProfilePage)
import socket from "../api/socket"; // centrale socket (single connection)

/* ============================================================
   CONFIG & HELPERS
   ============================================================ */

// Zelfde logica als andere files: haal base uit env of fallback
const API_BASE_URL = (
    import.meta.env.VITE_API_URL ||
    "https://world-studio-production.up.railway.app"
)
    .replace(/\/api\/?$/, "")
    .replace(/\/$/, "");

// Avatar / media resolver – fixt relative paden
const resolveUrl = (url, fallbackPath) => {
    if (!url) {
        if (!fallbackPath) {
            return `${API_BASE_URL}/defaults/default-post.png`;
        }
        if (fallbackPath.startsWith("http")) return fallbackPath;
        return `${API_BASE_URL}${fallbackPath.startsWith("/")
                ? fallbackPath
                : `/${fallbackPath}`
            }`;
    }
    if (url.startsWith("http")) return url;
    return `${API_BASE_URL}${url.startsWith("/") ? url : `/${url}`
        }`;
};

const resolveAvatar = (url) =>
    resolveUrl(url, "/defaults/default-avatar.png");

// Date formatter
const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "";
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000)
        return `${Math.floor(diff / 3600000)}h`;
    if (diff < 604800000)
        return `${Math.floor(diff / 86400000)}d`;
    return date.toLocaleDateString();
};

/* ============================================================
   SHARE PLATFORMS
   ============================================================ */

const SHARE_PLATFORMS = [
    {
        name: "WhatsApp",
        icon: "https://cdn-icons-png.flaticon.com/512/733/733585.png",
        color: "#25D366",
        getUrl: (url, text) =>
            `https://wa.me/?text=${encodeURIComponent(
                `${text} ${url}`
            )}`,
    },
    {
        name: "X (Twitter)",
        icon: "https://cdn-icons-png.flaticon.com/512/5968/5968958.png",
        color: "#000000",
        getUrl: (url, text) =>
            `https://twitter.com/intent/tweet?text=${encodeURIComponent(
                text
            )}&url=${encodeURIComponent(url)}`,
    },
    {
        name: "Facebook",
        icon: "https://cdn-icons-png.flaticon.com/512/733/733547.png",
        color: "#1877F2",
        getUrl: (url) =>
            `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                url
            )}`,
    },
    {
        name: "Telegram",
        icon: "https://cdn-icons-png.flaticon.com/512/2111/2111646.png",
        color: "#0088CC",
        getUrl: (url, text) =>
            `https://t.me/share/url?url=${encodeURIComponent(
                url
            )}&text=${encodeURIComponent(text)}`,
    },
    {
        name: "LinkedIn",
        icon: "https://cdn-icons-png.flaticon.com/512/3536/3536505.png",
        color: "#0A66C2",
        getUrl: (url) =>
            `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
                url
            )}`,
    },
    {
        name: "Reddit",
        icon: "https://cdn-icons-png.flaticon.com/512/2111/2111589.png",
        color: "#FF4500",
        getUrl: (url, text) =>
            `https://www.reddit.com/submit?url=${encodeURIComponent(
                url
            )}&title=${encodeURIComponent(text)}`,
    },
    {
        name: "Email",
        icon: "📧",
        color: "#EA4335",
        getUrl: (url, text) =>
            `mailto:?subject=${encodeURIComponent(
                text
            )}&body=${encodeURIComponent(
                `Check this out: ${url}`
            )}`,
    },
    {
        name: "Pinterest",
        icon: "https://cdn-icons-png.flaticon.com/512/145/145808.png",
        color: "#E60023",
        getUrl: (url, text) =>
            `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(
                url
            )}&description=${encodeURIComponent(text)}`,
    },
    {
        name: "Copy Link",
        icon: "📋",
        color: "#6B7280",
        action: "copy",
        message:
            "Link copied! Paste in TikTok, Instagram, Snapchat, etc.",
    },
];

/* ============================================================
   SHARE MODAL
   ============================================================ */

const ShareModal = ({
    isOpen,
    onClose,
    postUrl,
    postTitle,
}) => {
    if (!isOpen) return null;

    const handleShare = (platform) => {
        if (platform.action === "copy") {
            if (
                typeof navigator !== "undefined" &&
                navigator?.clipboard?.writeText
            ) {
                navigator.clipboard.writeText(postUrl);
                toast.success(
                    platform.message ||
                    "Link copied to clipboard!"
                );
            } else {
                toast.error(
                    "Clipboard not available on this device"
                );
            }
        } else if (platform.getUrl) {
            if (typeof window !== "undefined") {
                window.open(
                    platform.getUrl(postUrl, postTitle),
                    "_blank",
                    "width=600,height=400"
                );
            }
        }
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 w-full max-w-md border border-white/10 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white">
                        Share to
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition"
                    >
                        <X
                            size={20}
                            className="text-white/70"
                        />
                    </button>
                </div>

                <div className="grid grid-cols-5 gap-4">
                    {SHARE_PLATFORMS.map((platform) => (
                        <button
                            key={platform.name}
                            onClick={() =>
                                handleShare(platform)
                            }
                            className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-white/10 transition group"
                        >
                            {typeof platform.icon ===
                                "string" &&
                                platform.icon.startsWith(
                                    "http"
                                ) ? (
                                <img
                                    src={platform.icon}
                                    alt={platform.name}
                                    className="w-10 h-10 rounded-xl group-hover:scale-110 transition"
                                />
                            ) : (
                                <span className="text-3xl group-hover:scale-110 transition">
                                    {platform.icon}
                                </span>
                            )}
                            <span className="text-xs text-white/70 text-center leading-tight">
                                {platform.name}
                            </span>
                        </button>
                    ))}
                </div>

                <div className="mt-6 p-3 bg-black/30 rounded-xl">
                    <p className="text-xs text-white/50 mb-1">
                        Post URL:
                    </p>
                    <p className="text-sm text-cyan-400 truncate">
                        {postUrl}
                    </p>
                </div>
            </div>
        </div>
    );
};

/* ============================================================
   DELETE MODAL
   ============================================================ */

const DeleteModal = ({
    isOpen,
    onClose,
    onConfirm,
    isDeleting,
}) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 w-full max-w-sm border border-white/10 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
                        <Trash2
                            size={32}
                            className="text-red-500"
                        />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">
                        Delete Post?
                    </h3>
                    <p className="text-white/60 mb-6">
                        This action cannot be undone.
                    </p>
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
   MAIN COMPONENT – ULTIMATE EDITION
   ============================================================ */

export default function PostCard({
    post,
    onUpdate,
    onDelete,
}) {
    const navigate = useNavigate();
    const menuRef = useRef(null);

    const [currentUser, setCurrentUser] = useState(null);

    const [likes, setLikes] = useState(0);
    const [hasLiked, setHasLiked] = useState(false);
    const [likeLoading, setLikeLoading] = useState(false);

    const [isFollowing, setIsFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);

    const [showComments, setShowComments] = useState(false);
    const [commentText, setCommentText] = useState("");
    const [comments, setComments] = useState([]);

    const [isSaved, setIsSaved] = useState(false);
    const [showShareModal, setShowShareModal] =
        useState(false);
    const [showDeleteModal, setShowDeleteModal] =
        useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    /* ------------------------------------------------------------
       NORMALIZE AUTHOR & INITIAL STATE
       ------------------------------------------------------------ */

    const author = useMemo(() => {
        // author/user object kan op verschillende plekken zitten
        const userObj =
            post.user ||
            post.userId ||
            post.author ||
            post.owner;

        const id =
            (userObj && (userObj._id || userObj.id)) ||
            post.userId ||
            post.authorId;

        const username =
            (userObj &&
                (userObj.username ||
                    userObj.displayName)) ||
            post.username ||
            post.author ||
            "Anonymous";

        const avatar =
            (userObj && userObj.avatar) ||
            post.authorPhoto ||
            post.avatar ||
            null;

        return {
            id,
            username,
            avatar: resolveAvatar(avatar),
        };
    }, [post]);

    // likes & comments initialiseren
    useEffect(() => {
        let initialLikes = 0;
        if (Array.isArray(post.likes)) {
            initialLikes = post.likes.length;
        } else if (typeof post.likes === "number") {
            initialLikes = post.likes;
        } else if (Array.isArray(post.likedBy)) {
            initialLikes = post.likedBy.length;
        }
        setLikes(initialLikes);

        setComments(
            Array.isArray(post.comments)
                ? post.comments
                : []
        );
    }, [post]);

    // user laden uit localStorage
    useEffect(() => {
        const storedUser =
            localStorage.getItem("ws_currentUser");
        if (!storedUser) return;

        try {
            const user = JSON.parse(storedUser);
            user.following = Array.isArray(user.following)
                ? user.following
                : [];
            user.followers = Array.isArray(user.followers)
                ? user.followers
                : [];
            setCurrentUser(user);

            const userId = user._id || user.id;
            if (userId) {
                // check like-status
                let liked = false;
                if (Array.isArray(post.likedBy)) {
                    liked = post.likedBy.some(
                        (id) => String(id) === String(userId)
                    );
                } else if (Array.isArray(post.likes)) {
                    liked = post.likes.some(
                        (id) => String(id) === String(userId)
                    );
                }
                setHasLiked(liked);
            }

            // check follow-status
            if (author.id && user.following) {
                const following = user.following.some(
                    (id) =>
                        String(id) ===
                        String(author.id)
                );
                setIsFollowing(following);
            }
        } catch (e) {
            console.error(
                "Failed to parse ws_currentUser:",
                e
            );
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [post._id, author.id]);

    const isOwnPost =
        currentUser &&
        author.id &&
        String(author.id) ===
        String(currentUser._id || currentUser.id);

    const postUrl =
        typeof window !== "undefined"
            ? `${window.location.origin}/post/${post._id}`
            : `/post/${post._id}`;
    const postTitle =
        post.title ||
        post.caption ||
        "Check out this post on World-Studio!";

    /* ------------------------------------------------------------
       SOCKET EVENTS (REALTIME LIKES & COMMENTS)
       ------------------------------------------------------------ */

    useEffect(() => {
        if (!socket) return;

        const handleUpdateLikes = ({
            postId,
            likes: newLikes,
        }) => {
            if (
                postId === post._id &&
                typeof newLikes === "number"
            ) {
                setLikes(newLikes);
            }
        };

        const handleUpdateComments = ({
            postId,
            comments: newComments,
        }) => {
            if (
                postId === post._id &&
                Array.isArray(newComments)
            ) {
                setComments(newComments);
            }
        };

        socket.on("update_likes", handleUpdateLikes);
        socket.on(
            "update_comments",
            handleUpdateComments
        );

        return () => {
            socket.off("update_likes", handleUpdateLikes);
            socket.off(
                "update_comments",
                handleUpdateComments
            );
        };
    }, [post._id]);

    /* ------------------------------------------------------------
       CLOSE MENU OUTSIDE CLICK
       ------------------------------------------------------------ */

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(e.target)
            ) {
                setShowMenu(false);
            }
        };
        document.addEventListener(
            "mousedown",
            handleClickOutside
        );
        return () =>
            document.removeEventListener(
                "mousedown",
                handleClickOutside
            );
    }, []);

    /* ------------------------------------------------------------
       FOLLOW / UNFOLLOW
       ------------------------------------------------------------ */

    const handleFollow = async (e) => {
        e.stopPropagation();

        if (!currentUser) {
            toast.error(
                "Please log in to follow users"
            );
            navigate("/login");
            return;
        }

        if (!author.id) {
            toast.error("Cannot follow this user");
            return;
        }

        const myId = currentUser._id || currentUser.id;
        if (String(author.id) === String(myId)) return;

        if (followLoading) return;
        setFollowLoading(true);

        const wasFollowing = isFollowing;
        setIsFollowing(!wasFollowing);

        try {
            await api.post(
                `/api/users/${author.id}/follow`
            );

            const updatedUser = {
                ...currentUser,
            };
            const currentFollowing = Array.isArray(
                updatedUser.following
            )
                ? updatedUser.following
                : [];

            if (wasFollowing) {
                updatedUser.following =
                    currentFollowing.filter(
                        (id) =>
                            String(id) !==
                            String(author.id)
                    );
            } else {
                updatedUser.following = [
                    ...currentFollowing,
                    author.id,
                ];
            }

            localStorage.setItem(
                "ws_currentUser",
                JSON.stringify(updatedUser)
            );
            setCurrentUser(updatedUser);

            toast.success(
                wasFollowing
                    ? "Unfollowed"
                    : `Following ${author.username}!`
            );
        } catch (err) {
            console.error("Follow error:", err);
            setIsFollowing(wasFollowing);
            toast.error(
                err.response?.data?.error ||
                err.response?.data?.message ||
                "Failed to follow user"
            );
        } finally {
            setFollowLoading(false);
        }
    };

    /* ------------------------------------------------------------
       LIKE / UNLIKE
       ------------------------------------------------------------ */

    const handleLike = async () => {
        if (!currentUser) {
            toast.error(
                "Please log in to like posts"
            );
            navigate("/login");
            return;
        }
        if (likeLoading) return;

        const wasLiked = hasLiked;
        const optimisticLikes = wasLiked
            ? likes - 1
            : likes + 1;

        setLikeLoading(true);
        setHasLiked(!wasLiked);
        setLikes(optimisticLikes);

        try {
            const res = await api.post(
                `/api/posts/${post._id}/like`
            );


            const newLikes =
                typeof res.data?.likes === "number"
                    ? res.data.likes
                    : optimisticLikes;

            setLikes(newLikes);

            if (socket) {
                socket.emit("likePost", {
                    postId: post._id,
                    username: currentUser.username,
                    likes: newLikes,
                });
            }

            onUpdate?.({
                ...post,
                likes: newLikes,
            });
        } catch (err) {
            console.error("Like error:", err);
            setHasLiked(wasLiked);
            // revert likes
            setLikes((prev) =>
                wasLiked ? prev + 1 : prev - 1
            );
            toast.error(
                err.response?.data?.error ||
                err.response?.data?.message ||
                "Failed to like post"
            );
        } finally {
            setLikeLoading(false);
        }
    };

    /* ------------------------------------------------------------
       COMMENT
       ------------------------------------------------------------ */

    const handleComment = async (e) => {
        e.preventDefault();

        if (!currentUser) {
            toast.error(
                "Please log in to comment"
            );
            navigate("/login");
            return;
        }

        const text = commentText.trim();
        if (!text) return;

        const tempId = `temp_${Date.now()}`;
        const newComment = {
            _id: tempId,
            username: currentUser.username,
            avatar: currentUser.avatar,
            user: {
                _id: currentUser._id || currentUser.id,
                username: currentUser.username,
                avatar: currentUser.avatar,
            },
            text,
            createdAt: new Date().toISOString(),
        };

        setComments((prev) => [...prev, newComment]);
        setCommentText("");

        try {
            const res = await api.post(
                `/api/posts/${post._id}/comment`,
                { text }
            );

            const updatedComments = Array.isArray(
                res.data?.comments
            )
                ? res.data.comments
                : null;

            if (updatedComments) {
                setComments(updatedComments);
                onUpdate?.({
                    ...post,
                    comments: updatedComments,
                });
                if (socket) {
                    socket.emit("commentPost", {
                        postId: post._id,
                        comments: updatedComments,
                    });
                }
            } else if (socket) {
                socket.emit("commentPost", {
                    postId: post._id,
                    comment: newComment,
                });
            }
        } catch (err) {
            console.error("Comment error:", err);
            setComments((prev) =>
                prev.filter((c) => c._id !== tempId)
            );
            setCommentText(text);
            toast.error(
                err.response?.data?.error ||
                err.response?.data?.message ||
                "Failed to post comment"
            );
        }
    };

    /* ------------------------------------------------------------
       DELETE POST
       ------------------------------------------------------------ */

    const handleDelete = async () => {
        if (!isOwnPost) return;
        setIsDeleting(true);

        try {
            await api.delete(
                `/api/posts/${post._id}`
            );
            toast.success("Post deleted!");
            setShowDeleteModal(false);
            onDelete?.(post._id);
        } catch (err) {
            console.error("Delete post error:", err);
            toast.error(
                err.response?.data?.error ||
                err.response?.data?.message ||
                "Failed to delete post"
            );
        } finally {
            setIsDeleting(false);
        }
    };

    /* ------------------------------------------------------------
       SAVE / UNSAVE (CLIENT SIDE)
       ------------------------------------------------------------ */

    const handleSave = () => {
        setIsSaved((prev) => !prev);
        toast.success(
            !isSaved ? "Saved!" : "Removed from saved"
        );
    };

    /* ------------------------------------------------------------
       NAVIGATION
       ------------------------------------------------------------ */

    const goToProfile = () => {
        if (author.id) {
            navigate(`/profile/${author.id}`);
        }
    };

    /* ------------------------------------------------------------
       MEDIA RESOLUTION
       ------------------------------------------------------------ */

    const mediaType =
        post.mediaType ||
        post.type ||
        (post.video ? "video" : "image");

    const mediaUrl = (() => {
        const raw =
            post.fileUrl ||
            post.mediaUrl ||
            post.image ||
            post.video ||
            post.url;
        if (!raw) return null;
        return resolveUrl(raw);
    })();

    const thumbnailUrl = post.thumbnail
        ? resolveUrl(post.thumbnail)
        : undefined;

    const views =
        typeof post.views === "number"
            ? post.views
            : typeof post.viewCount === "number"
                ? post.viewCount
                : 0;

    /* ============================================================
       RENDER
       ============================================================ */

    return (
        <>
            <article className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition">
                {/* HEADER */}
                <div className="p-4 flex items-center gap-3">
                    <div
                        className="flex items-center gap-3 flex-1 cursor-pointer hover:opacity-80 transition"
                        onClick={goToProfile}
                    >
                        <img
                            src={author.avatar}
                            alt="avatar"
                            className="w-10 h-10 rounded-full object-cover border border-white/20"
                            onError={(e) => {
                                e.target.src = `${API_BASE_URL}/defaults/default-avatar.png`;
                            }}
                        />
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-white truncate">
                                {author.username}
                            </h3>
                            <p className="text-xs text-white/50">
                                {formatDate(
                                    post.timestamp ||
                                    post.createdAt
                                )}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {!isOwnPost &&
                            currentUser &&
                            author.id && (
                                <button
                                    onClick={
                                        handleFollow
                                    }
                                    disabled={
                                        followLoading
                                    }
                                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition ${isFollowing
                                            ? "bg-white/10 text-white/70 hover:bg-white/20"
                                            : "bg-cyan-500 text-white hover:bg-cyan-400"
                                        }`}
                                >
                                    {followLoading ? (
                                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    ) : isFollowing ? (
                                        <>
                                            <UserCheck
                                                size={16}
                                            />{" "}
                                            Following
                                        </>
                                    ) : (
                                        <>
                                            <UserPlus
                                                size={16}
                                            />{" "}
                                            Follow
                                        </>
                                    )}
                                </button>
                            )}

                        <div
                            className="relative"
                            ref={menuRef}
                        >
                            <button
                                onClick={() =>
                                    setShowMenu(
                                        (prev) => !prev
                                    )
                                }
                                className="p-2 hover:bg-white/10 rounded-full transition"
                            >
                                <MoreHorizontal
                                    size={20}
                                    className="text-white/70"
                                />
                            </button>

                            {showMenu && (
                                <div className="absolute right-0 top-full mt-1 w-48 bg-gray-900 border border-white/10 rounded-xl shadow-xl overflow-hidden z-10">
                                    <button
                                        onClick={() => {
                                            setShowShareModal(
                                                true
                                            );
                                            setShowMenu(
                                                false
                                            );
                                        }}
                                        className="w-full px-4 py-3 text-left text-white hover:bg-white/10 transition flex items-center gap-3"
                                    >
                                        <Share2
                                            size={18}
                                        />
                                        Share post
                                    </button>
                                    <button
                                        onClick={() => {
                                            handleSave();
                                            setShowMenu(
                                                false
                                            );
                                        }}
                                        className="w-full px-4 py-3 text-left text-white hover:bg-white/10 transition flex items-center gap-3"
                                    >
                                        <Bookmark
                                            size={18}
                                            className={
                                                isSaved
                                                    ? "fill-current"
                                                    : ""
                                            }
                                        />
                                        {isSaved
                                            ? "Unsave"
                                            : "Save post"}
                                    </button>
                                    {isOwnPost && (
                                        <button
                                            onClick={() => {
                                                setShowDeleteModal(
                                                    true
                                                );
                                                setShowMenu(
                                                    false
                                                );
                                            }}
                                            className="w-full px-4 py-3 text-left text-red-400 hover:bg-red-500/10 transition flex items-center gap-3"
                                        >
                                            <Trash2
                                                size={18}
                                            />
                                            Delete post
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* CAPTION / TITLE */}
                {(post.caption || post.title) && (
                    <div className="px-4 pb-3">
                        <p className="text-white/90">
                            {post.caption ||
                                post.title}
                        </p>
                    </div>
                )}

                {/* MEDIA */}
                {mediaUrl && (
                    <div className="relative bg-black">
                        {mediaType === "video" ? (
                            <video
                                src={mediaUrl}
                                controls
                                className="w-full max-h-[500px] object-contain"
                                poster={thumbnailUrl}
                                playsInline
                            />
                        ) : mediaType === "audio" ? (
                            <div className="p-6 flex items-center justify-center bg-gradient-to-br from-purple-900/50 to-blue-900/50">
                                <audio
                                    src={mediaUrl}
                                    controls
                                    className="w-full max-w-md"
                                />
                            </div>
                        ) : (
                            <img
                                src={mediaUrl}
                                alt={
                                    post.title ||
                                    post.caption ||
                                    "Post"
                                }
                                className="w-full max-h-[500px] object-contain"
                                loading="lazy"
                                onError={(e) => {
                                    e.target.onerror =
                                        null;
                                    e.target.src = `${API_BASE_URL}/defaults/default-post.png`;
                                }}
                            />
                        )}
                    </div>
                )}

                {/* ACTIONS */}
                <div className="p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={handleLike}
                                disabled={likeLoading}
                                className={`flex items-center gap-2 transition ${hasLiked
                                        ? "text-red-500"
                                        : "text-white/70 hover:text-red-500"
                                    }`}
                            >
                                <Heart
                                    size={22}
                                    className={
                                        hasLiked
                                            ? "fill-current"
                                            : ""
                                    }
                                />
                                <span className="font-medium">
                                    {likes}
                                </span>
                            </button>

                            <button
                                onClick={() =>
                                    setShowComments(
                                        (prev) => !prev
                                    )
                                }
                                className="flex items-center gap-2 text-white/70 hover:text-cyan-400 transition"
                            >
                                <MessageCircle
                                    size={22}
                                />
                                <span className="font-medium">
                                    {
                                        comments.length
                                    }
                                </span>
                            </button>

                            <div className="flex items-center gap-2 text-white/50">
                                <Eye size={20} />
                                <span>{views}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() =>
                                    setShowShareModal(true)
                                }
                                className="p-2 text-white/70 hover:text-cyan-400 hover:bg-white/5 rounded-full transition"
                            >
                                <Share2 size={20} />
                            </button>
                            <button
                                onClick={handleSave}
                                className={`p-2 rounded-full transition ${isSaved
                                        ? "text-yellow-400"
                                        : "text-white/70 hover:text-yellow-400"
                                    }`}
                            >
                                <Bookmark
                                    size={20}
                                    className={
                                        isSaved
                                            ? "fill-current"
                                            : ""
                                    }
                                />
                            </button>
                        </div>
                    </div>

                    {/* COMMENTS */}
                    {showComments && (
                        <div className="mt-4 pt-4 border-t border-white/10">
                            <div className="space-y-3 max-h-60 overflow-y-auto mb-4">
                                {comments.length === 0 ? (
                                    <p className="text-white/40 text-center py-4">
                                        No comments yet
                                    </p>
                                ) : (
                                    comments.map(
                                        (
                                            comment,
                                            idx
                                        ) => (
                                            <div
                                                key={
                                                    comment._id ||
                                                    idx
                                                }
                                                className="flex gap-3"
                                            >
                                                <img
                                                    src={resolveAvatar(
                                                        comment.avatar ||
                                                        comment
                                                            .user
                                                            ?.avatar
                                                    )}
                                                    alt=""
                                                    className="w-8 h-8 rounded-full object-cover"
                                                    onError={(
                                                        e
                                                    ) => {
                                                        e.target.src =
                                                            `${API_BASE_URL}/defaults/default-avatar.png`;
                                                    }}
                                                />
                                                <div className="flex-1 bg-white/5 rounded-xl px-3 py-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-sm text-white">
                                                            {comment.username ||
                                                                comment
                                                                    .user
                                                                    ?.username ||
                                                                "User"}
                                                        </span>
                                                        <span className="text-xs text-white/40">
                                                            {formatDate(
                                                                comment.createdAt
                                                            )}
                                                        </span>
                                                    </div>
                                                    <p className="text-white/80 text-sm">
                                                        {
                                                            comment.text
                                                        }
                                                    </p>
                                                </div>
                                            </div>
                                        )
                                    )
                                )}
                            </div>

                            {currentUser && (
                                <form
                                    onSubmit={
                                        handleComment
                                    }
                                    className="flex gap-2"
                                >
                                    <img
                                        src={resolveAvatar(
                                            currentUser.avatar
                                        )}
                                        alt=""
                                        className="w-8 h-8 rounded-full object-cover"
                                        onError={(e) => {
                                            e.target.src = `${API_BASE_URL}/defaults/default-avatar.png`;
                                        }}
                                    />
                                    <input
                                        type="text"
                                        value={
                                            commentText
                                        }
                                        onChange={(e) =>
                                            setCommentText(
                                                e
                                                    .target
                                                    .value
                                            )
                                        }
                                        placeholder="Write a comment..."
                                        className="flex-1 px-4 py-2 bg-white/10 border border-white/10 rounded-full text-white placeholder-white/40 text-sm focus:outline-none focus:border-cyan-400"
                                    />
                                    <button
                                        type="submit"
                                        disabled={
                                            !commentText.trim()
                                        }
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

            {/* MODALS */}
            <ShareModal
                isOpen={showShareModal}
                onClose={() =>
                    setShowShareModal(false)
                }
                postUrl={postUrl}
                postTitle={postTitle}
            />
            <DeleteModal
                isOpen={showDeleteModal}
                onClose={() =>
                    setShowDeleteModal(false)
                }
                onConfirm={handleDelete}
                isDeleting={isDeleting}
            />
        </>
    );
}
