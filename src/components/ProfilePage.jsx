// src/components/ProfilePage.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { UserPlus, UserCheck, Radio } from "lucide-react";
import api from "../api/api";
import GiftPanel from "./GiftPanel";

export default function ProfilePage() {
    const { userId: paramUserId } = useParams();
    const navigate = useNavigate();

    const [currentUser, setCurrentUser] = useState(null);
    const [token, setToken] = useState(null);

    const [profile, setProfile] = useState(null);
    const [posts, setPosts] = useState([]);
    const [liveStream, setLiveStream] = useState(null);
    const [receivedGifts, setReceivedGifts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [isFollowing, setIsFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("posts");

    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ username: "", bio: "", avatar: "" });
    const [avatarUploading, setAvatarUploading] = useState(false);
    const avatarInputRef = React.useRef(null);

    // Load current user from localStorage
    useEffect(() => {
        const storedToken = localStorage.getItem("token");
        const storedUser = localStorage.getItem("ws_currentUser");

        if (storedToken) setToken(storedToken);

        if (storedUser) {
            try {
                const parsed = JSON.parse(storedUser);
                // Ensure following is always an array
                parsed.following = Array.isArray(parsed.following) ? parsed.following : [];
                parsed.followers = Array.isArray(parsed.followers) ? parsed.followers : [];
                setCurrentUser(parsed);
            } catch (e) {
                console.error("Failed to parse user:", e);
            }
        }
    }, []);

    const targetUserId = paramUserId || currentUser?._id || currentUser?.id;

    const isOwnProfile = React.useMemo(() => {
        if (!currentUser || !targetUserId) return false;
        const currentUserId = currentUser._id || currentUser.id;
        return String(currentUserId) === String(targetUserId);
    }, [currentUser, targetUserId]);

    const isLive = !!liveStream;

    // Fetch profile data
    useEffect(() => {
        if (!targetUserId) {
            if (currentUser === null) return;
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

                // Ensure arrays exist
                profileData.followers = Array.isArray(profileData.followers) ? profileData.followers : [];
                profileData.following = Array.isArray(profileData.following) ? profileData.following : [];

                setProfile(profileData);
                setEditForm({
                    username: profileData.username || "",
                    bio: profileData.bio || "",
                    avatar: profileData.avatar || "",
                });

                // Check if current user is following this profile
                if (currentUser) {
                    const userFollowing = Array.isArray(currentUser.following) ? currentUser.following : [];
                    const targetId = String(profileData._id || profileData.id);
                    setIsFollowing(userFollowing.some(id => String(id) === targetId));
                }

                // Fetch user's posts
                try {
                    const postsRes = await api.get("/posts");
                    const allPosts = Array.isArray(postsRes.data) ? postsRes.data : [];
                    const userPosts = allPosts.filter(p => {
                        const postUserId = p.userId?._id || p.userId || p.authorId;
                        return String(postUserId) === String(targetUserId);
                    });
                    setPosts(userPosts);
                } catch (e) {
                    setPosts([]);
                }

                // Check if user is currently live
                try {
                    const liveRes = await api.get(`/live/user/${targetUserId}/status`);
                    if (liveRes.data?.isLive && liveRes.data?.stream) {
                        setLiveStream(liveRes.data.stream);
                    } else {
                        setLiveStream(null);
                    }
                } catch (e) {
                    setLiveStream(null);
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
                if (!cancelled) {
                    setError(err.response?.data?.error || "Failed to load profile");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchAll();
        return () => { cancelled = true; };
    }, [targetUserId, token, isOwnProfile, currentUser]);

    // Handle follow/unfollow
    const handleFollow = async () => {
        if (!currentUser) {
            toast.error("Please log in to follow users");
            navigate("/login");
            return;
        }

        if (!targetUserId || isOwnProfile) return;
        if (followLoading) return;

        setFollowLoading(true);
        const wasFollowing = isFollowing;
        setIsFollowing(!wasFollowing);

        try {
            await api.post(`/users/${targetUserId}/follow`);

            // Update localStorage with safe array handling
            const updatedUser = { ...currentUser };
            const currentFollowing = Array.isArray(updatedUser.following) ? updatedUser.following : [];

            if (wasFollowing) {
                updatedUser.following = currentFollowing.filter(id => String(id) !== String(targetUserId));
            } else {
                updatedUser.following = [...currentFollowing, targetUserId];
            }

            localStorage.setItem("ws_currentUser", JSON.stringify(updatedUser));
            setCurrentUser(updatedUser);

            // Update profile follower count with safe array handling
            setProfile(prev => {
                const currentFollowers = Array.isArray(prev.followers) ? prev.followers : [];
                const myId = currentUser._id || currentUser.id;

                return {
                    ...prev,
                    followers: wasFollowing
                        ? currentFollowers.filter(id => String(id) !== String(myId))
                        : [...currentFollowers, myId]
                };
            });

            toast.success(wasFollowing ? "Unfollowed" : `Following ${profile.username}!`);
        } catch (err) {
            setIsFollowing(wasFollowing);
            const errMsg = err.response?.data?.error || err.response?.data?.message || "Failed to follow user";
            toast.error(errMsg);
            console.error("Follow error:", err);
        } finally {
            setFollowLoading(false);
        }
    };

    // Join live stream
    const joinLiveStream = () => {
        if (liveStream) {
            navigate(`/live/${liveStream._id || liveStream.roomId}`);
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        try {
            const response = await api.put(`/users/${targetUserId}`, editForm);
            setProfile(prev => ({ ...prev, ...response.data }));
            setIsEditing(false);

            const updatedUser = { ...currentUser, ...response.data };
            localStorage.setItem("ws_currentUser", JSON.stringify(updatedUser));
            setCurrentUser(updatedUser);

            toast.success("Profile updated! ✨");
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to update profile");
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("ws_currentUser");
        toast.success("Logged out successfully");
        navigate("/login");
    };

    const handleAvatarUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            toast.error("Please select an image file");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image must be less than 5MB");
            return;
        }

        setAvatarUploading(true);
        try {
            const formData = new FormData();
            formData.append("avatar", file);

            const response = await api.post("/users/avatar", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            const newAvatarUrl = response.data.avatar || response.data.url;
            setEditForm(prev => ({ ...prev, avatar: newAvatarUrl }));
            setProfile(prev => ({ ...prev, avatar: newAvatarUrl }));

            const updatedUser = { ...currentUser, avatar: newAvatarUrl };
            localStorage.setItem("ws_currentUser", JSON.stringify(updatedUser));
            setCurrentUser(updatedUser);

            toast.success("Profile photo updated! 📸");
        } catch (err) {
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
        <div className="max-w-2xl mx-auto p-4 md:p-6 text-white">
            {/* PROFILE HEADER */}
            <div className="bg-white/5 p-6 rounded-2xl border border-white/10 mb-6">
                {isEditing ? (
                    <form onSubmit={handleUpdateProfile} className="space-y-4">
                        <div className="flex items-start gap-4">
                            <div className="relative group">
                                <img
                                    src={editForm.avatar || "/defaults/default-avatar.png"}
                                    alt="avatar"
                                    className="w-24 h-24 rounded-full border-2 border-cyan-400 object-cover"
                                    onError={(e) => { e.target.src = "/defaults/default-avatar.png"; }}
                                />
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
                    <div className="flex flex-col sm:flex-row items-start gap-4">
                        {/* Avatar with LIVE badge */}
                        <div className="relative">
                            <img
                                src={profile.avatar || "/defaults/default-avatar.png"}
                                alt={profile.username}
                                className={`w-24 h-24 rounded-full object-cover border-4 ${isLive ? 'border-red-500' : 'border-cyan-400'}`}
                                onError={(e) => { e.target.src = "/defaults/default-avatar.png"; }}
                            />
                            {isLive && (
                                <button
                                    onClick={joinLiveStream}
                                    className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse"
                                >
                                    <Radio className="w-3 h-3" />
                                    LIVE
                                </button>
                            )}
                        </div>

                        <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="text-2xl font-bold">{profile.username}</h2>
                                {isOwnProfile && (
                                    <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded">You</span>
                                )}
                            </div>

                            <p className="text-white/60 mt-1">{profile.bio || "New creator on World-Studio"}</p>

                            {/* Stats */}
                            <div className="flex gap-6 mt-3 text-sm">
                                <div className="text-center">
                                    <span className="font-bold text-lg">{posts.length}</span>
                                    <span className="text-white/50 block text-xs">Posts</span>
                                </div>
                                <div className="text-center">
                                    <span className="font-bold text-lg">{profile.followers?.length || 0}</span>
                                    <span className="text-white/50 block text-xs">Followers</span>
                                </div>
                                <div className="text-center">
                                    <span className="font-bold text-lg">{profile.following?.length || 0}</span>
                                    <span className="text-white/50 block text-xs">Following</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-wrap gap-2 mt-4">
                                {isOwnProfile ? (
                                    <>
                                        <button
                                            onClick={() => setIsEditing(true)}
                                            className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 text-sm font-semibold transition"
                                        >
                                            ✏️ Edit Profile
                                        </button>
                                        <button
                                            onClick={handleLogout}
                                            className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 text-sm font-semibold transition"
                                        >
                                            🚪 Logout
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        {/* Follow Button */}
                                        <button
                                            onClick={handleFollow}
                                            disabled={followLoading}
                                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all ${isFollowing
                                                    ? "bg-white/10 text-white hover:bg-red-500/20 hover:text-red-400"
                                                    : "bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-400 hover:to-blue-400"
                                                }`}
                                        >
                                            {followLoading ? (
                                                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                            ) : isFollowing ? (
                                                <>
                                                    <UserCheck className="w-5 h-5" />
                                                    Following
                                                </>
                                            ) : (
                                                <>
                                                    <UserPlus className="w-5 h-5" />
                                                    Follow
                                                </>
                                            )}
                                        </button>

                                        {/* Watch Live Button */}
                                        {isLive && (
                                            <button
                                                onClick={joinLiveStream}
                                                className="flex items-center gap-2 px-5 py-2.5 bg-red-500 rounded-xl font-semibold animate-pulse"
                                            >
                                                <Radio className="w-5 h-5" />
                                                Watch Live
                                            </button>
                                        )}

                                        {/* Send Gift Button */}
                                        <button
                                            onClick={() => setActiveTab("gift")}
                                            className="px-4 py-2.5 bg-purple-500/20 text-purple-400 rounded-xl font-semibold hover:bg-purple-500/30 transition"
                                        >
                                            🎁 Send Gift
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* WALLET (own profile only) */}
            {isOwnProfile && (
                <div className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 p-4 rounded-xl border border-yellow-500/30 mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-yellow-400">💰 Wallet Balance</h3>
                            <p className="text-3xl font-bold text-white mt-1">
                                {(profile.wallet?.balance || 0).toLocaleString()} <span className="text-lg text-yellow-400">WS-Coins</span>
                            </p>
                        </div>
                        <button
                            onClick={() => navigate("/wallet")}
                            className="px-4 py-2 bg-yellow-500 text-black rounded-lg font-semibold hover:bg-yellow-400 transition"
                        >
                            + Add Coins
                        </button>
                    </div>
                </div>
            )}

            {/* TABS */}
            {!isOwnProfile && (
                <div className="flex border-b border-white/10 mb-6">
                    {[
                        { id: "posts", label: "Posts", icon: "📷" },
                        { id: "gift", label: "Send Gift", icon: "🎁" },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 py-3 text-sm font-semibold transition ${activeTab === tab.id
                                    ? "text-cyan-400 border-b-2 border-cyan-400"
                                    : "text-white/50 hover:text-white/80"
                                }`}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>
            )}

            {/* CONTENT */}
            {(isOwnProfile || activeTab === "posts") && (
                <section className="mb-6">
                    <h3 className="text-xl font-semibold mb-3">📷 Posts</h3>
                    {posts.length === 0 ? (
                        <div className="bg-white/5 p-8 rounded-xl border border-white/10 text-center">
                            <p className="text-white/50">No posts yet.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-2">
                            {posts.map((post) => (
                                <div
                                    key={post._id || post.id}
                                    onClick={() => navigate(`/post/${post._id || post.id}`)}
                                    className="aspect-square bg-white/10 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition relative"
                                >
                                    {post.type === "image" || post.mediaType === "image" ? (
                                        <img
                                            src={post.fileUrl || post.mediaUrl || post.thumbnail}
                                            alt={post.title}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : post.type === "video" || post.mediaType === "video" ? (
                                        <div className="w-full h-full bg-black flex items-center justify-center">
                                            <span className="text-4xl">🎬</span>
                                        </div>
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                                            <span className="text-4xl">📝</span>
                                        </div>
                                    )}

                                    {/* Overlay with stats */}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition flex items-center justify-center gap-4 text-sm">
                                        <span>❤️ {post.likes || 0}</span>
                                        <span>💬 {post.comments?.length || 0}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            )}

            {/* Gift Panel (other users) */}
            {!isOwnProfile && activeTab === "gift" && (
                <section className="mb-6">
                    <GiftPanel recipient={profile} />
                </section>
            )}

            {/* GIFTS RECEIVED (own profile only) */}
            {isOwnProfile && (
                <section>
                    <h3 className="text-xl font-semibold mb-3">🎁 Gifts Received</h3>
                    {receivedGifts.length === 0 ? (
                        <div className="bg-white/5 p-8 rounded-xl border border-white/10 text-center">
                            <p className="text-white/50">No gifts yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {receivedGifts.slice(0, 10).map((gift) => (
                                <div key={gift._id} className="flex items-center gap-3 bg-white/5 p-3 rounded-lg border border-white/10">
                                    <span className="text-2xl">{gift.itemIcon || "🎁"}</span>
                                    <div className="flex-1">
                                        <span className="font-semibold">{gift.item}</span>
                                        {gift.sender?.username && (
                                            <span className="text-white/50 text-sm ml-2">from {gift.sender.username}</span>
                                        )}
                                    </div>
                                    <span className="text-yellow-400 font-semibold">{gift.amount || 1}x</span>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            )}
        </div>
    );
}