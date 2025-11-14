import React, { useEffect, useState } from "react";
import axios from "axios";
import GiftPanel from "./GiftPanel";

export default function ProfilePage({ userId, token, currentUser }) {
    const [profile, setProfile] = useState(null);
    const [streams, setStreams] = useState([]);
    const [receivedGifts, setReceivedGifts] = useState([]);

    useEffect(() => {
        // fetch profile
        axios.get(`/api/users/${userId}`).then(res => setProfile(res.data));
        // fetch user's streams
        axios.get(`/api/live?userId=${userId}`).then(res => setStreams(res.data));
        // fetch received gifts
        axios.get("/api/gifts/received", { headers: { Authorization: `Bearer ${token}` } })
            .then(res => setReceivedGifts(res.data.filter(g => g.recipient._id === userId)));
    }, [userId, token]);

    if (!profile) return <div>Loading...</div>;

    return (
        <div className="max-w-2xl mx-auto p-6">
            <div className="flex items-center gap-4 mb-6">
                <img src={profile.avatar || "/defaults/default-avatar.png"} alt="avatar" className="w-20 h-20 rounded-full border-2 border-cyan-400" />
                <div>
                    <h2 className="text-2xl font-bold">{profile.username}</h2>
                    <p className="text-white/60">{profile.bio}</p>
                    {currentUser && currentUser._id !== userId && (
                        <GiftPanel
                            recipient={profile}
                            onSendGift={giftData => {
                                // Use your send gift logic here
                                axios.post("/api/gifts", { ...giftData }, { headers: { Authorization: `Bearer ${token}` } });
                            }}
                        />
                    )}
                </div>
            </div>
            <h3 className="text-xl font-semibold mb-2">Recent Streams</h3>
            <div>
                {streams.length === 0 ? (
                    <div>No streams yet.</div>
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
                {receivedGifts.length === 0 ? (
                    <div>No gifts yet.</div>
                ) : (
                    receivedGifts.map(gift => (
                        <div key={gift._id} className="mb-2 flex items-center gap-2">
                            <img src={gift.itemImage} alt={gift.item} width={24} />
                            <span>{gift.itemIcon} {gift.item} x{gift.amount}</span>
                            <span className="ml-1 text-sm text-white/60">from {gift.sender?.username}</span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}