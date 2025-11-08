import React, { useEffect, useState } from "react";
import axios from "axios";
import socket from "../api/socket";

export default function LiveDiscover({ setCurrentPage, setSelectedStream }) {
    const [streams, setStreams] = useState([]);

    // ✅ Realtime sync
    useEffect(() => {
        fetchStreams();
        socket.on("start_stream", fetchStreams);
        socket.on("stop_stream", fetchStreams);

        return () => {
            socket.off("start_stream");
            socket.off("stop_stream");
        };
    }, []);

    const fetchStreams = async () => {
        try {
            const res = await axios.get("/api/live");
            setStreams(res.data);
        } catch (err) {
            console.error("❌ Failed to load live streams", err);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black text-white p-8">
            <h1 className="text-3xl font-bold text-cyan-400 mb-8">🌍 World-Studio LIVE+ Discovery</h1>
            {streams.length === 0 ? (
                <p className="text-white/60 text-center mt-20">
                    No one is live right now. Be the first to go live! 🚀
                </p>
            ) : (
                <div className="grid md:grid-cols-3 gap-6">
                    {streams.map((s) => (
                        <div
                            key={s._id}
                            className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl overflow-hidden hover:scale-105 transition-transform cursor-pointer"
                            onClick={() => setSelectedStream(s)}
                        >
                            <div className="relative">
                                <img
                                    src={s.coverImage || "/default-cover.jpg"}
                                    alt="cover"
                                    className="w-full h-48 object-cover"
                                />
                                <div className="absolute top-2 left-2 bg-red-500 px-2 py-1 rounded-lg text-xs font-semibold">
                                    LIVE
                                </div>
                            </div>
                            <div className="p-4">
                                <h2 className="font-bold text-lg">{s.title}</h2>
                                <p className="text-white/60">🎙 {s.streamerName}</p>
                                <div className="mt-2 text-sm text-white/60">
                                    👁 {s.viewers || 0} viewers
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <div className="mt-10 flex justify-center">
                <button
                    onClick={() => setCurrentPage("live")}
                    className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-semibold hover:shadow-lg hover:shadow-cyan-500/30 transition-all"
                >
                    🎥 Start My Live Stream
                </button>
            </div>
        </div>
    );
}
