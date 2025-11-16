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

    // SAFE STOP FUNCTION — voorkomt camera leaks
    const stopLive = () => {
        setIsLive(false);

        // Close all peer connections
        peersRef.current.forEach((pc) => pc.close());
        peersRef.current.clear();

        // Stop camera/mic
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }

        // Tell server stream is ended
        socket.emit("stop_broadcast", { roomId });

        onStop?.();
    };

    useEffect(() => {
        let active = true;

        (async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true,
                });

                if (!active) return;

                streamRef.current = stream;
                if (videoRef.current) videoRef.current.srcObject = stream;

                // Tell server we are live
                socket.emit("start_broadcast", { roomId, streamer: currentUser?.username });
                setIsLive(true);

                // ---- SOCKET EVENTS ----

                // A new viewer joined
                socket.on("watcher", async ({ watcherId }) => {
                    if (!streamRef.current) return;

                    const pc = new RTCPeerConnection(RTC_CONFIG);

                    // Add tracks
                    streamRef.current.getTracks().forEach((t) => pc.addTrack(t, streamRef.current));

                    // ICE candidates → viewer
                    pc.onicecandidate = ({ candidate }) => {
                        if (candidate) {
                            socket.emit("candidate", {
                                target: watcherId,
                                candidate
                            });
                        }
                    };

                    // Create offer
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);

                    socket.emit("offer", {
                        watcherId,
                        sdp: offer,
                    });

                    peersRef.current.set(watcherId, pc);
                });

                // Viewer answer
                socket.on("answer", async ({ watcherId, sdp }) => {
                    const pc = peersRef.current.get(watcherId);
                    if (pc) {
                        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
                    }
                });

                // ICE from viewer
                socket.on("candidate", async ({ from, candidate }) => {
                    const pc = peersRef.current.get(from);
                    if (pc && candidate) {
                        try {
                            await pc.addIceCandidate(new RTCIceCandidate(candidate));
                        } catch (err) {
                            console.warn("ICE error:", err);
                        }
                    }
                });

                // Viewer left
                socket.on("remove_watcher", ({ watcherId }) => {
                    const pc = peersRef.current.get(watcherId);
                    if (pc) pc.close();
                    peersRef.current.delete(watcherId);
                });

                // Live viewer count
                socket.on("viewer_count", ({ viewers }) => {
                    setViewers(viewers);
                });

                // Server force-stop
                socket.on("stream_ended", () => {
                    stopLive();
                });

            } catch (err) {
                console.error("Camera/Microphone error:", err);
            }
        })();

        return () => {
            active = false;

            // Remove ALL listeners
            socket.off("watcher");
            socket.off("answer");
            socket.off("candidate");
            socket.off("remove_watcher");
            socket.off("viewer_count");
            socket.off("stream_ended");

            // Stop immediately when component unmounts
            stopLive();
        };

        // eslint-disable-next-line
    }, [roomId]);

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
                        onClick={stopLive}
                        className="ml-3 px-3 py-1.5 bg-red-600 rounded-lg flex items-center gap-2"
                    >
                        <StopCircle className="w-4 h-4" /> Stop
                    </button>
                )}
            </div>

            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full bg-black object-contain"
            />
        </div>
    );
}
