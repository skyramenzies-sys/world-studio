import React, { useEffect, useState } from "react";
import axios from "axios";
import GiftPanel from "./GiftPanel";

const API = import.meta.env.VITE_API_URL || "";

export default function ProfilePage({ userId, token, currentUser }) {
    const [profile, setProfile] = useState(null);
    const [streams, setStreams] = useState([]);
    const [receivedGifts, setReceivedGifts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [giftSending, setGiftSending] = useState(false);

    useEffect(() => {
        if (!userId) {
            setLoading(false);
            setError("No user ID provided");
            return;
        }

        let cancelled = false;
        setLoading(true);
        setError("");

        const fetchAll = async () => {
            try {
                // Fetch profile and streams in parallel
                const requests = [
                    axios.get(`${API}/api/users/${userId}`),
                    axios.get(`${API}/api/live?userId=${userId}`),
                ];

                // Only fetch gifts if user is authenticated
                if (token) {
                    requests.push(
                        axios.get(`${API}/api/gifts/received`, {
                            headers: { Authorization: `Bearer ${token}` },
                        })
                    );
                }

                const responses = await Promise.all(requests);

                if (cancelled) return;

                // Profile data
                const profileData = responses[0]?.data;
                if (!profileData) {
                    setError("User not found");
                    return;
                }
                setProfile(profileData);

                // Streams data
                const streamsData = responses[1]?.data;
                setStreams(Array.isArray(streamsData) ? streamsData : []);

                // Gifts data (only if token was provided)
                if (token && responses[2]) {
                    const giftsData = responses[2]?.data;
                    const filteredGifts = Array.isArray(giftsData)
                        ? giftsData.filter((g) => {
                            // Validate gift has recipient
                            if (!g || !g.recipient) return false;

                            // Check if recipient matches userId
                            const recipientId = g.recipient._id || g.recipient;
                            return String(recipientId) === String(userId);
                        })
                        : [];
                    setReceivedGifts(filteredGifts);
                } else {
                    setReceivedGifts([]);
                }
            } catch (err) {
                console.error("ProfilePage fetch error:", err);
                if (!cancelled) {
                    const errorMsg = err.response?.data?.message || err.message || "Failed to load profile";
                    setError(errorMsg);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        fetchAll();

        return () => {
            cancelled = true;
        };
    }, [userId, token]);

    // Check if viewing own profile
    const isOwnProfile = React.useMemo(() => {
        if (!currentUser || !userId) return false;
        const currentUserId = currentUser._id || currentUser.id;
        return String(currentUserId) === String(userId);
    }, [currentUser, userId]);

    // Handle gift sending
    const handleSendGift = async (giftData) => {
        if (!token) {
            console.error("No authentication token available");
            return;
        }

        if (!giftData || !giftData.recipientId) {
            console.error("Invalid gift data");
            return;
        }

        setGiftSending(true);

        try {
            const response = await axios.post(
                `${API}/api/gifts`,
                {
                    recipientId: giftData.recipientId,
                    item: giftData.item,
                    amount: giftData.amount || 1,
                    itemIcon: giftData.itemIcon,
                    itemImage: giftData.itemImage,
                    ...giftData,
                },
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            // Update gifts list with new gift
            if (response.data) {
                setReceivedGifts((prev) => [response.data, ...prev]);
            }

            console.log("Gift sent successfully:", response.data);
        } catch (err) {
            console.error("Gift send failed:", err);
            const errorMsg = err.response?.data?.message || "Failed to send gift";
            alert(errorMsg);
        } finally {
            setGiftSending(false);
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

    // No profile found
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
            <div className="flex items-start gap-4 mb-6 bg-white/5 p-4 rounded-lg border border-white/10">
                <img
                    src={profile.avatar || "/defaults/default-avatar.png"}
                    alt={`${profile.username}'s avatar`}
                    className="w-20 h-20 rounded-full border-2 border-cyan-400 object-cover"
                    onError={(e) => {
                        e.target.src = "/defaults/default-avatar.png";
                    }}
                />

                <div className="flex-1">
                    <h2 className="text-2xl font-bold">{profile.username}</h2>

                    {profile.bio ? (
                        <p className="text-white/60 mt-1">{profile.bio}</p>
                    ) : (
                        <p className="text-white/40 mt-1 italic">No bio yet.</p>
                    )}

                    {/* Show gift panel only if NOT own profile and user is logged in */}
                    {!isOwnProfile && token && (
                        <div className="mt-4">
                            <GiftPanel
                                recipient={profile}
                                onSendGift={handleSendGift}
                                disabled={giftSending}
                            />
                            {giftSending && (
                                <p className="text-xs text-cyan-400 mt-1">
                                    Sending gift...
                                </p>
                            )}
                        </div>
                    )}

                    {isOwnProfile && (
                        <div className="mt-2">
                            <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded">
                                Your Profile
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* RECENT STREAMS SECTION */}
            <section className="mb-6">
                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                    <span>📹</span> Recent Streams
                </h3>
                <div className="space-y-3">
                    {streams.length === 0 ? (
                        <div className="bg-white/5 p-4 rounded-lg border border-white/10 text-center">
                            <p className="text-white/50">No streams yet.</p>
                        </div>
                    ) : (
                        streams.map((stream) => (
                            <div
                                key={stream._id}
                                className="bg-white/10 p-4 rounded-lg border border-white/10 hover:bg-white/15 transition-colors"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <strong className="text-white">
                                            {stream.title || "Untitled Stream"}
                                        </strong>
                                        <div className="text-sm text-white/60 mt-1">
                                            {stream.category || "Uncategorized"}
                                        </div>
                                    </div>
                                    <div>
                                        {stream.isLive ? (
                                            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                                                🔴 LIVE
                                            </span>
                                        ) : (
                                            <span className="text-white/40 text-xs">
                                                Ended
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>

            {/* GIFTS RECEIVED SECTION */}
            <section>
                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                    <span>🎁</span> Gifts Received
                </h3>
                <div className="space-y-2">
                    {receivedGifts.length === 0 ? (
                        <div className="bg-white/5 p-4 rounded-lg border border-white/10 text-center">
                            <p className="text-white/50">No gifts received yet.</p>
                        </div>
                    ) : (
                        receivedGifts.map((gift) => (
                            <div
                                key={gift._id}
                                className="flex items-center gap-3 bg-white/5 p-3 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
                            >
                                {gift.itemImage && (
                                    <img
                                        src={gift.itemImage}
                                        alt={gift.item}
                                        className="w-8 h-8 rounded object-cover"
                                        onError={(e) => {
                                            e.target.style.display = "none";
                                        }}
                                    />
                                )}

                                <div className="flex-1">
                                    <span className="font-medium text-white">
                                        {gift.itemIcon && (
                                            <span className="mr-1">{gift.itemIcon}</span>
                                        )}
                                        {gift.item || "Gift"}
                                        {gift.amount > 1 && (
                                            <span className="text-cyan-400">
                                                {" "}
                                                x{gift.amount}
                                            </span>
                                        )}
                                    </span>
                                    {gift.sender?.username && (
                                        <div className="text-sm text-white/60">
                                            from {gift.sender.username}
                                        </div>
                                    )}
                                </div>

                                {gift.createdAt && (
                                    <span className="text-xs text-white/40">
                                        {new Date(gift.createdAt).toLocaleDateString()}
                                    </span>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </section>
        </div>
    );
}