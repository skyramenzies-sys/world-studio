import React, { useEffect, useState } from "react";
import axios from "axios";
import GiftPanel from "./GiftPanel";

export default function ProfilePage({ userId, token, currentUser }) {
    const [profile, setProfile] = useState(null);
    const [streams, setStreams] = useState([]);
    const [receivedGifts, setReceivedGifts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!userId) return;

        let cancelled = false;
        setLoading(true);
        setError("");

        const fetchAll = async () => {
            try {
                const [profileRes, streamsRes, giftsRes] = await Promise.all([
                    axios.get(`/api/users/${userId}`),
                    axios.get(`/api/live?userId=${userId}`),
                    axios.get("/api/gifts/received", {
                        headers: { Authorization: `Bearer ${token}` }
                    })
                ]);

                if (cancelled) return;

                setProfile(profileRes.data || null);
                setStreams(Array.isArray(streamsRes.data) ? streamsRes.data : []);

                const gifts = Array.isArray(giftsRes.data)
                    ? giftsRes.data.filter(g => g.recipient?._id === userId)
                    : [];

                setReceivedGifts(gifts);
            } catch (err) {
                if (!cancelled) setError("Failed to load profile.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchAll();
        return () => (cancelled = true);
    }, [userId, token]);

    // ------------------------------
    //  UI STATES
    // ------------------------------
    if (loading) return <div className="p-6 text-white/70">Loading...</div>;
    if (error) return <div className="p-6 text-red-400">{error}</div>;
    if (!profile) return <div className="p-6 text-red-400">User not found.</div>;

    const isOwnProfile = currentUser && (currentUser._id === userId || currentUser.id === userId);

    // ------------------------------
    //  SEND GIFT
    // ------------------------------
    const handleSendGift = async (giftData) => {
        try {
            await axios.post(
                "/api/gifts",
                { ...giftData },
                { headers: { Authorization: `Bearer ${token}` } }
            );
        } catch {
            // Optioneel: toast.error("Gift failed.");
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-6 text-white">

            {/* ===========================
                HEADER
            ============================ */}
            <div className="flex items-start gap-4 mb-6">
                <img
                    src={profile.avatar || "/defaults/default-avatar.png"}
                    alt="avatar"
                    className="w-20 h-20 rounded-full border-2 border-cyan-400 object-cover"
                />

                <div className="flex-1">
                    <h2 className="text-2xl font-bold">{profile.username}</h2>

                    <p className="text-white/60 mt-1">
                        {profile.bio || (
                            <span className="italic opacity-70">No bio yet.</span>
                        )}
                    </p>

                    {/* GIFT PANEL (ONLY IF VIEWING OTHER USER) */}
                    {!isOwnProfile && (
                        <div className="mt-4">
                            <GiftPanel
                                recipient={profile}
                                onSendGift={handleSendGift}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* ===========================
                STREAMS
            ============================ */}
            <h3 className="text-xl font-semibold mb-2">Recent Streams</h3>
            <div>
                {streams.length === 0 ? (
                    <div className="text-white/50">No streams yet.</div>
                ) : (
                    streams.map((s) => (
                        <div
                            key={s._id}
                            className="mb-3 bg-white/10 p-3 rounded-lg border border-white/10"
                        >
                            <strong>{s.title}</strong> • {s.category} •{" "}
                            {s.isLive ? (
                                <span className="text-red-400">LIVE</span>
                            ) : (
                                "Ended"
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* ===========================
                GIFTS RECEIVED
            ============================ */}
            <h3 className="text-xl font-semibold mt-6 mb-2">Gifts Received</h3>
            <div>
                {receivedGifts.length === 0 ? (
                    <div className="text-white/50">No gifts yet.</div>
                ) : (
                    receivedGifts.map((gift) => (
                        <div
                            key={gift._id}
                            className="mb-2 flex items-center gap-2 bg-white/5 p-2 rounded-lg border border-white/10"
                        >
                            {gift.itemImage && (
                                <img
                                    src={gift.itemImage}
                                    alt={gift.item}
                                    width={24}
                                    className="rounded"
                                />
                            )}
                            <span className="font-medium">
                                {gift.itemIcon} {gift.item} x{gift.amount}
                            </span>
                            <span className="ml-1 text-sm text-white/60">
                                {gift.sender?.username
                                    ? `from ${gift.sender.username}`
                                    : ""}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
