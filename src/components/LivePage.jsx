import React, { useState, useEffect } from "react";
import LivePublisher from "./LivePublisher";
import LiveViewer from "./LiveViewer";

export default function LivePage({ currentUser, setCurrentPage, selectedStream }) {
    const [mode, setMode] = useState(null);       // "publish" | "watch"
    const [roomId, setRoomId] = useState("");

    // 🌍 Auto-fill roomId wanneer user uit Discover / Profile komt
    useEffect(() => {
        if (selectedStream && selectedStream._id) {
            setRoomId(selectedStream._id);
            setMode("watch");
        }
    }, [selectedStream]);

    const startAsPublisher = () => {
        if (!currentUser) {
            alert("You must be logged in to go live.");
            return;
        }
        setMode("publish");
    };

    const startAsViewer = () => {
        if (!roomId.trim()) {
            alert("Room ID invalid.");
            return;
        }
        setMode("watch");
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black text-white">
            {/* HOME PANEL */}
            {!mode && (
                <div className="max-w-xl mx-auto py-16 px-6 space-y-10">
                    <h1 className="text-3xl font-bold text-cyan-400">
                        🎥 World-Studio LIVE+
                    </h1>

                    <div className="bg-white/10 border border-white/20 rounded-2xl p-6 space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm text-white/70">Room ID</label>
                            <input
                                value={roomId}
                                onChange={(e) => setRoomId(e.target.value)}
                                placeholder="bijv. sandro-live-001"
                                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg outline-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                disabled={!roomId.trim()}
                                onClick={startAsPublisher}
                                className="px-4 py-3 bg-red-600 rounded-xl font-semibold disabled:opacity-40"
                            >
                                Go Live
                            </button>

                            <button
                                disabled={!roomId.trim()}
                                onClick={startAsViewer}
                                className="px-4 py-3 bg-cyan-600 rounded-xl font-semibold disabled:opacity-40"
                            >
                                Watch
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={() => setCurrentPage("home")}
                        className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl"
                    >
                        ← Back to feed
                    </button>
                </div>
            )}

            {/* PUBLISHER MODE */}
            {mode === "publish" && (
                <div className="w-full h-screen">
                    <LivePublisher
                        currentUser={currentUser}
                        roomId={roomId}
                        onStop={() => {
                            setMode(null);
                            setRoomId("");
                        }}
                    />
                </div>
            )}

            {/* VIEWER MODE */}
            {mode === "watch" && (
                <div className="w-full h-screen">
                    <LiveViewer
                        roomId={roomId}
                        onLeave={() => {
                            setMode(null);
                            setRoomId("");
                        }}
                    />
                </div>
            )}
        </div>
    );
}
