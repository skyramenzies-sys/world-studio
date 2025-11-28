// src/components/ProfilePage.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../api/api";
import GiftPanel from "./GiftPanel";

export default function ProfilePage() {
    const { userId: paramUserId } = useParams();
    const navigate = useNavigate();

    // Haal current user uit localStorage
    const [currentUser, setCurrentUser] = useState(null);
    const [token, setToken] = useState(null);

    // Profile state
    const [profile, setProfile] = useState(null);
    const [streams, setStreams] = useState([]);
    const [receivedGifts, setReceivedGifts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [giftSending, setGiftSending] = useState(false);

    // Edit mode state
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        username: "",
        bio: "",
        avatar: "",
    });
    const [avatarUploading, setAvatarUploading] = useState(false);
    const avatarInputRef = React.useRef(null);

    // Load current user from localStorage on mount
    useEffect(() => {
        const storedToken = localStorage.getItem("token");
        const storedUser = localStorage.getItem("ws_currentUser");

        if (storedToken) {
            setToken(storedToken);
        }

        if (storedUser) {
            try {
                const parsed = JSON.parse(storedUser);
                setCurrentUser(parsed);
            } catch (e) {
                console.error("Failed to parse stored user:", e);
            }
        }
    }, []);

    // Bepaal welke userId we moeten laden
    const targetUserId = paramUserId || currentUser?._id || currentUser?.id;

    // Check if viewing own profile
    const isOwnProfile = React.useMemo(() => {
        if (!currentUser || !targetUserId) return false;
        const currentUserId = currentUser._id || currentUser.id;
        return String(currentUserId) === String(targetUserId);
    }, [currentUser, targetUserId]);

    // Fetch profile data
    useEffect(() => {
        if (!targetUserId) {
            if (currentUser === null) {
                // Still loading from localStorage, wait
                return;
            }
            setLoading(false);
            return;
        }

        let cancelled = false;
        setLoading(true);
        setError("");

        const fetchAll = async () => {
            try {
                // Fetch profile
                const profileRes = await api.get(`/users/${targetUserId}`);

                if (cancelled) return;

                const profileData = profileRes.data;
                if (!profileData) {
                    setError("User not found");
                    setLoading(false);
                    return;
                }

                setProfile(profileData);
                setEditForm({
                    username: profileData.username || "",
                    bio: profileData.bio || "",
                    avatar: profileData.avatar || "",
                });

                // Fetch streams
                try {
                    const streamsRes = await api.get(`/live?userId=${targetUserId}`);
                    setStreams(Array.isArray(streamsRes.data) ? streamsRes.data : []);
                } catch (e) {
                    setStreams([]);
                }

                // Fetch gifts if own profile
                if (token && isOwnProfile) {
                    try {
                        const giftsRes = await api.get("/gifts/received");
                        setReceivedGifts(Array.isArray(giftsRes.data) ? giftsRes.data : []);
                    } catch (e) {
                        setReceivedGifts([]);
                    }
                }

            } catch (err) {
                console.error("ProfilePage fetch error:", err);
                if (!cancelled) {
                    setError(err.response?.data?.error || err.message || "Failed to load profile");
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        fetchAll();
        return () => { cancelled = true; };
    }, [targetUserId, token, isOwnProfile, currentUser]);

    // Handle gift sending
    const handleSendGift = async (giftData) => {
        if (!token) {
            toast.error("Please log in to send gifts");
            return;
        }

        setGiftSending(true);

        try {
            await api.post("/gifts", {
                recipientId: profile._id,
                item: giftData.item,
                amount: giftData.amount || 1,
                itemIcon: giftData.itemIcon,
            });

            toast.success(`Gift sent to ${profile.username}! 🎁`);
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to send gift");
        } finally {
            setGiftSending(false);
        }
    };

    // Handle profile update
    const handleUpdateProfile = async (e) => {
        e.preventDefault();

        try {
            const response = await api.put(`/users/${targetUserId}`, editForm);

            setProfile(response.data);
            setIsEditing(false);

            // Update localStorage
            const updatedUser = { ...currentUser, ...response.data };
            localStorage.setItem("ws_currentUser", JSON.stringify(updatedUser));
            setCurrentUser(updatedUser);

            toast.success("Profile updated! ✨");
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to update profile");
        }
    };

    // Handle logout
    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("ws_currentUser");
        toast.success("Logged out successfully");
        navigate("/login");
    };

    // Handle avatar upload
    const handleAvatarUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith("image/")) {
            toast.error("Please select an image file");
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image must be less than 5MB");
            return;
        }

        setAvatarUploading(true);

        try {
            const formData = new FormData();
            formData.append("avatar", file);

            const response = await api.post("/users/avatar", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });

            const newAvatarUrl = response.data.avatar || response.data.url;

            // Update edit form
            setEditForm(prev => ({ ...prev, avatar: newAvatarUrl }));

            // Update profile immediately
            setProfile(prev => ({ ...prev, avatar: newAvatarUrl }));

            // Update localStorage
            const updatedUser = { ...currentUser, avatar: newAvatarUrl };
            localStorage.setItem("ws_currentUser", JSON.stringify(updatedUser));
            setCurrentUser(updatedUser);

            toast.success("Profile photo updated! 📸");
        } catch (err) {
            console.error("Avatar upload error:", err);
            toast.error(err.response?.data?.error || "Failed to upload avatar");
        } finally {
            setAvatarUploading(false);
        }
    };

    // Loading state
    if (loading) {
        return (
            <div className="max-w-2xl mx-auto p-6 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
                <p className="mt-2 text-white/70">Loading profile...</p>
            </div>
        );
    }

    // Not logged in
    if (!currentUser && !paramUserId) {
        return (
            <div className="max-w-2xl mx-auto p-6 text-center">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
                    <h2 className="text-2xl font-bold text-white mb-4">👤 Profile</h2>
                    <p className="text-white/60 mb-6">Please log in to view your profile</p>
                    <button
                        onClick={() => navigate("/login")}
                        className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl text-white font-semibold"
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="max-w-2xl mx-auto p-6">
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                    <p className="text-red-400">⚠️ {error}</p>
                </div>
            </div>
        );
    }

    // No profile
    if (!profile) {
        return (
            <div className="max-w-2xl mx-auto p-6">
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <p className="text-white/60">User not found.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto p-6 text-white">
            {/* PROFILE HEADER */}
            <div className="bg-white/5 p-6 rounded-2xl border border-white/10 mb-6">
                {isEditing ? (
                    <form onSubmit={handleUpdateProfile} className="space-y-4">
                        <div className="flex items-start gap-4">
                            {/* Avatar with upload */}
                            <div className="relative group">
                                <img
                                    src={editForm.avatar || "/defaults/default-avatar.png"}
                                    alt="avatar"
                                    className="w-24 h-24 rounded-full border-2 border-cyan-400 object-cover"
                                    onError={(e) => { e.target.src = "/defaults/default-avatar.png"; }}
                                />

                                {/* Upload overlay */}
                                <button
                                    type="button"
                                    onClick={() => avatarInputRef.current?.click()}
                                    disabled={avatarUploading}
                                    className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                >
                                    {avatarUploading ? (
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                                    ) : (
                                        <span className="text-2xl">📷</span>
                                    )}
                                </button>

                                {/* Hidden file input */}
                                <input
                                    ref={avatarInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleAvatarUpload}
                                    className="hidden"
                                />
                            </div>

                            <div className="flex-1 space-y-3">
                                <div>
                                    <label className="text-xs text-white/50 block mb-1">Username</label>
                                    <input
                                        type="text"
                                        value={editForm.username}
                                        onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                                        placeholder="Username"
                                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-cyan-400 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-white/50 block mb-1">Bio</label>
                                    <textarea
                                        value={editForm.bio}
                                        onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                                        placeholder="Tell something about yourself..."
                                        rows={3}
                                        maxLength={200}
                                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white resize-none focus:border-cyan-400 outline-none"
                                    />
                                    <p className="text-xs text-white/40 mt-1">{editForm.bio?.length || 0}/200</p>
                                </div>
                            </div>
                        </div>

                        <p className="text-xs text-white/40 text-center">
                            💡 Click on your photo to upload a new one
                        </p>

                        <div className="flex gap-2 justify-end">
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-cyan-500 rounded-lg hover:bg-cyan-400 transition font-semibold"
                            >
                                Save Changes
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="flex items-start gap-4">
                        <img
                            src={profile.avatar || "/defaults/default-avatar.png"}
                            alt={profile.username}
                            className="w-20 h-20 rounded-full border-2 border-cyan-400 object-cover"
                        />

                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <h2 className="text-2xl font-bold">{profile.username}</h2>
                                {isOwnProfile && (
                                    <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded">You</span>
                                )}
                            </div>

                            <p className="text-white/60 mt-1">{profile.bio || "No bio yet."}</p>

                            {/* Stats */}
                            <div className="flex gap-4 mt-3 text-sm">
                                <div>
                                    <span className="font-semibold">{profile.followers?.length || 0}</span>
                                    <span className="text-white/50 ml-1">Followers</span>
                                </div>
                                <div>
                                    <span className="font-semibold">{profile.following?.length || 0}</span>
                                    <span className="text-white/50 ml-1">Following</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 mt-4">
                                {isOwnProfile ? (
                                    <>
                                        <button
                                            onClick={() => setIsEditing(true)}
                                            className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 text-sm"
                                        >
                                            ✏️ Edit
                                        </button>
                                        <button
                                            onClick={handleLogout}
                                            className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 text-sm"
                                        >
                                            🚪 Logout
                                        </button>
                                    </>
                                ) : token && (
                                    <GiftPanel
                                        recipient={profile}
                                        onSendGift={handleSendGift}
                                        disabled={giftSending}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* WALLET (own profile only) */}
            {isOwnProfile && (
                <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 p-4 rounded-xl border border-cyan-500/30 mb-6">
                    <h3 className="font-semibold mb-2">💰 Wallet</h3>
                    <p className="text-3xl font-bold text-cyan-400">
                        ${(profile.wallet?.balance || 0).toFixed(2)}
                    </p>
                </div>
            )}

            {/* STREAMS */}
            <section className="mb-6">
                <h3 className="text-xl font-semibold mb-3">📹 Streams</h3>
                {streams.length === 0 ? (
                    <div className="bg-white/5 p-4 rounded-lg border border-white/10 text-center">
                        <p className="text-white/50">No streams yet.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {streams.map((s) => (
                            <div key={s._id} className="bg-white/10 p-4 rounded-lg border border-white/10">
                                <strong>{s.title || "Untitled"}</strong>
                                {s.isLive && <span className="ml-2 text-red-400">🔴 LIVE</span>}
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* GIFTS (own profile only) */}
            {isOwnProfile && (
                <section>
                    <h3 className="text-xl font-semibold mb-3">🎁 Gifts Received</h3>
                    {receivedGifts.length === 0 ? (
                        <div className="bg-white/5 p-4 rounded-lg border border-white/10 text-center">
                            <p className="text-white/50">No gifts yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {receivedGifts.map((gift) => (
                                <div key={gift._id} className="flex items-center gap-3 bg-white/5 p-3 rounded-lg border border-white/10">
                                    <span>{gift.itemIcon} {gift.item}</span>
                                    {gift.sender?.username && (
                                        <span className="text-white/50 text-sm">from {gift.sender.username}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            )}
        </div>
    );
}