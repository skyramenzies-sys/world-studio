// GiftShop.jsx
import React, { useState, useEffect, useCallback } from "react";
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

    // History
    const [sentGifts, setSentGifts] = useState([]);
    const [receivedGifts, setReceivedGifts] = useState([]);
    const [topSenders, setTopSenders] = useState([]);
    const [topReceivers, setTopReceivers] = useState([]);

    /* ----------------------------------------------
       Fetch available gifts on load
    ---------------------------------------------- */
    useEffect(() => {
        axios.get(`${API}/available-items`).then((res) => setAvailableGifts(res.data));
    }, []);

    /* ----------------------------------------------
       User search with debounce
    ---------------------------------------------- */
    useEffect(() => {
        if (userSearch.length < 2) return setUserResults([]);

        const delay = setTimeout(() => {
            axios
                .get(`/api/users?q=${encodeURIComponent(userSearch)}&limit=5`)
                .then((res) => setUserResults(res.data.users || []))
                .catch(() => setUserResults([]));
        }, 300);

        return () => clearTimeout(delay);
    }, [userSearch]);

    /* ----------------------------------------------
       Fetch full history (sent / received / top)
    ---------------------------------------------- */
    const fetchHistory = useCallback(() => {
        if (!token) return;

        axios
            .get(`${API}/sent`, { headers: { Authorization: `Bearer ${token}` } })
            .then((res) => setSentGifts(res.data));

        axios
            .get(`${API}/received`, { headers: { Authorization: `Bearer ${token}` } })
            .then((res) => setReceivedGifts(res.data));

        axios.get(`${API}/leaderboard/senders`).then((res) => setTopSenders(res.data));
        axios.get(`${API}/leaderboard/receivers`).then((res) => setTopReceivers(res.data));
    }, [token]);

    useEffect(() => {
        if (token) fetchHistory();
    }, [token, fetchHistory]);

    /* ----------------------------------------------
       Send Gift
    ---------------------------------------------- */
    const handleSendGift = async () => {
        if (!recipient) return setInfo("Select a recipient user.");
        if (!selectedGift) return setInfo("Choose a gift.");
        if (!amount || amount < 1) return setInfo("Amount must be at least 1.");

        try {
            await axios.post(
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
    };

    /* ----------------------------------------------
        RENDER
    ---------------------------------------------- */
    return (
        <div style={{ maxWidth: 700, margin: "0 auto", fontFamily: "sans-serif" }}>
            <h2>Gift Shop</h2>

            {/* ===== USER SEARCH ===== */}
            <div>
                <input
                    type="text"
                    placeholder="Search for user..."
                    value={userSearch}
                    onChange={(e) => {
                        setUserSearch(e.target.value);
                        setRecipient(null);
                    }}
                    style={{ width: "100%", padding: 6, marginBottom: 4 }}
                />

                {Array.isArray(userResults) && userResults.length > 0 && (
                    <div style={{ border: "1px solid #ccc", background: "#fff" }}>
                        {userResults.map((u) => (
                            <div
                                key={u._id}
                                style={{
                                    cursor: "pointer",
                                    padding: 6,
                                    display: "flex",
                                    alignItems: "center",
                                }}
                                onClick={() => {
                                    setRecipient(u);
                                    setUserSearch(u.username);
                                    setUserResults([]);
                                }}
                            >
                                <img
                                    src={u.avatar || "/defaults/default-avatar.png"}
                                    alt="avatar"
                                    width={24}
                                    height={24}
                                    style={{ borderRadius: "50%", marginRight: 8 }}
                                />
                                {u.username}
                            </div>
                        ))}
                    </div>
                )}

                {recipient && (
                    <div style={{ margin: "8px 0", color: "green" }}>
                        Gift will go to: <b>{recipient.username}</b>
                    </div>
                )}
            </div>

            {/* ===== GIFTS ===== */}
            <div style={{ display: "flex", gap: 18, margin: "16px 0", flexWrap: "wrap" }}>
                {availableGifts.map((gift) => (
                    <div
                        key={gift.name}
                        onClick={() => setSelectedGift(gift)}
                        style={{
                            border: selectedGift?.name === gift.name ? "2px solid #0af" : "1px solid #ccc",
                            padding: 12,
                            cursor: "pointer",
                            borderRadius: 8,
                            width: 110,
                            textAlign: "center",
                        }}
                    >
                        <img src={gift.image} alt={gift.name} width={48} style={{ margin: "0 auto" }} />
                        <div style={{ fontSize: 22 }}>{gift.icon}</div>
                        <b>{gift.name}</b>
                        <div style={{ fontSize: 14, color: "#888" }}>{gift.price} WS-Coins</div>
                    </div>
                ))}
            </div>

            {/* ===== SEND FORM ===== */}
            {selectedGift && (
                <>
                    <div style={{ marginBottom: 10 }}>
                        <input
                            type="number"
                            min="1"
                            value={amount}
                            onChange={(e) => setAmount(Number(e.target.value))}
                            style={{ width: 60, marginRight: 8 }}
                        />
                        <input
                            type="text"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Message (optional)"
                            style={{ width: 200 }}
                        />
                        <button onClick={handleSendGift} style={{ marginLeft: 8 }}>
                            Send Gift
                        </button>
                    </div>
                </>
            )}

            {info && <div style={{ color: "#c00", marginBottom: 10 }}>{info}</div>}

            {/* ===== HISTORY ===== */}
            <div style={{ display: "flex", gap: 32, marginTop: 24 }}>
                {/* SENT */}
                <div style={{ flex: 1 }}>
                    <h3>Sent Gifts</h3>
                    {sentGifts.length === 0 && <div>No sent gifts yet.</div>}

                    {sentGifts.map((g) => (
                        <div key={g._id} style={{ marginBottom: 6 }}>
                            <img
                                src={g.itemImage}
                                alt={g.item}
                                width={24}
                                style={{ verticalAlign: "middle" }}
                            />
                            {g.itemIcon} <b>{g.item}</b> x{g.amount} to{" "}
                            <b>{g.recipient?.username}</b>
                            {g.message && ` — "${g.message}"`}
                            <span style={{ color: "#888", marginLeft: 8 }}>
                                {new Date(g.createdAt).toLocaleString()}
                            </span>
                        </div>
                    ))}
                </div>

                {/* RECEIVED */}
                <div style={{ flex: 1 }}>
                    <h3>Received Gifts</h3>
                    {receivedGifts.length === 0 && <div>No received gifts yet.</div>}

                    {receivedGifts.map((g) => (
                        <div key={g._id} style={{ marginBottom: 6 }}>
                            <img
                                src={g.itemImage}
                                alt={g.item}
                                width={24}
                                style={{ verticalAlign: "middle" }}
                            />
                            {g.itemIcon} <b>{g.item}</b> x{g.amount} from{" "}
                            <b>{g.sender?.username}</b>
                            {g.message && ` — "${g.message}"`}
                            <span style={{ color: "#888", marginLeft: 8 }}>
                                {new Date(g.createdAt).toLocaleString()}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ===== LEADERBOARDS ===== */}
            <div style={{ display: "flex", gap: 32, marginTop: 32 }}>
                <div style={{ flex: 1 }}>
                    <h3>Top Gifters</h3>
                    {topSenders.map((entry) => (
                        <div key={entry._id._id} style={{ marginBottom: 6 }}>
                            <img
                                src={entry._id.avatar}
                                width={24}
                                style={{ borderRadius: "50%", verticalAlign: "middle" }}
                            />
                            <b> {entry._id.username}</b>
                            <span style={{ color: "#888", marginLeft: 6 }}>
                                Sent: {entry.count} gifts, {entry.total} WS-Coins
                            </span>
                        </div>
                    ))}
                </div>

                <div style={{ flex: 1 }}>
                    <h3>Top Receivers</h3>
                    {topReceivers.map((entry) => (
                        <div key={entry._id._id} style={{ marginBottom: 6 }}>
                            <img
                                src={entry._id.avatar}
                                width={24}
                                style={{ borderRadius: "50%", verticalAlign: "middle" }}
                            />
                            <b> {entry._id.username}</b>
                            <span style={{ color: "#888", marginLeft: 6 }}>
                                Received: {entry.count} gifts, {entry.total} WS-Coins
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
