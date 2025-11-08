import React, { useEffect, useRef, useState } from "react";
import socket from "../api/socket";
import { RTC_CONFIG } from "../api/WebrtcConfig";
import { Radio, StopCircle, Users } from "lucide-react";

export default function LivePublisher({ currentUser, roomId, onStop }) {
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const peersRef = useRef(new Map()); // watcherId -> RTCPeerConnection
    const [viewers, setViewers] = useState(0);
    const [isLive, setIsLive] = useState(false);

    useEffect(() => {
        let mounted = true;

        (async () => {
            // Camera/Mic ophalen
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            if (!mounted) return;
            streamRef.current = stream;
            if (videoRef.current) videoRef.current.srcObject = stream;

            // Zet live in room
            socket.emit("start_broadcast", { roomId });
            setIsLive(true);

            // Er komt een watcher bij → maak peer naar die watcher
            socket.on("watcher", async ({ watcherId }) => {
                const pc = new RTCPeerConnection(RTC_CONFIG);
                stream.getTracks().forEach((track) => pc.addTrack(track, stream));

                pc.onicecandidate = ({ candidate }) => {
                    if (candidate) socket.emit("candidate", { target: watcherId, candidate });
                };

                // Create offer → stuur naar watcher
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                socket.emit("offer", { watcherId, sdp: offer });

                peersRef.current.set(watcherId, pc);
            });

            // Krijg answer van watcher
            socket.on("answer", async ({ watcherId, sdp }) => {
                const pc = peersRef.current.get(watcherId);
                if (pc) await pc.setRemoteDescription(new RTCSessionDescription(sdp));
            });

            // ICE candidate van watcher
            socket.on("candidate", async ({ from, candidate }) => {
                const pc = peersRef.current.get(from);
                if (pc && candidate) {
                    try {
                        await pc.addIceCandidate(new RTCIceCandidate(candidate));
                    } catch { }
                }
            });

            // Viewer count realtime
            socket.on("viewer_count", ({ viewers }) => setViewers(viewers));

            // Stream ended door server (backup)
            socket.on("stream_ended", () => stopLive());

        })();

        const stopLive = () => {
            setIsLive(false);
            peersRef.current.forEach((pc) => pc.close());
            peersRef.current.clear();

            if (streamRef.current) {
                streamRef.current.getTracks().forEach((t) => t.stop());
                streamRef.current = null;
            }
            if (onStop) onStop();
        };

        return () => {
            mounted = false;
            socket.off("watcher");
            socket.off("answer");
            socket.off("candidate");
            socket.off("viewer_count");
            socket.off("stream_ended");
            // niet direct stoppen; UI kan het regelen via Stop-knop
        };
    }, [roomId, onStop]);

    const handleStop = () => {
        socket.emit("stop_broadcast");
        // locals sluiten
        peersRef.current.forEach((pc) => pc.close());
        peersRef.current.clear();
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
        setIsLive(false);
        if (onStop) onStop();
    };

    return (
        <div className="w-full h-full flex flex-col">
            <div className="p-3 flex items-center gap-3 bg-white/5 border-b border-white/10">
                <Radio className={`w-5 h-5 ${isLive ? "text-red-500" : "text-white/40"}`} />
                <span className="font-semibold">{isLive ? "LIVE" : "Offline"}</span>
                <div className="ml-auto flex items-center gap-2 text-white/70">
                    <Users className="w-4 h-4" />
                    <span>{viewers}</span>
                </div>
                {isLive && (
                    <button
                        onClick={handleStop}
                        className="ml-3 px-3 py-1.5 bg-red-600 rounded-lg flex items-center gap-2"
                    >
                        <StopCircle className="w-4 h-4" /> Stop
                    </button>
                )}
            </div>
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full bg-black object-contain" />
        </div>
    );
}
