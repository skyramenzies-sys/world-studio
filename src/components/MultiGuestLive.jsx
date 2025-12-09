// src/components/MultiGuestLive.jsx - WORLD STUDIO LIVE ULTIMATE EDITION 🚀
import React, { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "react-hot-toast";
import axios from "axios";
import { io } from "socket.io-client";
import LiveGiftPanel from "./LiveGiftPanel";

/* ============================================================
   WORLD STUDIO LIVE CONFIGURATION
   ============================================================ */

// Zelfde pattern als de andere U.E. components
const RAW_BASE_URL =
    import.meta.env.VITE_API_URL ||
    "https://world-studio-production.up.railway.app";

const BASE_URL = RAW_BASE_URL.replace(/\/api\/?$/, "").replace(/\/$/, "");

const API_BASE_URL = BASE_URL;
const SOCKET_URL = BASE_URL;

// Axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: { "Content-Type": "application/json" },
});

// Auth token toevoegen
api.interceptors.request.use((config) => {
    const token =
        localStorage.getItem("ws_token") || localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Socket singleton
let socketSingleton = null;
const getSocket = () => {
    if (!socketSingleton) {
        socketSingleton = io(SOCKET_URL, {
            transports: ["websocket", "polling"],
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
        });
    }
    return socketSingleton;
};

/* ============================================================
   CONSTANTS
   ============================================================ */

const RTC_CONFIG = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun3.l.google.com:19302" },
    ],
};

// maxSeats → layout
const SEAT_LAYOUTS = {
    1: { cols: 1, rows: 1 },
    2: { cols: 2, rows: 1 },
    4: { cols: 2, rows: 2 },
    6: { cols: 3, rows: 2 },
    9: { cols: 3, rows: 3 },
    12: { cols: 4, rows: 3 },
};

const BACKGROUNDS = [
    { id: "none", name: "None", filter: "none" },
    { id: "blur", name: "Blur", filter: "blur(10px)" },
    {
        id: "beach",
        name: "🏖️ Beach",
        image:
            "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400",
    },
    {
        id: "city",
        name: "🌆 City",
        image:
            "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400",
    },
    {
        id: "galaxy",
        name: "🌌 Galaxy",
        image:
            "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=400",
    },
    {
        id: "sunset",
        name: "🌅 Sunset",
        image:
            "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400",
    },
];

/* ============================================================
   GIFT ANIMATION
   ============================================================ */

