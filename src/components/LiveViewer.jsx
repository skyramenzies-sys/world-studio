import React, { useEffect, useRef, useState } from "react";
import socket from "../api/socket";
import { RTC_CONFIG } from "../api/WebrtcConfig";
import { Users, SignalLow } from "lucide-react";

export default function LiveViewer({ roomId, onLeave }) {
    const videoRef = useRef(null);
    const pcRef = useRef(null);
    const [viewers, setViewers] = useState(0);
    const [live, setLive] = useState(true);

    useEffect(() => {
        let mounted = true;

        (async () => {
            // Laat server weten dat we komen kijken
            socket.emit("watcher", { roomId });

            // Ontvang offer van broadcaster
            socket.on("offer", async ({ sdp, broadcasterId }) => {
                const pc = new RTCPeerConnection(RTC_CONFIG);
                pcRef.current = pc;

                pc.ontrack = (e) => {
                    if (videoRef.current) videoRef.current.srcObject = e.streams[0];
                };

                pc.onicecandidate = ({ candidate }) => {
                    if (candidate) socket.emit("candidate", { target: broadcasterId, candidate });
                };

                await pc.setRemoteDescription(new RTCSessionDescription(sdp));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                socket.emit("answer", { broadcasterId, sdp: answer });
            });

            socket.on("candidate", async ({ candidate }) => {
                if (pcRef.current && candidate) {
                    try {
                        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
                    } catch { }
                }
            });

            socket.on("viewer_count", ({ viewers }) => setViewers(viewers));
            socket.on("stream_ended", () => {
                setLive(false);
                if (pcRef.current) {
                    pcRef.current.close();
                    pcRef.current = null;
                }
            });
        })();

        return () => {
            mounted = false;
            socket.off("offer");
            socket.off("candidate");
            socket.off("viewer_count");
            socket.off("stream_ended");
            if (pcRef.current) {
                pcRef.current.close();
                pcRef.current = null;
            }
            if (onLeave) onLeave();
        };
    }, [roomId, onLeave]);

    return (
        <div className="w-full h-full flex flex-col">
            <div className="p-3 flex items-center gap-3 bg-white/5 border-b border-white/10">
                <SignalLow className={`w-5 h-5 ${live ? "text-green-400" : "text-white/40"}`} />
                <span className="font-semibold">{live ? "LIVE" : "Ended"}</span>
                <div className="ml-auto flex items-center gap-2 text-white/70">
                    <Users className="w-4 h-4" />
                    <span>{viewers}</span>
                </div>
            </div>
            {live ? (
                <video ref={videoRef} autoPlay playsInline controls className="w-full h-full bg-black object-contain" />
            ) : (
                <div className="flex-1 grid place-items-center text-white/70">Stream has ended.</div>
            )}
        </div>
    );
}
