import React, { useEffect, useRef, useState } from "react";
import socket from "../api/socket";
import { RTC_CONFIG } from "../api/WebrtcConfig";
import { Users, SignalLow } from "lucide-react";

export default function LiveViewer({ roomId, onLeave }) {
    const videoRef = useRef(null);
    const pcRef = useRef(null);

    const [viewers, setViewers] = useState(0);
    const [live, setLive] = useState(true);
    const [connecting, setConnecting] = useState(true);
    const [quality, setQuality] = useState("Good");

    // ========= CLEAN RTC CREATION =========
    const createPeerConnection = () => {
        const pc = new RTCPeerConnection(RTC_CONFIG);

        pc.ontrack = (e) => {
            if (videoRef.current) videoRef.current.srcObject = e.streams[0];
            setConnecting(false);
        };

        pc.onconnectionstatechange = () => {
            const state = pc.connectionState;
            if (state === "failed" || state === "disconnected") {
                setQuality("Low");
            }
            if (state === "connected") {
                setQuality("Good");
            }
        };

        pc.onicecandidate = ({ candidate }) => {
            if (candidate) {
                socket.emit("candidate", {
                    target: "broadcaster",
                    candidate,
                    roomId
                });
            }
        };

        return pc;
    };

    // ========= MAIN EFFECT =========
    useEffect(() => {
        let mounted = true;

        // Announce watcher
        socket.emit("watcher", { roomId });
        setConnecting(true);

        // === Broadcaster sends WebRTC offer ===
        const handleOffer = async ({ sdp, broadcasterId }) => {
            if (!mounted) return;

            if (pcRef.current) pcRef.current.close();
            const pc = createPeerConnection();
            pcRef.current = pc;

            await pc.setRemoteDescription(new RTCSessionDescription(sdp));

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            socket.emit("answer", { broadcasterId, sdp: answer });
        };

        // === ICE candidates ===
        const handleCandidate = async ({ candidate }) => {
            if (pcRef.current && candidate) {
                try {
                    await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
                } catch { }
            }
        };

        // === Viewer count ===
        const handleViewerCount = ({ viewers }) => setViewers(viewers);

        // === Stream ended ===
        const handleStreamEnded = () => {
            setLive(false);
            setConnecting(false);
            if (pcRef.current) {
                pcRef.current.close();
                pcRef.current = null;
            }
        };

        socket.on("offer", handleOffer);
        socket.on("candidate", handleCandidate);
        socket.on("viewer_count", handleViewerCount);
        socket.on("stream_ended", handleStreamEnded);

        // === Cleanup ===
        return () => {
            mounted = false;
            socket.off("offer", handleOffer);
            socket.off("candidate", handleCandidate);
            socket.off("viewer_count", handleViewerCount);
            socket.off("stream_ended", handleStreamEnded);

            if (pcRef.current) {
                pcRef.current.close();
                pcRef.current = null;
            }

            socket.emit("leave_stream", roomId);
            if (onLeave) onLeave();
        };
    }, [roomId, onLeave]);

    // ========= UI =========
    return (
        <div className="w-full h-full flex flex-col">
            {/* Top bar */}
            <div className="p-3 flex items-center gap-3 bg-white/5 border-b border-white/10">
                <SignalLow
                    className={`w-5 h-5 ${live
                            ? quality === "Good"
                                ? "text-green-400"
                                : "text-yellow-400"
                            : "text-white/40"
                        }`}
                />
                <span className="font-semibold">
                    {live ? (connecting ? "Connecting…" : "LIVE") : "Ended"}
                </span>

                <div className="ml-auto flex items-center gap-2 text-white/70">
                    <Users className="w-4 h-4" />
                    <span>{viewers}</span>
                </div>
            </div>

            {/* Video or fallback */}
            {live ? (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    controls
                    className="w-full h-full bg-black object-contain"
                />
            ) : (
                <div className="flex-1 grid place-items-center text-white/70 text-lg">
                    Stream has ended.
                </div>
            )}
        </div>
    );
}
