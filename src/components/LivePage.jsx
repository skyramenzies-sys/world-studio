import React, { useState } from "react";
import LivePublisher from "./LivePublisher";
import LiveViewer from "./LiveViewer";

export default function LivePage({ currentUser, setCurrentPage }) {
    const [mode, setMode] = useState(null); // "publish" | "watch"
    const [roomId, setRoomId] = useState("");

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black text-white">
            {!mode && (
                <div className="max-w-xl mx-auto py-16 px-6 space-y-6">
                    <h1 className="text-3xl font-bold text-cyan-400">🎥 World-Studio LIVE+</h1>

                    <div className="bg-white/10 border border-white/20 rounded-2xl p-6 space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm text-white/70">Room ID</label>
                            <input
                                value={roomId}
                                onChange={(e) => setRoomId(e.target.value)}
                                placeholder="bijv. sandro-live-1"
                                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg outline-none"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                disabled={!roomId}
                                onClick={() => setMode("publish")}
                                className="px-4 py-3 bg-red-600 rounded-xl font-semibold disabled:opacity-50"
                            >
                                Go Live
                            </button>
                            <button
                                disabled={!roomId}
                                onClick={() => setMode("watch")}
                                className="px-4 py-3 bg-cyan-600 rounded-xl font-semibold disabled:opacity-50"
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

            {mode === "publish" && (
                <div className="w-full h-screen">
                    <LivePublisher
                        currentUser={currentUser}
                        roomId={roomId}
                        onStop={() => setMode(null)}
                    />
                </div>
            )}

            {mode === "watch" && (
                <div className="w-full h-screen">
                    <LiveViewer roomId={roomId} onLeave={() => setMode(null)} />
                </div>
            )}
        </div>
    );
}
