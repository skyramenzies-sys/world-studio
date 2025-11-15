// GiftShop.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
const API = "/api/gifts";

export default function GiftShop({ token }) {
    const [availableGifts, setAvailableGifts] = useState([]);
    const [recipient, setRecipient] = useState(null);
    const [userSearch, setUserSearch] = useState("");
    const [userResults, setUserResults] = useState([]);
    const [selectedGift, setSelectedGift] = useState(null);
    const [amount, setAmount] = useState(1);
    const [message, setMessage] = useState("");
    const [info, setInfo] = useState("");
    const [sentGifts, setSentGifts] = useState([]);
    const [receivedGifts, setReceivedGifts] = useState([]);
    const [topSenders, setTopSenders] = useState([]);
    const [topReceivers, setTopReceivers] = useState([]);

    // Fetch available gifts
    useEffect(() => {
        axios.get(`${API}/available-items`).then(res => setAvailableGifts(res.data));
    }, []);

    // User search
    useEffect(() => {
        if (userSearch.length < 2) return setUserResults([]);
        axios
            .get(`/api/users?q=${encodeURIComponent(userSearch)}&limit=5`)
            .then(res => setUserResults(res.data.users || []));
    }, [userSearch]);

    // Fetch gift history and leaderboards
    const fetchHistory = () => {
        axios.get(`${API}/sent`, { headers: { Authorization: `Bearer ${token}` } }).then(res => setSentGifts(res.data));
        axios.get(`${API}/received`, { headers: { Authorization: `Bearer ${token}` } }).then(res => setReceivedGifts(res.data));
        axios.get(`${API}/leaderboard/senders`).then(res => setTopSenders(res.data));
        axios.get(`${API}/leaderboard/receivers`).then(res => setTopReceivers(res.data));
    };
    useEffect(() => {
        if (token) fetchHistory();
    }, [token]);
}
// Send Gift Handler
async function handleSendGift() {
    if (!recipient) return setInfo("Select a recipient user.");
    if (!selectedGift) return setInfo("Choose a gift.");
    if (!amount || amount < 1) return setInfo("Amount must be at least 1.");
    try {
        const res = await axios.post(
            API,
            {
                recipientId: recipient._id,
                item: selectedGift.name,
                amount,
                message,
            },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        setInfo("Gift sent successfully!");
        setRecipient(null);
        setUserSearch("");
        setSelectedGift(null);
        setAmount(1);
        setMessage("");
        fetchHistory();
    } catch (err) {
        setInfo(err.response?.data?.message || "Error sending gift.");
    }


    return (
        <div style={{ maxWidth: 700, margin: "0 auto", fontFamily: "sans-serif" }}>
            <h2>Gift Shop</h2>
            {/* Recipient Search */}
            <div>
                <div>
                    <input
                        type="text"
                        placeholder="Search for user to gift..."
                        value={userSearch}
                        onChange={e => {
                            setUserSearch(e.target.value);
                            setRecipient(null);
                        }}
                    />
                    {Array.isArray(userResults) && userResults.length > 0 && (
                        <div style={{ border: "1px solid #ccc", background: "#fff", zIndex: 10 }}>
                            {userResults.map(u => (
                                <div
                                    key={u._id}
                                    style={{ cursor: "pointer", padding: 4 }}
                                    onClick={() => {
                                        setRecipient(u);
                                        setUserSearch(u.username);
                                        setUserResults([]);
                                    }}
                                >
                                    <img src={u.avatar || "/defaults/default-avatar.png"} alt="avatar" width={24} style={{ borderRadius: "50%" }} /> {u.username}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                {recipient && (
                    <div style={{ margin: "8px 0", color: "green" }}>
                        Gift will go to: <b>{recipient.username}</b>
                    </div>
                )}
            </div>
            {/* Gift Selection */}
            <div style={{ display: "flex", gap: 18, margin: "16px 0" }}>
                {availableGifts.map(gift => (
                    <div
                        key={gift.name}
                        style={{
                            border: selectedGift?.name === gift.name ? "2px solid #0af" : "1px solid #ccc",
                            padding: 12,
                            cursor: "pointer",
                            borderRadius: 8,
                        }}
                        onClick={() => setSelectedGift(gift)}
                    >
                        <img src={gift.image} alt={gift.name} width={48} style={{ display: "block", margin: "auto" }} />
                        <div style={{ fontSize: 22 }}>{gift.icon}</div>
                        <div><b>{gift.name}</b></div>
                        <div style={{ fontSize: 14, color: "#888" }}>{gift.price} WS-Coins</div>
                    </div>
                ))}
            </div>
            {/* Amount & Message */}
            {selectedGift && (
                <div style={{ marginBottom: 10 }}>
                    <input
                        type="number"
                        min="1"
                        value={amount}
                        onChange={e => setAmount(Number(e.target.value))}
                        placeholder="Amount"
                        style={{ width: 60, marginRight: 8 }}
                    />
                    <input
                        type="text"
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        placeholder="Message (optional)"
                        style={{ width: 200 }}
                    />
                    <button style={{ marginLeft: 8 }} onClick={handleSendGift}>
                        Send Gift
                    </button>
                </div>
            )}
            {info && <div style={{ color: "#c00", marginBottom: 10 }}>{info}</div>}
            {/* Gift History */}
            <div style={{ display: "flex", gap: 32, margin: "32px 0" }}>
                <div style={{ flex: 1 }}>
                    <h3>Sent Gifts</h3>
                    {sentGifts.length === 0 && <div>No sent gifts yet.</div>}
                    {sentGifts.map(gift => (
                        <div key={gift._id} style={{ marginBottom: 6 }}>
                            <img src={gift.itemImage} alt={gift.item} width={24} style={{ verticalAlign: "middle" }} />
                            {gift.itemIcon} <b>{gift.item}</b> x{gift.amount} to <b>{gift.recipient?.username}</b>
                            {gift.message && <span> &mdash; "{gift.message}"</span>}
                            <span style={{ color: "#888", marginLeft: 8 }}>{new Date(gift.createdAt).toLocaleString()}</span>
                        </div>
                    ))}
                </div>
                <div style={{ flex: 1 }}>
                    <h3>Received Gifts</h3>
                    {receivedGifts.length === 0 && <div>No received gifts yet.</div>}
                    {receivedGifts.map(gift => (
                        <div key={gift._id} style={{ marginBottom: 6 }}>
                            <img src={gift.itemImage} alt={gift.item} width={24} style={{ verticalAlign: "middle" }} />
                            {gift.itemIcon} <b>{gift.item}</b> x{gift.amount} from <b>{gift.sender?.username}</b>
                            {gift.message && <span> &mdash; "{gift.message}"</span>}
                            <span style={{ color: "#888", marginLeft: 8 }}>{new Date(gift.createdAt).toLocaleString()}</span>
                        </div>
                    ))}
                </div>
            </div>
            {/* Leaderboards */}
            <div style={{ display: "flex", gap: 32 }}>
                <div style={{ flex: 1 }}>
                    <h3>Top Gifters</h3>
                    {topSenders.map(entry => (
                        <div key={entry._id._id} style={{ marginBottom: 6 }}>
                            <img src={entry._id.avatar} width={24} style={{ borderRadius: "50%", verticalAlign: "middle" }} />
                            <b> {entry._id.username}</b>
                            <span style={{ color: "#888", marginLeft: 6 }}>Sent: {entry.count} gifts, {entry.total} WS-Coins</span>
                        </div>
                    ))}
                </div>
                <div style={{ flex: 1 }}>
                    <h3>Top Receivers</h3>
                    {topReceivers.map(entry => (
                        <div key={entry._id._id} style={{ marginBottom: 6 }}>
                            <img src={entry._id.avatar} width={24} style={{ borderRadius: "50%", verticalAlign: "middle" }} />
                            <b> {entry._id.username}</b>
                            <span style={{ color: "#888", marginLeft: 6 }}>Received: {entry.count} gifts, {entry.total} WS-Coins</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};