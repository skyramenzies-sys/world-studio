// src/components/ProfilePage.jsx - Universum Edition 🌌
// COMPLETE VERSION: Followers, Following, Avatar Upload, Notifications
import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    Loader2,
    ArrowLeft,
    Video,
    Gift,
    Users,
    Wallet as WalletIcon,
    Bell,
    X,
    Camera,
    Check,
    UserPlus,
    UserMinus,
    Settings,
    ChevronRight,
} from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../api/api";
import GiftPanel from "./GiftPanel";

/* ============================================================
   CONFIG & HELPERS
   ============================================================ */

const RAW_BASE_URL =
    import.meta.env.VITE_API_URL ||
    "https://world-studio-production.up.railway.app";

const API_BASE_URL = RAW_BASE_URL.replace(/\/api\/?$/, "").replace(/\/$/, "");

const resolveAvatar = (url) => {
    if (!url) return `${API_BASE_URL}/defaults/default-avatar.png`;
    if (url.startsWith("http")) return url;
    return `${API_BASE_URL}${url.startsWith("/") ? url : `/${url}`}`;
};


const getStoredUser = () => {
    if (typeof window === "undefined") return null;
    try {
        const raw =
            window.localStorage.getItem("ws_currentUser") ||
            window.localStorage.getItem("user");
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

const updateStoredUser = (updates) => {
    try {
        const current = getStoredUser();
        if (current) {
            const updated = { ...current, ...updates };
            window.localStorage.setItem("ws_currentUser", JSON.stringify(updated));
            window.localStorage.setItem("user", JSON.stringify(updated));
        }
    } catch (e) {
        console.error("Failed to update stored user:", e);
    }
};

/* ============================================================
   SUB-COMPONENTS
   ============================================================ */

// Modal Component
const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative bg-gray-900 border border-white/10 rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <h3 className="text-lg font-bold text-white">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition"
                    >
                        <X size={20} className="text-white/70" />
                    </button>
                </div>
                <div className="overflow-y-auto max-h-[60vh]">{children}</div>
            </div>
        </div>
    );
};

