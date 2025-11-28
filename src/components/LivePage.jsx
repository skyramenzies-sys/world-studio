// src/components/LivePage.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../api/api";
import LivePublisher from "./LivePublisher";
import LiveViewer from "./LiveViewer";

export default function LivePage() {
    const { streamId } = useParams();
    const navigate = useNavigate();

    const [currentUser, setCurrentUser] = useState(null);
    const [mode, setMode] = useState(null);
    const [roomId, setRoomId] = useState("");
    const [streamTitle, setStreamTitle] = useState("");
    const [streamCategory, setStreamCategory] = useState("Talk");
    const [streamInfo, setStreamInfo] = useState(null);
    const [loading, setLoading] = useState(false);

    const CATEGORIES = ["Music", "Gaming", "Talk", "Art", "Education", "Sports", "Cooking", "Fitness"];

    // Load user from localStorage
    useEffect(() => {
        const storedUser = localStorage.getItem("ws_currentUser");
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                setCurrentUser(user);
                if (!roomId && !streamId) {
                    setRoomId(`${user.username}-live-${Date.now().toString(36)}`);
                }
            } catch (e) {
                console.error("Failed to parse user:", e);
            }
        }
    }, []);

    // If streamId in URL, fetch stream info and auto-join as viewer
    useEffect(() => {
        if (streamId) {
            setLoading(true);

            const fetchStreamInfo = async () => {
                try {
                    const res = await api.get(`/live/${streamId}`);
                    const stream = res.data;

                    if (!stream) {
                        toast.error("Stream not found");
                        navigate("/discover");
                        return;
                    }

                    if (!stream.isLive) {
                        toast.error("This stream has ended");
                        navigate("/discover");
                        return;
                    }

                    setStreamInfo(stream);
                    // Use roomId from stream, fallback to _id
                    setRoomId(stream.roomId || stream._id || streamId);
                    setStreamTitle(stream.title || "Live Stream");
                    setStreamCategory(stream.category || "Talk");
                    setMode("watch");

                } catch (err) {
                    console.error("Failed to fetch stream:", err);
                    setRoomId(streamId);
                    setMode("watch");
                } finally {
                    setLoading(false);
                }
            };

            fetchStreamInfo();
        }
    }, [streamId, navigate]);

    const startAsPublisher = async () => {
        if (!currentUser) {
            toast.error("Please log in to go live");
            navigate("/login");
            return;
        }

        if (!roomId.trim()) {
            toast.error("Please enter a Room ID");
            return;
        }

        if (!streamTitle.trim()) {
            toast.error("Please enter a stream title");
            return;
        }

        setMode("publish");
    };

    const startAsViewer = () => {
        if (!roomId.trim()) {
            toast.error("Please enter a valid Room ID");
            return;
        }
        setMode("watch");
    };

    const handleStopStream = () => {
        setMode(null);
        toast.success("Stream ended");
        navigate("/discover");
    };

    const handleLeaveStream = () => {
        setMode(null);
        setRoomId("");
        setStreamInfo(null);
        navigate("/discover");
    };

    const generateRoomId = () => {
        const username = currentUser?.username || "user";
        const randomId = Math.random().toString(36).substring(2, 8);
        setRoomId(`${username}-${randomId}`);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mb-4"></div>
                    <p className="text-white/70">Connecting to stream...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="text-white">
            {!mode && (
                <div className="max-w-xl mx-auto py-8 md:py-16 px-4 md:px-6 space-y-8">
                    <div className="text-center">
                        <h1 className="text-3xl font-bold text-cyan-400 mb-2">
                            🎥 World-Studio LIVE+
                        </h1>
                        <p className="text-white/60">
                            Start your own stream or join others
                        </p>
                    </div>

                    {/* Go Live Section */}
                    <div className="bg-white/10 border border-white/20 rounded-2xl p-6 space-y-5">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                            Start Streaming
                        </h2>

                        {!currentUser && (
                            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                                <p className="text-yellow-400 text-sm">
                                    ⚠️ Please <button onClick={() => navigate("/login")} className="underline">log in</button> to start streaming
                                </p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm text-white/70">Stream Title</label>
                            <input
                                value={streamTitle}
                                onChange={(e) => setStreamTitle(e.target.value)}
                                placeholder="What are you streaming today?"
                                maxLength={100}
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg outline-none focus:border-cyan-400 transition"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm text-white/70">Category</label>
                            <div className="flex flex-wrap gap-2">
                                {CATEGORIES.map((cat) => (
                                    <button
                                        key={cat}
                                        onClick={() => setStreamCategory(cat)}
                                        className={`px-3 py-1.5 rounded-full text-sm transition ${streamCategory === cat
                                            ? "bg-cyan-500 text-black font-semibold"
                                            : "bg-white/10 text-white/70 hover:bg-white/20"
                                            }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm text-white/70">Room ID</label>
                            <div className="flex gap-2">
                                <input
                                    value={roomId}
                                    onChange={(e) => setRoomId(e.target.value)}
                                    placeholder="your-unique-room-id"
                                    className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg outline-none focus:border-cyan-400 transition"
                                />
                                <button
                                    onClick={generateRoomId}
                                    className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg hover:bg-white/20 transition text-sm"
                                >
                                    🎲
                                </button>
                            </div>
                        </div>

                        <button
                            disabled={!roomId.trim() || !streamTitle.trim() || !currentUser}
                            onClick={startAsPublisher}
                            className="w-full px-4 py-4 bg-gradient-to-r from-red-500 to-pink-600 rounded-xl font-bold text-lg disabled:opacity-40 disabled:cursor-not-allowed hover:from-red-400 hover:to-pink-500 transition-all"
                        >
                            🔴 Go Live
                        </button>
                    </div>

                    {/* Watch Section */}
                    <div className="bg-white/10 border border-white/20 rounded-2xl p-6 space-y-5">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            👁 Watch a Stream
                        </h2>

                        <div className="space-y-2">
                            <label className="text-sm text-white/70">Enter Room ID</label>
                            <input
                                value={roomId}
                                onChange={(e) => setRoomId(e.target.value)}
                                placeholder="Enter streamer's Room ID"
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg outline-none focus:border-cyan-400 transition"
                            />
                        </div>

                        <button
                            disabled={!roomId.trim()}
                            onClick={startAsViewer}
                            className="w-full px-4 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-bold text-lg disabled:opacity-40 disabled:cursor-not-allowed hover:from-cyan-400 hover:to-blue-500 transition-all"
                        >
                            ▶️ Watch Stream
                        </button>

                        <p className="text-center text-white/50 text-sm">
                            or{" "}
                            <button
                                onClick={() => navigate("/discover")}
                                className="text-cyan-400 hover:underline"
                            >
                                browse live streams
                            </button>
                        </p>
                    </div>

                    <button
                        onClick={() => navigate("/")}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition"
                    >
                        ← Back to Feed
                    </button>
                </div>
            )}

            {mode === "publish" && (
                <div className="w-full h-screen">
                    <LivePublisher
                        currentUser={currentUser}
                        roomId={roomId}
                        streamTitle={streamTitle}
                        streamCategory={streamCategory}
                        onStop={handleStopStream}
                    />
                </div>
            )}

            {mode === "watch" && (
                <div className="w-full h-screen">
                    <LiveViewer
                        roomId={roomId}
                        currentUser={currentUser}
                        streamInfo={streamInfo}
                        onLeave={handleLeaveStream}
                    />
                </div>
            )}
        </div>
    );
}