const GiftAnimation = ({ gift, onComplete }) => {
    useEffect(() => {
        const timer = setTimeout(onComplete, 3000);
        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <div className="absolute top-4 left-4 z-50 animate-bounce-in pointer-events-none">
            <div className="bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 p-3 rounded-2xl shadow-2xl">
                <div className="flex items-center gap-3">
                    <span className="text-4xl animate-pulse">
                        {gift.icon}
                    </span>
                    <div>
                        <p className="text-white font-bold text-sm">
                            {gift.from}
                        </p>
                        <p className="text-white/80 text-xs">
                            sent {gift.name}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ============================================================
   EMPTY SEAT
   ============================================================ */

const EmptySeat = ({ seatId, onRequestSeat, isPending }) => (
    <div className="relative aspect-square bg-black/40 rounded-2xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center cursor-pointer hover:border-cyan-400/50 hover:bg-white/5 transition-all group">
        <button
            onClick={() => onRequestSeat(seatId)}
            disabled={isPending}
            className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-cyan-500/20 transition disabled:opacity-50"
        >
            {isPending ? (
                <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            ) : (
                <span className="text-3xl">🪑</span>
            )}
        </button>
        <p className="text-white/50 text-sm mt-2 font-medium">
            Seat {seatId + 1}
        </p>
        <p className="text-white/30 text-xs">
            {isPending ? "Request pending..." : "Tap to join"}
        </p>
    </div>
);

/* ============================================================
   OCCUPIED SEAT
   ============================================================ */

const OccupiedSeat = ({
    seat,
    isSelf,
    onKick,
    onMute,
    localStream,
    isHostUser,
    currentGift,
    background,
}) => {
    const videoRef = useRef(null);
    const [showControls, setShowControls] = useState(false);

    useEffect(() => {
        const videoEl = videoRef.current;
        if (!videoEl) return;

        let streamToShow = null;
        if (isSelf && localStream) {
            streamToShow = localStream;
        } else if (seat.stream) {
            streamToShow = seat.stream;
        }

        if (!streamToShow) {
            videoEl.srcObject = null;
            return;
        }

        if (videoEl.srcObject !== streamToShow) {
            videoEl.srcObject = streamToShow;
        }

        const play = async () => {
            try {
                await videoEl.play();
            } catch (err) {
                console.log("🔇 Video autoplay blocked:", err?.message || err);
            }
        };

        play();
    }, [seat.stream, localStream, isSelf]);

    return (
        <div
            className={`relative aspect-square rounded-2xl overflow-hidden ${seat.isHost
                    ? "ring-4 ring-yellow-400 shadow-lg shadow-yellow-400/20"
                    : "ring-2 ring-white/20"
                }`}
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
        >
            {/* Video / Avatar */}
            {(isSelf && localStream) || seat.stream ? (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={isSelf}
                    className="w-full h-full object-cover bg-black"
                    style={{
                        filter: background?.filter || "none",
                        backgroundImage: background?.image
                            ? `url(${background.image})`
                            : undefined,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                    }}
                />
            ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                    <img
                        src={seat.user?.avatar || "/defaults/default-avatar.png"}
                        alt={seat.user?.username}
                        className="w-20 h-20 rounded-full object-cover border-4 border-white/30"
                        onError={(e) => {
                            e.currentTarget.src = "/defaults/default-avatar.png";
                        }}
                    />
                </div>
            )}

            {/* Gift Animation */}
            {currentGift && currentGift.targetSeatId === seat.id && (
                <GiftAnimation gift={currentGift} onComplete={() => { }} />
            )}

            {/* Bottom Info */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3">
                <div className="flex items-center gap-2">
                    {seat.isHost && <span className="text-yellow-400 text-lg">👑</span>}
                    <span className="text-white font-bold truncate">
                        {seat.user?.username || "Guest"}
                    </span>
                    {seat.isMuted && <span className="text-red-400">🔇</span>}
                    {isSelf && (
                        <span className="text-cyan-400 text-xs bg-cyan-400/20 px-2 py-0.5 rounded-full">
                            (You)
                        </span>
                    )}
                </div>
            </div>

            {/* Host Badge */}
            {seat.isHost && (
                <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-500 px-2 py-1 rounded-full">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    <span className="text-xs font-bold">HOST</span>
                </div>
            )}

            {/* Host Controls */}
            {isHostUser && !seat.isHost && showControls && seat.user && (
                <div className="absolute top-2 right-2 flex gap-2">
                    {onMute && (
                        <button
                            onClick={() => onMute(seat.user._id)}
                            className="w-9 h-9 bg-orange-500/90 rounded-full text-lg hover:bg-orange-500 transition flex items-center justify-center backdrop-blur-sm"
                            title="Mute user"
                        >
                            🔇
                        </button>
                    )}
                    {onKick && (
                        <button
                            onClick={() => onKick(seat.user._id)}
                            className="w-9 h-9 bg-red-500/90 rounded-full text-lg hover:bg-red-500 transition flex items-center justify-center backdrop-blur-sm"
                            title="Kick user"
                        >
                            👢
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

/* ============================================================
   MAIN COMPONENT
   ============================================================ */

export default function MultiGuestLive({
    roomId,
    currentUser,
    streamTitle = "Multi-Guest Live",
    streamCategory = "Talk",
    maxSeats = 12,
    streamId,
    isHost = false,
    onEnd,
    audioOnly = false,
}) {
    const socketRef = useRef(null);
    const localStreamRef = useRef(null);
    const peersRef = useRef(new Map());

    const [seats, setSeats] = useState([]);
    const [viewers, setViewers] = useState(0);
    const [viewersList, setViewersList] = useState([]);
    const [showViewers, setShowViewers] = useState(false);
    const [isLive, setIsLive] = useState(false);

    const [chat, setChat] = useState([]);
    const [chatInput, setChatInput] = useState("");
    const [activeTab, setActiveTab] = useState("chat");

    const [seatRequests, setSeatRequests] = useState([]);
    const [pendingRequest, setPendingRequest] = useState(null);

    const [gifts, setGifts] = useState([]);
    const [totalGifts, setTotalGifts] = useState(0);
    const [hostInfo, setHostInfo] = useState(null);
    const [mySeatId, setMySeatId] = useState(null);
    const [currentGiftAnimation, setCurrentGiftAnimation] = useState(null);

    const [selectedBackground, setSelectedBackground] = useState(BACKGROUNDS[0]);
    const [showBackgroundPicker, setShowBackgroundPicker] = useState(false);

    const chatEndRef = useRef(null);

    /* ------------------------------------------------------------
       INIT SOCKET
       ------------------------------------------------------------ */
    useEffect(() => {
        socketRef.current = getSocket();

    }, []);

    /* ------------------------------------------------------------
       INIT SEATS
       ------------------------------------------------------------ */
    useEffect(() => {
        const layout = SEAT_LAYOUTS[maxSeats] || SEAT_LAYOUTS[12];
        const seatCount = maxSeats || layout.cols * layout.rows;

        const initialSeats = Array.from({ length: seatCount }, (_, idx) => ({
            id: idx,
            isHost: idx === 0,
            user: null,
            stream: null,
            isMuted: false,
        }));

        if (isHost && currentUser) {
            initialSeats[0].user = currentUser;
            setMySeatId(0);
            setHostInfo(currentUser);
        }

        setSeats(initialSeats);
    }, [maxSeats, isHost, currentUser]);

    /* ------------------------------------------------------------
       AUTO SCROLL CHAT
       ------------------------------------------------------------ */
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chat]);

    /* ------------------------------------------------------------
       CAMERA / MIC START
       ------------------------------------------------------------ */
    const startMedia = useCallback(async () => {
        if (!navigator.mediaDevices?.getUserMedia) {
            toast.error("Media devices not supported");
            return null;
        }

        try {
            const constraints = audioOnly
                ? {
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                    },
                }
                : {
                    video: {
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        facingMode: "user",
                    },
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                    },
                };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            localStreamRef.current = stream;
            console.log("✅ Media started:", stream.getTracks());
            return stream;
        } catch (err) {
            console.error("❌ Media error:", err);
            toast.error("Could not access camera/microphone");
            return null;
        }
    }, [audioOnly]);

    /* ------------------------------------------------------------
       PEER CONNECTION
       ------------------------------------------------------------ */
    const createPeerConnection = useCallback(
        (peerId) => {
            if (typeof window === "undefined" || !window.RTCPeerConnection) {
                toast.error("WebRTC not supported in this browser");
                return null;
            }

            const selfId = currentUser?._id || currentUser?.id;
            if (!selfId) return null;

            if (peersRef.current.has(peerId)) {
                return peersRef.current.get(peerId);
            }

            const pc = new RTCPeerConnection(RTC_CONFIG);

            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach((track) => {
                    pc.addTrack(track, localStreamRef.current);
                    console.log(`📤 Added ${track.kind} track for user ${peerId}`);
                });
            }

            pc.ontrack = (event) => {
                console.log(`📹 Received ${event.track.kind} from ${peerId}`);
                const [remoteStream] = event.streams;

                setSeats((prev) =>
                    prev.map((seat) =>
                        seat.user?._id === peerId ? { ...seat, stream: remoteStream } : seat
                    )
                );
            };

            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    const socket = socketRef.current;
                    socket.emit("multi_ice_candidate", {
                        roomId,
                        targetId: peerId,
                        candidate: event.candidate,
                        fromId: selfId,
                    });
                }
            };

            pc.onconnectionstatechange = () => {
                console.log(`Connection ${peerId}:`, pc.connectionState);
            };

            peersRef.current.set(peerId, pc);
            return pc;
        },
        [roomId, currentUser]
    );

    /* ------------------------------------------------------------
       SOCKET EVENTS
       ------------------------------------------------------------ */
    useEffect(() => {
        if (!currentUser || !roomId) return;

        const socket = socketRef.current;
        if (!socket) return;

        const selfId = currentUser._id || currentUser.id;

        // Join room als viewer/host
        socket.emit("join_multi_live", {
            roomId,
            user: currentUser,
            isHost,
        });

        // Viewer count
        const handleViewerCount = (payload) => {
            const c = payload?.count ?? payload?.viewers ?? 0;
            setViewers(c);
        };

        const handleViewersList = ({ viewers: list }) => {
            setViewersList(list || []);
        };

        const handleChatMessage = (msg) => {
            if (msg.roomId && msg.roomId !== roomId) return;
            setChat((prev) => [...prev.slice(-100), msg]);
        };

        const handleSeatRequest = (req) => {
            if (!isHost || req.roomId !== roomId) return;
            setSeatRequests((prev) => {
                if (prev.some((r) => r.odId === req.odId)) return prev;
                return [...prev, req];
            });
            toast(`🙋 ${req.user?.username} wants to join!`, {
                duration: 5000,
                icon: "👋",
            });
        };

        const handleSeatApproved = async ({ seatId, user, roomId: rid }) => {
            if (rid !== roomId) return;

            setSeats((prev) =>
                prev.map((s, idx) => (idx === seatId ? { ...s, user } : s))
            );

            if (user._id === selfId) {
                setPendingRequest(null);
                setMySeatId(seatId);
                toast.success(`✅ You joined seat ${seatId + 1}!`);

                const stream = await startMedia();
                if (stream) {
                    socket.emit("guest_ready", {
                        roomId,
                        odId: selfId,
                        seatId,
                    });
                }
            }
        };

        const handleSeatRejected = ({ odId, roomId: rid }) => {
            if (rid === roomId && odId === selfId) {
                setPendingRequest(null);
                toast.error("❌ Your request was declined");
            }
        };

        const handleGuestReady = async ({ odId, roomId: rid }) => {
            if (rid !== roomId || odId === selfId) return;

            console.log(`🎥 Guest ${odId} ready, creating offer...`);

            if (localStreamRef.current && mySeatId !== null) {
                const pc = createPeerConnection(odId);
                if (!pc) return;

                try {
                    const offer = await pc.createOffer({
                        offerToReceiveAudio: true,
                        offerToReceiveVideo: !audioOnly,
                    });
                    await pc.setLocalDescription(offer);

                    socket.emit("multi_offer", {
                        roomId,
                        targetId: odId,
                        sdp: offer,
                        fromId: selfId,
                    });

                    console.log(`📤 Offer sent to ${odId}`);
                } catch (err) {
                    console.error("Offer error:", err);
                }
            }
        };

        const handleMultiOffer = async ({ fromId, sdp, roomId: rid }) => {
            if (rid !== roomId || fromId === selfId) return;

            console.log(`📥 Offer from ${fromId}`);

            const pc = createPeerConnection(fromId);
            if (!pc) return;

            try {
                await pc.setRemoteDescription(new RTCSessionDescription(sdp));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                socket.emit("multi_answer", {
                    roomId,
                    targetId: fromId,
                    sdp: answer,
                    fromId: selfId,
                });

                console.log(`📤 Answer sent to ${fromId}`);
            } catch (err) {
                console.error("Answer error:", err);
            }
        };

        const handleMultiAnswer = async ({ fromId, sdp, roomId: rid }) => {
            if (rid !== roomId) return;

            console.log(`📥 Answer from ${fromId}`);

            const pc = peersRef.current.get(fromId);
            if (pc) {
                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
                } catch (err) {
                    console.error("Set answer error:", err);
                }
            }
        };

        const handleIceCandidate = async ({ fromId, candidate, roomId: rid }) => {
            if (rid !== roomId) return;
            const pc = peersRef.current.get(fromId);
            if (pc && candidate) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (err) {
                    console.error("ICE error:", err);
                }
            }
        };

        const handleUserLeftSeat = ({ odId, roomId: rid }) => {
            if (rid !== roomId) return;
            setSeats((prev) =>
                prev.map((s) =>
                    s.user?._id === odId
                        ? { ...s, user: null, stream: null, isMuted: false }
                        : s
                )
            );
            const pc = peersRef.current.get(odId);
            if (pc) {
                pc.close();
                peersRef.current.delete(odId);
            }
        };

        const handleKickedFromSeat = ({ roomId: rid }) => {
            if (rid !== roomId) return;
            toast.error("You were removed from the stream");
            setMySeatId(null);
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach((t) => t.stop());
                localStreamRef.current = null;
            }
        };

        const handleUserMuted = ({ odId, roomId: rid }) => {
            if (rid !== roomId) return;

            setSeats((prev) =>
                prev.map((s) =>
                    s.user?._id === odId ? { ...s, isMuted: true } : s
                )
            );

            if (odId === selfId) {
                toast("🔇 You were muted by the host");
                if (localStreamRef.current) {
                    localStreamRef.current.getAudioTracks().forEach((track) => {
                        track.enabled = false;
                    });
                }
            }
        };

        const handleGiftReceived = (gift) => {
            setGifts((prev) => [
                ...prev.slice(-20),
                {
                    icon: gift.icon,
                    name: gift.item || gift.name,
                    from: gift.senderUsername,
                    targetSeatId: gift.targetSeatId || 0,
                },
            ]);
            setTotalGifts((prev) => prev + 1);

            const animGift = {
                icon: gift.icon,
                name: gift.item || gift.name,
                from: gift.senderUsername,
                targetSeatId: gift.targetSeatId || 0,
            };

            setCurrentGiftAnimation(animGift);
            setTimeout(() => setCurrentGiftAnimation(null), 3000);

            toast.success(`🎁 ${gift.senderUsername} sent ${gift.icon || "🎁"}!`);
        };

        const handleMultiLiveEnded = ({ roomId: rid }) => {
            if (rid !== roomId) return;
            toast("Stream ended");
            onEnd?.();
        };

        socket.on("viewer_count", handleViewerCount);
        socket.on("viewers_list", handleViewersList);
        socket.on("chat_message", handleChatMessage);
        socket.on("seat_request", handleSeatRequest);
        socket.on("seat_approved", handleSeatApproved);
        socket.on("seat_rejected", handleSeatRejected);
        socket.on("guest_ready", handleGuestReady);
        socket.on("multi_offer", handleMultiOffer);
        socket.on("multi_answer", handleMultiAnswer);
        socket.on("multi_ice_candidate", handleIceCandidate);
        socket.on("user_left_seat", handleUserLeftSeat);
        socket.on("kicked_from_seat", handleKickedFromSeat);
        socket.on("user_muted", handleUserMuted);
        socket.on("gift_received", handleGiftReceived);
        socket.on("multi_live_ended", handleMultiLiveEnded);

        // Host info voor viewers
        if (!isHost && (streamId || roomId)) {
            api.get(`/api/live/${streamId || roomId}`)
                .then((res) => {
                    if (res.data?.host) {
                        setHostInfo(res.data.host);
                        setSeats((prev) =>
                            prev.map((s, idx) =>
                                idx === 0
                                    ? { ...s, user: res.data.host, isHost: true }
                                    : s
                            )
                        );
                    }
                })
                .catch(() => { });
        }

        return () => {
            socket.emit("leave_multi_live", {
                roomId,
                odId: selfId,
            });

            [
                "viewer_count",
                "viewers_list",
                "chat_message",
                "seat_request",
                "seat_approved",
                "seat_rejected",
                "guest_ready",
                "multi_offer",
                "multi_answer",
                "multi_ice_candidate",
                "user_left_seat",
                "kicked_from_seat",
                "user_muted",
                "gift_received",
                "multi_live_ended",
            ].forEach((e) => socket.off(e));
        };
    }, [
        roomId,
        streamId,
        currentUser,
        isHost,
        mySeatId,
        createPeerConnection,
        startMedia,
        onEnd,
        audioOnly,
    ]);

    /* ------------------------------------------------------------
       HOST: GO LIVE / END LIVE
       ------------------------------------------------------------ */
    const goLive = async () => {
        const stream = await startMedia();
        if (!stream) return;

        const socket = socketRef.current;
        socket.emit("start_multi_live", {
            roomId,
            streamId,
            host: currentUser,
            title: streamTitle,
            maxSeats,
            audioOnly,
        });

        setIsLive(true);
        toast.success("🔴 You're LIVE!");
    };

    const endLive = async () => {
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((t) => t.stop());
        }
        peersRef.current.forEach((pc) => pc.close());
        peersRef.current.clear();

        const socket = socketRef.current;
        socket.emit("end_multi_live", { roomId });

        if (streamId) {
            try {
                await api.post(`/api/live/${streamId}/end`);
            } catch {
                // ignore
            }
        }

        onEnd?.();
    };

    /* ------------------------------------------------------------
       SEAT REQUESTS
       ------------------------------------------------------------ */
    const requestSeat = (seatId) => {
        if (pendingRequest !== null || mySeatId !== null) return;
        if (!currentUser) {
            toast.error("Log in to join the panel");
            return;
        }
        const selfId = currentUser._id || currentUser.id;
        if (!selfId) return;

        setPendingRequest(seatId);
        const socket = socketRef.current;
        socket.emit("request_seat", {
            roomId,
            seatId,
            user: currentUser,
            odId: selfId,
        });
        toast("⏳ Request sent!");
    };

    const approveSeatRequest = (req) => {
        setSeats((prev) =>
            prev.map((s, idx) =>
                idx === req.seatId ? { ...s, user: req.user } : s
            )
        );

        const socket = socketRef.current;
        socket.emit("approve_seat", {
            roomId,
            seatId: req.seatId,
            user: req.user,
            odId: req.odId,
        });

        setSeatRequests((prev) => prev.filter((r) => r.odId !== req.odId));
        toast.success(`✅ ${req.user?.username} approved!`);
    };

    const rejectSeatRequest = (req) => {
        const socket = socketRef.current;
        socket.emit("reject_seat", {
            roomId,
            odId: req.odId,
        });
        setSeatRequests((prev) => prev.filter((r) => r.odId !== req.odId));
    };

    const kickFromSeat = (userId) => {
        const socket = socketRef.current;
        socket.emit("kick_from_seat", {
            roomId,
            odId: userId,
        });
        toast("👢 User removed");
    };

    const muteUser = (userId) => {
        const socket = socketRef.current;
        socket.emit("mute_user", { roomId, odId: userId });
        toast("🔇 User muted");
    };

    const leaveSeat = () => {
        if (!currentUser) return;
        const selfId = currentUser._id || currentUser.id;
        const socket = socketRef.current;
        socket.emit("leave_seat", {
            roomId,
            odId: selfId,
        });
        setMySeatId(null);
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((t) => t.stop());
            localStreamRef.current = null;
        }
    };

    /* ------------------------------------------------------------
       CHAT
       ------------------------------------------------------------ */
    const sendMessage = (e) => {
        e.preventDefault();
        const text = chatInput.trim();
        if (!text) return;

        if (!currentUser) {
            toast.error("Log in to chat");
            return;
        }

        const socket = socketRef.current;
        socket.emit("chat_message", {
            roomId,
            username: currentUser.username,
            text,
            avatar: currentUser.avatar,
        });
        setChatInput("");
    };

    /* ------------------------------------------------------------
       LAYOUT
       ------------------------------------------------------------ */
    const getGridClass = () => {
        const layout = SEAT_LAYOUTS[maxSeats] || SEAT_LAYOUTS[12];
        if (layout.cols === 1) return "grid-cols-1";
        if (layout.cols === 2) return "grid-cols-2";
        if (layout.cols === 3) return "grid-cols-3";
        return "grid-cols-4";
    };

    /* ------------------------------------------------------------
       RENDER
       ------------------------------------------------------------ */
    return (
        <div className="h-screen flex flex-col bg-gradient-to-br from-gray-900 via-purple-900/30 to-gray-900 text-white relative">
            {/* Header */}
            <div className="flex items-center justify-between p-3 bg-black/50 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-red-500 px-3 py-1.5 rounded-full">
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        <span className="font-bold text-sm">
                            {audioOnly ? "LIVE AUDIO" : "LIVE"}
                        </span>
                    </div>
                    <div>
                        <h2 className="font-bold">{streamTitle}</h2>
                        <p className="text-white/50 text-xs">{streamCategory}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {totalGifts > 0 && (
                        <div className="flex items-center gap-1 text-yellow-400">
                            <span>🎁</span>
                            <span className="font-bold">{totalGifts}</span>
                        </div>
                    )}

                    <div
                        className="flex items-center gap-1 text-white/70 cursor-pointer hover:text-cyan-400 transition"
                        onClick={() => setShowViewers(!showViewers)}
                    >
                        <span>👁</span>
                        <span className="font-bold">{viewers}</span>
                    </div>

                    {isHost && mySeatId === 0 && (
                        <button
                            onClick={() =>
                                setShowBackgroundPicker(!showBackgroundPicker)
                            }
                            className="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 rounded-full font-bold text-sm transition"
                        >
                            🎨 BG
                        </button>
                    )}

                    {mySeatId !== null && !isHost && (
                        <button
                            onClick={leaveSeat}
                            className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 rounded-full font-bold text-sm transition"
                        >
                            Leave
                        </button>
                    )}

                    {isHost && (
                        <button
                            onClick={endLive}
                            className="px-4 py-1.5 bg-red-500 hover:bg-red-600 rounded-full font-bold text-sm transition"
                        >
                            End Stream
                        </button>
                    )}
                </div>
            </div>

            {/* Viewers Dropdown */}
            {showViewers && (
                <div className="absolute top-16 right-4 bg-black/90 backdrop-blur-lg rounded-xl p-4 border border-white/20 z-50 max-h-64 overflow-y-auto shadow-2xl">
                    <h3 className="font-bold mb-3 text-cyan-400">
                        👥 Viewers ({viewersList.length})
                    </h3>
                    {viewersList.length === 0 ? (
                        <p className="text-white/40 text-sm">No viewers yet</p>
                    ) : (
                        <div className="space-y-2">
                            {viewersList.map((viewer, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/10"
                                >
                                    <img
                                        src={
                                            viewer.avatar ||
                                            "/defaults/default-avatar.png"
                                        }
                                        className="w-8 h-8 rounded-full"
                                        alt=""
                                        onError={(e) => {
                                            e.currentTarget.src =
                                                "/defaults/default-avatar.png";
                                        }}
                                    />
                                    <span className="text-sm">
                                        {viewer.username}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Background Picker */}
            {showBackgroundPicker && (
                <div className="absolute top-16 right-4 bg-black/90 backdrop-blur-lg rounded-xl p-4 border border-white/20 z-50 shadow-2xl">
                    <h3 className="font-bold mb-3 text-purple-400">
                        🎨 Choose Background
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                        {BACKGROUNDS.map((bg) => (
                            <button
                                key={bg.id}
                                onClick={() => {
                                    setSelectedBackground(bg);
                                    setShowBackgroundPicker(false);
                                    toast.success(`Background: ${bg.name}`);
                                }}
                                className={`p-3 rounded-lg border-2 transition hover:scale-105 ${selectedBackground.id === bg.id
                                        ? "border-purple-400 bg-purple-500/20"
                                        : "border-white/20 bg-white/5"
                                    }`}
                            >
                                {bg.image ? (
                                    <img
                                        src={bg.image}
                                        className="w-full h-16 object-cover rounded mb-1"
                                        alt=""
                                    />
                                ) : (
                                    <div className="w-full h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded mb-1" />
                                )}
                                <p className="text-xs font-semibold">{bg.name}</p>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* Seats Grid */}
                <div className="flex-1 p-4 overflow-y-auto flex items-center justify-center relative">
                    <div className={`grid ${getGridClass()} gap-3 w-full max-w-3xl`}>
                        {seats.map((seat, idx) =>
                            seat.user ? (
                                <OccupiedSeat
                                    key={idx}
                                    seat={seat}
                                    isSelf={seat.user?._id === currentUser?._id}
                                    localStream={
                                        seat.user?._id === currentUser?._id
                                            ? localStreamRef.current
                                            : null
                                    }
                                    onKick={isHost && !seat.isHost ? kickFromSeat : null}
                                    onMute={isHost && !seat.isHost ? muteUser : null}
                                    isHostUser={isHost}
                                    currentGift={currentGiftAnimation}
                                    background={
                                        seat.user?._id === currentUser?._id && isHost
                                            ? selectedBackground
                                            : null
                                    }
                                />
                            ) : (
                                <EmptySeat
                                    key={idx}
                                    seatId={idx}
                                    onRequestSeat={requestSeat}
                                    isPending={pendingRequest === idx}
                                />
                            )
                        )}
                    </div>

                    {/* Go Live Overlay (host) */}
                    {isHost && !isLive && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                            <button
                                onClick={goLive}
                                className="px-10 py-5 bg-gradient-to-r from-red-500 to-pink-600 rounded-full font-bold text-xl hover:scale-105 transition-all shadow-2xl"
                            >
                                {audioOnly ? "🎙 Go LIVE (Audio)" : "🎥 Go LIVE"}
                            </button>
                        </div>
                    )}

                    {/* Global Gift Animation */}
                    {currentGiftAnimation && (
                        <GiftAnimation
                            gift={currentGiftAnimation}
                            onComplete={() => setCurrentGiftAnimation(null)}
                        />
                    )}
                </div>

                {/* Sidebar */}
                <div className="w-full lg:w-96 bg-black/40 border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col max-h-[50vh] lg:max-h-full">
                    {/* Tabs */}
                    <div className="flex border-b border-white/10">
                        <button
                            onClick={() => setActiveTab("chat")}
                            className={`flex-1 py-3 text-sm font-semibold transition ${activeTab === "chat"
                                    ? "text-cyan-400 border-b-2 border-cyan-400"
                                    : "text-white/50"
                                }`}
                        >
                            💬 Chat
                        </button>
                        {isHost && (
                            <button
                                onClick={() => setActiveTab("requests")}
                                className={`flex-1 py-3 text-sm font-semibold relative transition ${activeTab === "requests"
                                        ? "text-cyan-400 border-b-2 border-cyan-400"
                                        : "text-white/50"
                                    }`}
                            >
                                🙋 Requests
                                {seatRequests.length > 0 && (
                                    <span className="absolute top-2 right-4 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center animate-pulse">
                                        {seatRequests.length}
                                    </span>
                                )}
                            </button>
                        )}
                        <button
                            onClick={() => setActiveTab("gifts")}
                            className={`flex-1 py-3 text-sm font-semibold transition ${activeTab === "gifts"
                                    ? "text-cyan-400 border-b-2 border-cyan-400"
                                    : "text-white/50"
                                }`}
                        >
                            🎁 Gifts
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 overflow-y-auto">
                        {/* Chat */}
                        {activeTab === "chat" && (
                            <div className="p-3 space-y-2">
                                {chat.length === 0 ? (
                                    <p className="text-white/40 text-center py-8">
                                        No messages yet
                                    </p>
                                ) : (
                                    chat.map((msg, i) => (
                                        <div
                                            key={i}
                                            className="flex items-start gap-2 p-2 rounded-lg hover:bg-white/5"
                                        >
                                            <img
                                                src={
                                                    msg.avatar ||
                                                    "/defaults/default-avatar.png"
                                                }
                                                className="w-8 h-8 rounded-full"
                                                alt=""
                                                onError={(e) => {
                                                    e.currentTarget.src =
                                                        "/defaults/default-avatar.png";
                                                }}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <span className="text-cyan-400 text-sm font-semibold">
                                                    {msg.username}
                                                </span>
                                                <p className="text-white/90 text-sm break-words">
                                                    {msg.text}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                                <div ref={chatEndRef} />
                            </div>
                        )}

                        {/* Requests (host) */}
                        {activeTab === "requests" && isHost && (
                            <div className="p-3 space-y-2">
                                {seatRequests.length === 0 ? (
                                    <p className="text-white/40 text-center py-8">
                                        No pending requests
                                    </p>
                                ) : (
                                    seatRequests.map((req, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center gap-3 bg-white/5 rounded-xl p-3"
                                        >
                                            <img
                                                src={
                                                    req.user?.avatar ||
                                                    "/defaults/default-avatar.png"
                                                }
                                                className="w-12 h-12 rounded-full"
                                                alt=""
                                                onError={(e) => {
                                                    e.currentTarget.src =
                                                        "/defaults/default-avatar.png";
                                                }}
                                            />
                                            <div className="flex-1">
                                                <p className="font-semibold">
                                                    {req.user?.username}
                                                </p>
                                                <p className="text-xs text-white/50">
                                                    Seat {req.seatId + 1}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => approveSeatRequest(req)}
                                                className="px-4 py-2 bg-green-500 rounded-lg text-sm font-semibold"
                                            >
                                                ✓
                                            </button>
                                            <button
                                                onClick={() => rejectSeatRequest(req)}
                                                className="px-4 py-2 bg-red-500/50 rounded-lg text-sm"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* Gifts */}
                        {activeTab === "gifts" && (
                            <div>
                                {!isHost && hostInfo && (
                                    <LiveGiftPanel
                                        streamId={streamId || roomId}
                                        hostId={hostInfo._id || hostInfo.id}
                                        hostUsername={hostInfo.username}
                                    />
                                )}
                                <div className="p-3 border-t border-white/10">
                                    <h4 className="text-xs text-white/50 mb-3">
                                        Recent Gifts 🎁
                                    </h4>
                                    {gifts.length === 0 ? (
                                        <p className="text-white/40 text-center py-4 text-sm">
                                            No gifts yet
                                        </p>
                                    ) : (
                                        gifts
                                            .slice(-10)
                                            .reverse()
                                            .map((gift, i) => (
                                                <div
                                                    key={i}
                                                    className="flex items-center gap-2 text-sm bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg p-3 mb-2"
                                                >
                                                    <span className="text-2xl">
                                                        {gift.icon}
                                                    </span>
                                                    <div className="flex-1">
                                                        <span className="text-yellow-400 font-semibold">
                                                            {gift.from}
                                                        </span>
                                                        <span className="text-white/50">
                                                            {" "}
                                                            sent{" "}
                                                        </span>
                                                        <span className="text-white font-semibold">
                                                            {gift.name}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Chat Input */}
                    {activeTab === "chat" && (
                        <form
                            onSubmit={sendMessage}
                            className="p-3 border-t border-white/10"
                        >
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    placeholder={
                                        currentUser
                                            ? "Say something..."
                                            : "Log in to chat"
                                    }
                                    maxLength={200}
                                    className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-full text-sm placeholder-white/40 outline-none focus:border-cyan-400"
                                />
                                <button
                                    type="submit"
                                    disabled={!chatInput.trim()}
                                    className="px-5 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-full font-semibold text-sm disabled:opacity-50"
                                >
                                    Send
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes bounce-in {
                    0% { transform: scale(0) translateY(-100px); opacity: 0; }
                    50% { transform: scale(1.1) translateY(0); }
                    100% { transform: scale(1) translateY(0); opacity: 1; }
                }
                .animate-bounce-in { animation: bounce-in 0.5s ease-out; }
            `}</style>
        </div>
    );
}