// Edit Profile Modal Component
const EditProfileModal = ({ isOpen, onClose, user, onSave }) => {
    const [formData, setFormData] = useState({
        username: user?.username || "",
        bio: user?.bio || "",
        location: user?.location || "",
        website: user?.website || "",
        displayName: user?.displayName || user?.username || "",
    });
    const [saving, setSaving] = useState(false);
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const fileInputRef = useRef(null);

    // Reset form when user changes
    useEffect(() => {
        if (user) {
            setFormData({
                username: user.username || "",
                bio: user.bio || "",
                location: user.location || "",
                website: user.website || "",
                displayName: user.displayName || user.username || "",
            });
        }
    }, [user]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file
        if (!file.type.startsWith("image/")) {
            toast.error("Please select an image file");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image must be less than 5MB");
            return;
        }

        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            // Upload avatar first if changed
            let newAvatarUrl = null;
            if (avatarFile) {
                const avatarFormData = new FormData();
                avatarFormData.append("avatar", avatarFile);

                const avatarRes = await api.post("/users/avatar", avatarFormData, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
                newAvatarUrl = avatarRes.data?.avatar || avatarRes.data?.url;
            }

            // Update profile
            const updateData = { ...formData };
            if (newAvatarUrl) {
                updateData.avatar = newAvatarUrl;
            }

            const res = await api.put("/users/profile", updateData);
            const updatedUser = res.data?.user || res.data;

            // Update localStorage
            updateStoredUser(updatedUser);

            toast.success("Profile updated! ✨");
            onSave?.(updatedUser);
            onClose();
        } catch (err) {
            console.error("Profile update error:", err);
            toast.error(err.response?.data?.message || "Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    // Cleanup preview URL
    useEffect(() => {
        return () => {
            if (avatarPreview) URL.revokeObjectURL(avatarPreview);
        };
    }, [avatarPreview]);

    if (!isOpen) return null;

    const currentAvatar = avatarPreview || resolveAvatar(user?.avatar);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative bg-gray-900 border border-white/10 rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <h3 className="text-lg font-bold text-white">Edit Profile</h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition"
                    >
                        <X size={20} className="text-white/70" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto max-h-[70vh]">
                    {/* Avatar */}
                    <div className="flex flex-col items-center gap-3">
                        <div className="relative">
                            <img
                                src={currentAvatar}
                                alt="Avatar"
                                className="w-24 h-24 rounded-full object-cover border-4 border-white/20"
                                onError={(e) => {
                                    e.target.src = `${API_BASE_URL}/defaults/default-avatar.png`;
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute bottom-0 right-0 p-2 bg-cyan-500 hover:bg-cyan-600 rounded-full transition"
                            >
                                <Camera size={16} className="text-white" />
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarChange}
                                className="hidden"
                            />
                        </div>
                        <p className="text-xs text-white/50">Tap to change avatar</p>
                    </div>

                    {/* Display Name */}
                    <div>
                        <label className="block text-sm text-white/70 mb-1">
                            Display Name
                        </label>
                        <input
                            type="text"
                            name="displayName"
                            value={formData.displayName}
                            onChange={handleChange}
                            maxLength={50}
                            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-cyan-500 transition"
                            placeholder="Your display name"
                        />
                    </div>

                    {/* Username */}
                    <div>
                        <label className="block text-sm text-white/70 mb-1">
                            Username
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50">@</span>
                            <input
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                maxLength={30}
                                className="w-full pl-8 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-cyan-500 transition"
                                placeholder="username"
                            />
                        </div>
                    </div>

                    {/* Bio */}
                    <div>
                        <label className="block text-sm text-white/70 mb-1">
                            Bio
                        </label>
                        <textarea
                            name="bio"
                            value={formData.bio}
                            onChange={handleChange}
                            maxLength={160}
                            rows={3}
                            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-cyan-500 transition resize-none"
                            placeholder="Tell us about yourself..."
                        />
                        <p className="text-xs text-white/40 mt-1 text-right">
                            {formData.bio.length}/160
                        </p>
                    </div>

                    {/* Location */}
                    <div>
                        <label className="block text-sm text-white/70 mb-1">
                            Location
                        </label>
                        <input
                            type="text"
                            name="location"
                            value={formData.location}
                            onChange={handleChange}
                            maxLength={50}
                            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-cyan-500 transition"
                            placeholder="City, Country"
                        />
                    </div>

                    {/* Website */}
                    <div>
                        <label className="block text-sm text-white/70 mb-1">
                            Website
                        </label>
                        <input
                            type="url"
                            name="website"
                            value={formData.website}
                            onChange={handleChange}
                            maxLength={100}
                            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-cyan-500 transition"
                            placeholder="https://yoursite.com"
                        />
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-xl font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Check size={18} />
                                Save Changes
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

// User List Item (for followers/following)
const UserListItem = ({ user, onFollow, onUnfollow, isFollowing, currentUserId }) => {
    const navigate = useNavigate();
    const isOwnProfile = user._id === currentUserId || user.id === currentUserId;

    return (
        <div className="flex items-center justify-between p-3 hover:bg-white/5 transition">
            <div
                className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                onClick={() => navigate(`/profile/${user._id || user.id}`)}
            >
                <img
                    src={resolveAvatar(user.avatar)}
                    alt={user.username}
                    className="w-10 h-10 rounded-full object-cover border-2 border-white/20"
                    onError={(e) => {
                        e.target.src = `${API_BASE_URL}/defaults/default-avatar.png`;
                    }}
                />
                <div className="min-w-0">
                    <p className="font-semibold text-white truncate">
                        {user.username || "Unknown"}
                    </p>
                    {user.bio && (
                        <p className="text-xs text-white/50 truncate">{user.bio}</p>
                    )}
                </div>
            </div>
            {!isOwnProfile && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        isFollowing ? onUnfollow(user._id || user.id) : onFollow(user._id || user.id);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${isFollowing
                            ? "bg-white/10 text-white/70 hover:bg-red-500/20 hover:text-red-400"
                            : "bg-cyan-500 text-white hover:bg-cyan-600"
                        }`}
                >
                    {isFollowing ? "Unfollow" : "Follow"}
                </button>
            )}
        </div>
    );
};

// Notification Item - Works with embedded User.notifications structure
const NotificationItem = ({ notification, onRead, onNavigate }) => {
    const getIcon = () => {
        // Check for custom icon first
        if (notification.icon) {
            return <span>{notification.icon}</span>;
        }

        switch (notification.type) {
            case "follow":
                return <UserPlus size={16} className="text-cyan-400" />;
            case "gift":
                return <Gift size={16} className="text-pink-400" />;
            case "like":
                return <span>❤️</span>;
            case "comment":
                return <span>💬</span>;
            case "live":
            case "stream":
                return <Video size={16} className="text-red-400" />;
            case "mention":
                return <span>@</span>;
            case "purchase":
            case "subscription":
                return <span>💰</span>;
            case "pk_challenge":
            case "pk_result":
                return <span>⚔️</span>;
            case "achievement":
                return <span>🏆</span>;
            case "warning":
                return <span>⚠️</span>;
            case "payout":
                return <span>💸</span>;
            default:
                return <Bell size={16} className="text-white/50" />;
        }
    };

    const timeAgo = (date) => {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        if (seconds < 60) return "just now";
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    };

    // Get avatar from notification or use default
    const fromAvatar = notification.fromAvatar
        ? resolveAvatar(notification.fromAvatar)
        : null;

    return (
        <div
            className={`flex items-start gap-3 p-3 cursor-pointer transition ${notification.read ? "bg-transparent" : "bg-cyan-500/10"
                } hover:bg-white/5`}
            onClick={() => {
                if (!notification.read) onRead(notification._id);
                // Use actionUrl (from backend) or link (fallback)
                const navUrl = notification.actionUrl || notification.link;
                if (navUrl) onNavigate(navUrl);
            }}
        >
            {/* Show sender avatar if available, otherwise icon */}
            {fromAvatar ? (
                <img
                    src={fromAvatar}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    onError={(e) => {
                        e.target.style.display = 'none';
                    }}
                />
            ) : (
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                    {getIcon()}
                </div>
            )}
            <div className="flex-1 min-w-0">
                <p className="text-sm text-white/90">{notification.message}</p>
                {notification.fromUsername && (
                    <p className="text-xs text-cyan-400 mt-0.5">@{notification.fromUsername}</p>
                )}
                <p className="text-xs text-white/40 mt-1">{timeAgo(notification.createdAt)}</p>
            </div>
            {!notification.read && (
                <div className="w-2 h-2 bg-cyan-400 rounded-full flex-shrink-0 mt-2" />
            )}
        </div>
    );
};

// Avatar Upload Component
const AvatarUpload = ({ currentAvatar, onUploadSuccess }) => {
    const fileInputRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState(null);

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
        if (!allowedTypes.includes(file.type)) {
            toast.error("Only images are allowed (JPG, PNG, GIF, WebP)");
            return;
        }

        // Validate file size (5MB max for avatars)
        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image must be smaller than 5MB");
            return;
        }

        // Show preview
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target.result);
        reader.readAsDataURL(file);

        // Upload
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("avatar", file);

            const response = await api.post("/upload/avatar", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            if (response.data.success) {
                toast.success("Avatar updated! 🎉");
                onUploadSuccess(response.data.avatar);
                updateStoredUser({ avatar: response.data.avatar });
            } else {
                throw new Error(response.data.error || "Upload failed");
            }
        } catch (err) {
            console.error("Avatar upload error:", err);
            toast.error(err.response?.data?.error || "Failed to upload avatar");
            setPreview(null);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="relative group">
            <img
                src={preview || resolveAvatar(currentAvatar)}
                alt="avatar"
                className="w-24 h-24 rounded-full object-cover border-4 border-cyan-500/50"
                onError={(e) => {
                    e.target.src = `${API_BASE_URL}/defaults/default-avatar.png`;
                }}
            />
            <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
                {uploading ? (
                    <Loader2 size={24} className="text-white animate-spin" />
                ) : (
                    <Camera size={24} className="text-white" />
                )}
            </button>
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleFileSelect}
                className="hidden"
            />
        </div>
    );
};

/* ============================================================
   MAIN COMPONENT
   ============================================================ */

export default function ProfilePage() {
    const { userId: routeUserId } = useParams();
    const navigate = useNavigate();

    // Core state
    const [profile, setProfile] = useState(null);
    const [streams, setStreams] = useState([]);
    const [receivedGifts, setReceivedGifts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Followers/Following state
    const [followers, setFollowers] = useState([]);
    const [following, setFollowing] = useState([]);
    const [showFollowersModal, setShowFollowersModal] = useState(false);
    const [showFollowingModal, setShowFollowingModal] = useState(false);
    const [loadingFollowers, setLoadingFollowers] = useState(false);
    const [loadingFollowing, setLoadingFollowing] = useState(false);
    const [isFollowingUser, setIsFollowingUser] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);

    // Notifications state
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loadingNotifications, setLoadingNotifications] = useState(false);

    // Edit profile state
    const [showEditModal, setShowEditModal] = useState(false);

    // User data
    const viewer = useMemo(() => getStoredUser(), []);
    const targetUserId = useMemo(
        () => routeUserId || viewer?._id || viewer?.id || viewer?.userId || null,
        [routeUserId, viewer]
    );

    const isOwnProfile = useMemo(() => {
        if (!viewer || !targetUserId) return false;
        const vId = viewer._id || viewer.id || viewer.userId;
        return String(vId) === String(targetUserId);
    }, [viewer, targetUserId]);

    const currentUserId = viewer?._id || viewer?.id || viewer?.userId;

    /* ============================================================
       FETCH PROFILE DATA
       ============================================================ */
    useEffect(() => {


        if (!targetUserId) {
            setError("No user profile found");
            setLoading(false);
            return;
        }

        let cancelled = false;
        setLoading(true);
        setError("");

        const fetchAll = async () => {
            try {
                window.scrollTo({ top: 0, behavior: "smooth" });

                const [profileRes, streamsRes, giftsRes] = await Promise.all([
                    api.get(`/users/${targetUserId}`).catch(() => ({ data: null })),
                    api.get("/live", { params: { userId: targetUserId } }).catch(() => ({ data: [] })),
                    api.get("/gifts/received").catch(() => ({ data: [] })),
                ]);

                if (cancelled) return;

                if (!profileRes.data) {
                    setError("User not found");

                    return;
                }

                const userData = profileRes.data;
                userData.avatar = resolveAvatar(userData.avatar);

                setProfile(userData);
                setStreams(streamsRes.data?.streams || streamsRes.data || []);
                setReceivedGifts(giftsRes.data?.gifts || giftsRes.data || []);

                // Check if current user follows this profile
                if (!isOwnProfile && currentUserId) {
                    const followersArray = userData.followers || [];
                    setIsFollowingUser(followersArray.includes(currentUserId));
                }
            } catch (err) {
                console.error("Failed to fetch profile:", err);
                if (!cancelled) {
                    setError("Failed to load profile");
                    toast.error("Failed to load profile");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchAll();
        return () => { cancelled = true; };
    }, [targetUserId, isOwnProfile, currentUserId]);

    /* ============================================================
       FETCH NOTIFICATIONS (only for own profile)
       ============================================================ */
    useEffect(() => {
        if (!isOwnProfile) return;

        const fetchNotifications = async () => {
            try {
                const res = await api.get("/notifications");
                // Backend returns { success, notifications, unreadCount, total, page, totalPages }
                const notifs = res.data?.notifications || [];
                const unread = res.data?.unreadCount ?? notifs.filter((n) => !n.read).length;
                setNotifications(notifs);
                setUnreadCount(unread);
            } catch (err) {
                console.error("Failed to fetch notifications:", err);
                // Don't show error toast - notifications are non-critical
            }
        };

        fetchNotifications();

        // Poll for new notifications every 30 seconds
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [isOwnProfile]);

    /* ============================================================
       SOCKET LISTENERS FOR REAL-TIME NOTIFICATIONS
       ============================================================ */
    useEffect(() => {
        if (!isOwnProfile) return;

        // Get socket from window (common pattern) or import
        const socket = window.socket;
        if (!socket) return;

        const handleNewNotification = (notification) => {
            setNotifications((prev) => [notification, ...prev].slice(0, 100));
            setUnreadCount((prev) => prev + 1);

            // Show toast for new notification
            toast(notification.message, {
                icon: notification.icon || "🔔",
                duration: 4000,
            });
        };

        const handleNewFollower = (data) => {
            toast.success(`${data.username} started following you! 🎉`);
        };

        socket.on("new_notification", handleNewNotification);
        socket.on("new_follower", handleNewFollower);

        return () => {
            socket.off("new_notification", handleNewNotification);
            socket.off("new_follower", handleNewFollower);
        };
    }, [isOwnProfile]);

    /* ============================================================
       FOLLOWERS/FOLLOWING HANDLERS
       ============================================================ */
    const fetchFollowers = useCallback(async () => {
        if (!targetUserId) return;
        setLoadingFollowers(true);
        try {
            const res = await api.get(`/users/${targetUserId}/followers`);
            setFollowers(res.data?.followers || res.data || []);
        } catch (err) {
            console.error("Failed to fetch followers:", err);
            toast.error("Failed to load followers");
        } finally {
            setLoadingFollowers(false);
        }
    }, [targetUserId]);

    const fetchFollowing = useCallback(async () => {
        if (!targetUserId) return;
        setLoadingFollowing(true);
        try {
            const res = await api.get(`/users/${targetUserId}/following`);
            setFollowing(res.data?.following || res.data || []);
        } catch (err) {
            console.error("Failed to fetch following:", err);
            toast.error("Failed to load following");
        } finally {
            setLoadingFollowing(false);
        }
    }, [targetUserId]);

    const handleOpenFollowers = () => {
        setShowFollowersModal(true);
        fetchFollowers();
    };

    const handleOpenFollowing = () => {
        setShowFollowingModal(true);
        fetchFollowing();
    };

    const handleFollow = async (userIdToFollow) => {
        if (!currentUserId) {
            toast.error("Please login to follow users");
            navigate("/login");
            return;
        }

        setFollowLoading(true);
        try {
            await api.post(`/users/${userIdToFollow}/follow`);
            toast.success("Followed! 🎉");

            // Update local state
            if (userIdToFollow === targetUserId) {
                setIsFollowingUser(true);
                setProfile((prev) => ({
                    ...prev,
                    followers: [...(prev?.followers || []), currentUserId],
                }));
            }

            // Refresh followers/following lists if modal is open
            if (showFollowersModal) fetchFollowers();
            if (showFollowingModal) fetchFollowing();
        } catch (err) {
            console.error("Follow error:", err);
            toast.error(err.response?.data?.error || "Failed to follow");
        } finally {
            setFollowLoading(false);
        }
    };

    const handleUnfollow = async (userIdToUnfollow) => {
        setFollowLoading(true);
        try {
            await api.post(`/users/${userIdToUnfollow}/unfollow`);
            toast.success("Unfollowed");

            // Update local state
            if (userIdToUnfollow === targetUserId) {
                setIsFollowingUser(false);
                setProfile((prev) => ({
                    ...prev,
                    followers: (prev?.followers || []).filter((id) => id !== currentUserId),
                }));
            }

            // Refresh lists
            if (showFollowersModal) fetchFollowers();
            if (showFollowingModal) fetchFollowing();
        } catch (err) {
            console.error("Unfollow error:", err);
            toast.error(err.response?.data?.error || "Failed to unfollow");
        } finally {
            setFollowLoading(false);
        }
    };

    /* ============================================================
       NOTIFICATION HANDLERS
       ============================================================ */
    const handleReadNotification = async (notificationId) => {
        try {
            await api.put(`/notifications/${notificationId}/read`);
            setNotifications((prev) =>
                prev.map((n) => (n._id === notificationId ? { ...n, read: true } : n))
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch (err) {
            console.error("Failed to mark notification as read:", err);
        }
    };

    const handleReadAllNotifications = async () => {
        try {
            await api.put("/notifications/read-all");
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
            setUnreadCount(0);
            toast.success("All notifications marked as read");
        } catch (err) {
            console.error("Failed to mark all as read:", err);
        }
    };

    /* ============================================================
       AVATAR UPDATE HANDLER
       ============================================================ */
    const handleAvatarUpdate = (newAvatarUrl) => {
        setProfile((prev) => ({ ...prev, avatar: newAvatarUrl }));
    };

    /* ============================================================
       COMPUTED VALUES
       ============================================================ */
    const wallet = profile?.wallet || {};
    const stats = {
        followers: profile?.followers?.length ?? profile?.followersCount ?? 0,
        following: profile?.following?.length ?? profile?.followingCount ?? 0,
        streams: profile?.totalStreams ?? streams?.length ?? 0,
        coins: wallet.balance ?? 0,
        earnings: profile?.totalEarnings ?? 0,
        totalReceived: wallet.totalReceived ?? 0,
        totalSpent: wallet.totalSpent ?? 0,
    };

    /* ============================================================
       RENDER STATES
       ============================================================ */


    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
                    <p className="text-white/70">Loading profile...</p>
                </div>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
                <div className="text-center max-w-md">
                    <div className="w-24 h-24 mx-auto mb-6 bg-white/5 rounded-full flex items-center justify-center">
                        <span className="text-5xl">😢</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">
                        {error === "User not found" ? "User Not Found" : "Profile Error"}
                    </h1>
                    <p className="text-white/60 mb-6">
                        {error === "User not found"
                            ? "This creator may have deleted their account or it never existed."
                            : error || "Something went wrong while loading this profile."}
                    </p>
                    <button
                        onClick={() => navigate(-1)}
                        className="px-6 py-3 bg-white/10 rounded-xl font-semibold hover:bg-white/20 transition"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }



    const joinedAt = profile.createdAt
        ? new Date(profile.createdAt).toLocaleDateString()
        : null;

    /* ============================================================
       MAIN RENDER
       ============================================================ */
    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white">
            <div className="max-w-4xl mx-auto px-4 py-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold">
                                {isOwnProfile ? "My Profile" : "Creator Profile"}
                            </h1>
                            {joinedAt && (
                                <p className="text-xs text-white/50">Joined {joinedAt}</p>
                            )}
                        </div>
                    </div>

                    {/* Notifications Bell (only for own profile) */}
                    {isOwnProfile && (
                        <button
                            onClick={() => setShowNotifications(true)}
                            className="relative p-2 bg-white/10 rounded-xl hover:bg-white/20 transition"
                        >
                            <Bell size={20} />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center font-bold">
                                    {unreadCount > 9 ? "9+" : unreadCount}
                                </span>
                            )}
                        </button>
                    )}
                </div>

                {/* Top Card */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6 flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex items-center gap-4 flex-1">
                        {/* Avatar with upload capability for own profile */}
                        {isOwnProfile ? (
                            <AvatarUpload
                                currentAvatar={profile.avatar}
                                onUploadSuccess={handleAvatarUpdate}
                            />
                        ) : (
                            <img
                                src={profile.avatar || `${API_BASE_URL}/defaults/default-avatar.png`}
                                alt="avatar"
                                className="w-24 h-24 rounded-full object-cover border-4 border-cyan-500/50"
                                onError={(e) => {
                                    e.target.src = `${API_BASE_URL}/defaults/default-avatar.png`;
                                }}
                            />
                        )}
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="text-2xl font-bold truncate">
                                    {profile.username || "Unknown"}
                                </h2>
                                {profile.role === "admin" && (
                                    <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
                                        👑 ADMIN
                                    </span>
                                )}
                                {profile.isVerified && (
                                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                                        ✓ Verified
                                    </span>
                                )}
                            </div>
                            {profile.email && isOwnProfile && (
                                <p className="text-white/50 text-xs mt-1 truncate">{profile.email}</p>
                            )}
                            {profile.bio && (
                                <p className="text-white/70 text-sm mt-2 line-clamp-2">{profile.bio}</p>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col items-stretch gap-2 w-full md:w-auto">
                        {isOwnProfile ? (
                            <>
                                <button
                                    onClick={() => setShowEditModal(true)}
                                    className="w-full px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-semibold transition flex items-center justify-center gap-2"
                                >
                                    <Settings size={16} />
                                    Edit Profile
                                </button>
                                <button
                                    onClick={() => navigate("/upload")}
                                    className="w-full px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:shadow-lg text-sm font-semibold transition"
                                >
                                    Go Live / Upload
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={() =>
                                        isFollowingUser
                                            ? handleUnfollow(targetUserId)
                                            : handleFollow(targetUserId)
                                    }
                                    disabled={followLoading}
                                    className={`w-full px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 ${isFollowingUser
                                            ? "bg-white/10 text-white/70 hover:bg-red-500/20 hover:text-red-400"
                                            : "bg-cyan-500/80 hover:bg-cyan-500"
                                        }`}
                                >
                                    {followLoading ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : isFollowingUser ? (
                                        <>
                                            <UserMinus size={16} />
                                            Unfollow
                                        </>
                                    ) : (
                                        <>
                                            <UserPlus size={16} />
                                            Follow
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => navigate(`/messages/${targetUserId}`)}
                                    className="w-full px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-semibold transition"
                                >
                                    Message
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Stats - CLICKABLE for followers/following */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    <button
                        onClick={handleOpenFollowers}
                        className="bg-white/5 border border-white/10 rounded-xl p-3 text-center hover:bg-white/10 transition group"
                    >
                        <p className="text-xs text-white/50 mb-1">Followers</p>
                        <p className="text-xl font-bold text-cyan-400">{stats.followers}</p>
                        <ChevronRight size={14} className="mx-auto mt-1 text-white/30 group-hover:text-white/60" />
                    </button>
                    <button
                        onClick={handleOpenFollowing}
                        className="bg-white/5 border border-white/10 rounded-xl p-3 text-center hover:bg-white/10 transition group"
                    >
                        <p className="text-xs text-white/50 mb-1">Following</p>
                        <p className="text-xl font-bold text-purple-400">{stats.following}</p>
                        <ChevronRight size={14} className="mx-auto mt-1 text-white/30 group-hover:text-white/60" />
                    </button>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                        <p className="text-xs text-white/50 mb-1">Streams</p>
                        <p className="text-xl font-bold text-pink-400">{stats.streams}</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                        <p className="text-xs text-white/50 mb-1">Coins (Balance)</p>
                        <p className="text-xl font-bold text-yellow-400">🪙 {stats.coins}</p>
                    </div>
                </div>

                {/* Wallet Card (only for own profile) */}
                {isOwnProfile && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <WalletIcon className="w-4 h-4 text-emerald-400" />
                                <h3 className="font-semibold text-sm text-white/80">
                                    Wallet & Earnings
                                </h3>
                            </div>
                            <button
                                onClick={() => navigate("/wallet")}
                                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                            >
                                Manage <ChevronRight size={14} />
                            </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="bg-black/20 rounded-xl p-3">
                                <p className="text-xs text-white/50 mb-1">Current Balance</p>
                                <p className="text-lg font-bold text-yellow-400">🪙 {stats.coins}</p>
                            </div>
                            <div className="bg-black/20 rounded-xl p-3">
                                <p className="text-xs text-white/50 mb-1">Total Received</p>
                                <p className="text-lg font-bold text-emerald-400">🪙 {stats.totalReceived}</p>
                            </div>
                            <div className="bg-black/20 rounded-xl p-3">
                                <p className="text-xs text-white/50 mb-1">Total Spent</p>
                                <p className="text-lg font-bold text-red-400">🪙 {stats.totalSpent}</p>
                            </div>
                        </div>
                        {stats.earnings > 0 && (
                            <p className="mt-3 text-xs text-white/60">
                                Estimated earnings:{" "}
                                <span className="font-semibold text-emerald-400">{stats.earnings}</span>
                            </p>
                        )}
                    </div>
                )}

                {/* Layout: Streams + Gifts */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Streams & activity */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Video className="w-4 h-4 text-red-400" />
                            <h3 className="font-semibold text-sm text-white/80">
                                Live & Recent Streams
                            </h3>
                        </div>
                        <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                            {streams.length === 0 ? (
                                <p className="text-white/40 text-sm py-4 text-center">
                                    {isOwnProfile
                                        ? "You haven't gone live yet. Start your first stream!"
                                        : "This creator has no streams yet."}
                                </p>
                            ) : (
                                streams.map((s) => (
                                    <div
                                        key={s._id}
                                        className={`flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-3 ${s.isLive ? "border-red-500/50 bg-red-500/10" : ""
                                            }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            {s.isLive && (
                                                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
                                            )}
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold truncate">
                                                    {s.title || "Untitled Stream"}
                                                </p>
                                                <p className="text-xs text-white/50">
                                                    {s.category || "General"} • 👁 {s.viewers || 0}
                                                </p>
                                            </div>
                                        </div>
                                        {s.isLive && (
                                            <button
                                                onClick={() => navigate(`/live/${s._id}`)}
                                                className="text-xs px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 font-semibold transition"
                                            >
                                                Watch Live
                                            </button>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Gifts + Community */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Gift className="w-4 h-4 text-pink-400" />
                            <h3 className="font-semibold text-sm text-white/80">
                                {isOwnProfile ? "My Gifts" : "Recent Gifts"}
                            </h3>

                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                            {isOwnProfile ? (
                                <GiftPanel receivedGifts={receivedGifts} user={profile} />
                            ) : receivedGifts.length === 0 ? (
                                <p className="text-white/40 text-sm text-center py-4">
                                    No public gift data.
                                </p>
                            ) : (
                                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                    {receivedGifts.slice(0, 5).map((g) => (
                                        <div
                                            key={g._id}
                                            className="flex items-center justify-between text-xs bg-white/5 rounded-lg px-2 py-1.5"
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span>🎁</span>
                                                <span className="truncate">
                                                    {g.fromUsername || "Anonymous"} → {g.giftName || "Gift"}
                                                </span>
                                            </div>
                                            <span className="text-pink-400 font-semibold">
                                                {g.coins || g.amount || 0}🪙
                                            </span>
                                        </div>
                                    ))}
                                    {receivedGifts.length > 5 && (
                                        <p className="text-white/40 text-[11px] text-right mt-1">
                                            +{receivedGifts.length - 5} more
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Social proof */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                            <div className="flex items-center gap-2 mb-2">
                                <Users className="w-4 h-4 text-cyan-400" />
                                <p className="text-xs font-semibold text-white/80">Community</p>
                            </div>
                            <p className="text-xs text-white/60">
                                {isOwnProfile
                                    ? "Keep streaming, posting and engaging – your World-Studio community grows with every live session."
                                    : "Follow and support this creator to help their World-Studio journey grow."}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ============================================================
               MODALS
               ============================================================ */}

            {/* Followers Modal */}
            <Modal
                isOpen={showFollowersModal}
                onClose={() => setShowFollowersModal(false)}
                title={`Followers (${stats.followers})`}
            >
                {loadingFollowers ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                    </div>
                ) : followers.length === 0 ? (
                    <div className="text-center py-8">
                        <Users className="w-12 h-12 text-white/20 mx-auto mb-3" />
                        <p className="text-white/50">No followers yet</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/10">
                        {followers.map((user) => (
                            <UserListItem
                                key={user._id || user.id}
                                user={user}
                                onFollow={handleFollow}
                                onUnfollow={handleUnfollow}
                                isFollowing={following.some(
                                    (f) => (f._id || f.id) === (user._id || user.id)
                                )}
                                currentUserId={currentUserId}
                            />
                        ))}
                    </div>
                )}
            </Modal>

            {/* Following Modal */}
            <Modal
                isOpen={showFollowingModal}
                onClose={() => setShowFollowingModal(false)}
                title={`Following (${stats.following})`}
            >
                {loadingFollowing ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                    </div>
                ) : following.length === 0 ? (
                    <div className="text-center py-8">
                        <Users className="w-12 h-12 text-white/20 mx-auto mb-3" />
                        <p className="text-white/50">Not following anyone yet</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/10">
                        {following.map((user) => (
                            <UserListItem
                                key={user._id || user.id}
                                user={user}
                                onFollow={handleFollow}
                                onUnfollow={handleUnfollow}
                                isFollowing={true}
                                currentUserId={currentUserId}
                            />
                        ))}
                    </div>
                )}
            </Modal>

            {/* Notifications Modal */}
            <Modal
                isOpen={showNotifications}
                onClose={() => setShowNotifications(false)}
                title="Notifications"
            >
                <div className="border-b border-white/10 px-4 py-2 flex items-center justify-between">
                    <p className="text-xs text-white/50">
                        {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
                    </p>
                    {unreadCount > 0 && (
                        <button
                            onClick={handleReadAllNotifications}
                            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                        >
                            <Check size={12} />
                            Mark all read
                        </button>
                    )}
                </div>
                {notifications.length === 0 ? (
                    <div className="text-center py-8">
                        <Bell className="w-12 h-12 text-white/20 mx-auto mb-3" />
                        <p className="text-white/50">No notifications yet</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/10">
                        {notifications.map((notif) => (
                            <NotificationItem
                                key={notif._id}
                                notification={notif}
                                onRead={handleReadNotification}
                                onNavigate={(link) => {
                                    setShowNotifications(false);
                                    navigate(link);
                                }}
                            />
                        ))}
                    </div>
                )}
            </Modal>

            {/* Edit Profile Modal */}
            <EditProfileModal
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                user={profile}
                onSave={(updatedUser) => {
                    // Update local profile state
                    setProfile((prev) => ({ ...prev, ...updatedUser }));
                }}
            />
        </div>
    );
}
