import React, { useEffect, useState } from "react";
import axios from "axios";
import GiftPanel from "./GiftPanel";

export default function ProfilePage({ userId, token, currentUser }) {
    const [profile, setProfile] = useState(null);
    const [streams, setStreams] = useState([]);
    const [receivedGifts, setReceivedGifts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        setError(null);

        // fetch profile
        const fetchProfile = axios.get(`/api/users/${userId}`);
        // fetch user's streams
        const fetchStreams = axios.get(`/api/live?userId=${userId}`);
        // fetch received gifts
        const fetchGifts = axios.get("/api/gifts/received", {
            headers: { Authorization: `Bearer ${token}` }
        });

        Promise.all([fetchProfile, fetchStreams, fetchGifts])
            .then(([profileRes, streamsRes, giftsRes]) => {
                if (!isMounted) return;
                setProfile(profileRes.data);
                setStreams(Array.isArray(streamsRes.data) ? streamsRes.data : []);
                setReceivedGifts(
                    Array.isArray(giftsRes.data)
                        ? giftsRes.data.filter(
                            g => g.recipient && g.recipient._id === userId
                        )
                        : []
                );
            })
            .catch(err => {
                if (!isMounted) return;
                setError("Failed to load profile.");
            })
            .finally(() => {
                if (isMounted) setLoading(false);
            });

        return () => { isMounted = false; };
    }, [userId, token]);

    if (loading) return <div className="p-6">Loading...</div>;
    if (error) return <div className="p-6 text-red-400">{error}</div>;
    if (!profile) return <div className="p-6 text-red-400">User not found.</div>;

    return (
        <div className="max-w-2xl mx-auto p-6">
            <div className="flex items-center gap-4 mb-6">
                <img
                    src={profile.avatar || "/defaults/default-avatar.png"}
                    alt="avatar"
                    className="w-20 h-20 rounded-full border-2 border-cyan-400 object-cover"
                />
                <div>
                    <h2 className="text-2xl font-bold">{profile.username}</h2>
                    <p className="text-white/60">{profile.bio || <span className="italic opacity-70">No bio yet.</span>}</p>
                    {currentUser && currentUser._id !== userId && (
                        <GiftPanel
                            recipient={profile}
                            onSendGift={giftData => {
                                // Use your send gift logic here
                                axios.post("/api/gifts", { ...giftData }, {
                                    headers: { Authorization: `Bearer ${token}` }
                                });
                            }}
                        />
                    )}
                </div>
            </div>

            <h3 className="text-xl font-semibold mb-2">Recent Streams</h3>
            <div>
                {Array.isArray(streams) && streams.length === 0 ? (
                    <div className="text-white/50">No streams yet.</div>
                ) : (
                    streams.map(s => (
                        <div key={s._id} className="mb-3 bg-white/10 p-3 rounded-lg">
                            <strong>{s.title}</strong> • {s.category} • {s.isLive ? <span className="text-red-400">LIVE</span> : "Ended"}
                        </div>
                    ))
                )}
            </div>

            <h3 className="text-xl font-semibold mt-6 mb-2">Gifts Received</h3>
            <div>
                {Array.isArray(receivedGifts) && receivedGifts.length === 0 ? (
                    <div className="text-white/50">No gifts yet.</div>
                ) : (
                    receivedGifts.map(gift => (
                        <div key={gift._id} className="mb-2 flex items-center gap-2">
                            {gift.itemImage && (
                                <img src={gift.itemImage} alt={gift.item} width={24} />
                            )}
                            <span>
                                {gift.itemIcon} {gift.item} x{gift.amount}
                            </span>
                            <span className="ml-1 text-sm text-white/60">
                                {gift.sender && gift.sender.username ? `from ${gift.sender.username}` : ""}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}