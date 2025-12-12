// src/api/WebrtcConfig.js
// World-Studio.live - WebRTC Configuration for Live Streaming - UNIVERSUM EDITION 🌌

/**
 * WebRTC Configuration for World-Studio Live Streaming
 *
 * STUN servers: Help peers discover their public IP addresses
 * TURN servers: Relay traffic when direct connection fails (firewall/NAT issues)
 * Media constraints: Define video/audio quality settings
 */

// ===========================================
// API / SOCKET CONFIGURATION
// ===========================================
import { API_BASE_URL } from "./api";

// Start from API_BASE_URL, fallback to env / window
let baseUrl =
    API_BASE_URL ||
    (typeof import.meta !== "undefined" &&
        import.meta.env &&
        import.meta.env.VITE_API_URL) ||
    (typeof window !== "undefined" ? window.location.origin : "https://world-studio-production.up.railway.app");

// Strip trailing /api and slashes -> root domain
baseUrl = baseUrl.replace(/\/api\/?$/, "").replace(/\/+$/, "");

export const API_BASE_URL_RTC = baseUrl;
export const API_BASE_URL_WEBSOCKET = baseUrl;
export const SOCKET_URL = baseUrl;

// ===========================================
// PRIMARY RTC CONFIGURATION
// ===========================================
export const RTC_CONFIG = {
    iceServers: [
        // ========================================
        // STUN Servers (free, unlimited)
        // ========================================


        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun3.l.google.com:19302" },
        { urls: "stun:stun4.l.google.com:19302" },

        // Twilio STUN (backup)
        { urls: "stun:global.stun.twilio.com:3478" },

        // ========================================
        // TURN Servers (for NAT traversal)
        // ========================================

        // OpenRelay (free tier)
        {
            urls: "turn:openrelay.metered.ca:80",
            username: "openrelayproject",
            credential: "openrelayproject",
        },
        {
            urls: "turn:openrelay.metered.ca:443",
            username: "openrelayproject",
            credential: "openrelayproject",
        },
        {
            urls: "turn:openrelay.metered.ca:443?transport=tcp",
            username: "openrelayproject",
            credential: "openrelayproject",
        },

        // Metered TURN (free tier)
        {
            urls: "turn:a.relay.metered.ca:80",
            username: "e8dd65c92f6898a5f6bc1bea",
            credential: "w3$e@P2kXn+GfL9r",
        },
        {
            urls: "turn:a.relay.metered.ca:443",
            username: "e8dd65c92f6898a5f6bc1bea",
            credential: "w3$e@P2kXn+GfL9r",
        },
        {
            urls: "turn:a.relay.metered.ca:443?transport=tcp",
            username: "e8dd65c92f6898a5f6bc1bea",
            credential: "w3$e@P2kXn+GfL9r",
        },
    ],


    iceCandidatePoolSize: 10,


    bundlePolicy: "max-bundle",


    rtcpMuxPolicy: "require",


    iceTransportPolicy: "all",
};

// ===========================================
// MINIMAL CONFIG (STUN only)
// ===========================================
export const RTC_CONFIG_STUN_ONLY = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
    ],
    iceCandidatePoolSize: 4,
    bundlePolicy: "balanced",
    rtcpMuxPolicy: "require",
};

// ===========================================
// TURN-ONLY CONFIG (strict firewalls)
// ===========================================
export const RTC_CONFIG_TURN_ONLY = {
    iceServers: [
        {
            urls: "turn:openrelay.metered.ca:443?transport=tcp",
            username: "openrelayproject",
            credential: "openrelayproject",
        },
        {
            urls: "turn:a.relay.metered.ca:443?transport=tcp",
            username: "e8dd65c92f6898a5f6bc1bea",
            credential: "w3$e@P2kXn+GfL9r",
        },
    ],
    iceCandidatePoolSize: 4,
    bundlePolicy: "max-bundle",
    rtcpMuxPolicy: "require",
    iceTransportPolicy: "relay",
};

// ===========================================
// MEDIA CONSTRAINTS
// ===========================================


export const MEDIA_CONSTRAINTS = {

    video: {
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
        frameRate: { ideal: 30, max: 60 },
        facingMode: "user",
    },


    audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000,
    },
};


export const VIDEO_ONLY_CONSTRAINTS = {
    video: MEDIA_CONSTRAINTS.video,
    audio: false,
};


export const AUDIO_ONLY_CONSTRAINTS = {
    video: false,
    audio: MEDIA_CONSTRAINTS.audio,
};


export const SCREEN_SHARE_CONSTRAINTS = {
    video: {
        cursor: "always",
        displaySurface: "monitor",
    },
    audio: {
        echoCancellation: true,
        noiseSuppression: true,
    },
};


export const HD_VIDEO_CONSTRAINTS = {
    video: {
        width: { ideal: 1920, max: 1920 },
        height: { ideal: 1080, max: 1080 },
        frameRate: { ideal: 30, max: 60 },
        facingMode: "user",
    },
    audio: MEDIA_CONSTRAINTS.audio,
};


export const MOBILE_CONSTRAINTS = {
    video: {
        width: { ideal: 640, max: 1280 },
        height: { ideal: 480, max: 720 },
        frameRate: { ideal: 24, max: 30 },
        facingMode: "user",
    },
    audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
    },
};

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

/**
 * SDP modifications for better quality
 * @param {string} sdp - Original SDP
 * @param {number} videoBitrate - Desired video bitrate in kbps
 */
export const modifySdpForBitrate = (sdp, videoBitrate = 2500, audioBitrate = 128) => {
    if (!sdp) return sdp;

    let modifiedSdp = sdp;

    // Video bitrate
    modifiedSdp = modifiedSdp.replace(
        /m=video (.*)\r\n/,
        `m=video $1\r\nb=AS:${videoBitrate}\r\n`
    );

    // Audio bitrate
    modifiedSdp = modifiedSdp.replace(
        /m=audio (.*)\r\n/,
        `m=audio $1\r\nb=AS:${audioBitrate}\r\n`
    );

    return modifiedSdp;
};

/**
 * Check if WebRTC is supported
 * @return {boolean}
 */
export const isWebRTCSupported = () => {
    if (typeof window === "undefined" || typeof navigator === "undefined") return false;

    const RTCPeer =
        window.RTCPeerConnection ||
        window.webkitRTCPeerConnection ||
        window.mozRTCPeerConnection;

    return !!(
        navigator.mediaDevices &&
        navigator.mediaDevices.getUserMedia &&
        RTCPeer
    );
};

/**
 * Check if screen sharing is supported
 * @return {boolean}
 */
export const isScreenShareSupported = () => {
    if (typeof navigator === "undefined") return false;
    return !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
};

/**
 * Get available media devices
 * @return {Promise<{audioInputs: MediaDeviceInfo[], audioOutputs: MediaDeviceInfo[], videoInputs: MediaDeviceInfo[]}>}
 */
export const getMediaDevices = async () => {
    const empty = { audioInputs: [], audioOutputs: [], videoInputs: [] };

    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
        return empty;
    }

    try {
        // Request permission first to get device labels
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
            // ✅ FIX: Stop tracks after getting permission
            stream.getTracks().forEach(track => track.stop());
        } catch {
            // Ignore - we'll still attempt enumerateDevices
        }

        const devices = await navigator.mediaDevices.enumerateDevices();
        return {
            audioInputs: devices.filter(d => d.kind === "audioinput"),
            audioOutputs: devices.filter(d => d.kind === "audiooutput"),
            videoInputs: devices.filter(d => d.kind === "videoinput"),
        };
    } catch (err) {
        console.error("Error getting media devices:", err);
        return empty;
    }
};

/**
 * Test ICE connectivity
 * @param {RTCConfiguration} config - RTC configuration to test
 * @return {Promise<{stun: boolean, turn: boolean, candidates: string[], timeElapsed: number}>}
 */
export const testIceConnectivity = async (config = RTC_CONFIG) => {
    const fallback = {
        stun: false,
        turn: false,
        candidates: [],
        timeElapsed: 0,
    };

    if (typeof window === "undefined") return fallback;

    const RTCPeer =
        window.RTCPeerConnection ||
        window.webkitRTCPeerConnection ||
        window.mozRTCPeerConnection;

    if (!RTCPeer) return fallback;

    return new Promise(resolve => {
        let pc;
        try {
            pc = new RTCPeer(config);
        } catch (err) {
            console.error("Failed to create RTCPeerConnection:", err);
            return resolve(fallback);
        }

        const results = { ...fallback };
        const startTime = Date.now();
        let resolved = false;

        const finish = () => {
            if (resolved) return;
            resolved = true;
            results.timeElapsed = Date.now() - startTime;
            try {
                pc.close();
            } catch {
                // ignore
            }
            resolve(results);
        };

        pc.onicecandidate = event => {
            if (event.candidate) {
                results.candidates.push(event.candidate.candidate);


                if (event.candidate.type === "srflx") {
                    results.stun = true;
                }
                if (event.candidate.type === "relay") {
                    results.turn = true;
                }
            }
        };

        pc.onicegatheringstatechange = () => {
            if (pc.iceGatheringState === "complete") {
                finish();
            }
        };


        try {
            pc.createDataChannel("test");
            pc.createOffer()
                .then(offer => pc.setLocalDescription(offer))
                .catch(err => {
                    console.error("ICE test error:", err);
                    finish();
                });
        } catch (err) {
            console.error("ICE test error:", err);
            finish();
        }

        // Timeout after 10 seconds
        setTimeout(finish, 10000);
    });
};

/**
 * Get optimal RTC config based on network conditions
 * @return {Promise<RTCConfiguration>}
 */
export const getOptimalRtcConfig = async () => {
    try {

        if (!isWebRTCSupported()) {
            console.warn("WebRTC not fully supported, using default RTC config");
            return RTC_CONFIG;
        }


        const results = await testIceConnectivity(RTC_CONFIG);

        console.log("🌐 ICE connectivity test results:", results);


        if (results.turn) {
            console.log("✅ Using full RTC config with TURN");
            return RTC_CONFIG;
        }


        if (results.stun) {
            console.log("⚠️ TURN unavailable, using STUN-only config");
            return RTC_CONFIG_STUN_ONLY;
        }


        console.log("❌ Direct connection failed, forcing TURN relay");
        return RTC_CONFIG_TURN_ONLY;
    } catch (err) {
        console.error("Error testing ICE connectivity:", err);
        return RTC_CONFIG;
    }
};

/**
 * Get constraints based on device type
 * @return {MediaStreamConstraints}
 */
export const getDeviceOptimizedConstraints = () => {
    if (typeof navigator === "undefined") {

        return HD_VIDEO_CONSTRAINTS;
    }

    const ua = navigator.userAgent || "";
    const isMobile = /iPhone|iPad|iPod|Android/i.test(ua);
    const isLowPower = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;

    if (isMobile || isLowPower) {
        console.log("📱 Using mobile-optimized constraints");
        return MOBILE_CONSTRAINTS;
    }

    console.log("💻 Using desktop HD constraints");
    return HD_VIDEO_CONSTRAINTS;
};

/**
 * Create a new peer connection with optimal settings
 * @return {Promise<RTCPeerConnection|null>}
 */
export const createPeerConnection = async () => {
    if (typeof window === "undefined") {
        console.error("RTCPeerConnection not available (non-browser environment)");
        return null;
    }

    const RTCPeer =
        window.RTCPeerConnection ||
        window.webkitRTCPeerConnection ||
        window.mozRTCPeerConnection;

    if (!RTCPeer) {
        console.error("WebRTC not supported in this browser");
        return null;
    }

    const config = await getOptimalRtcConfig();
    const pc = new RTCPeer(config);


    pc.onconnectionstatechange = () => {
        console.log(`🔌 Connection state: ${pc.connectionState}`);
    };

    pc.oniceconnectionstatechange = () => {
        console.log(`🧊 ICE state: ${pc.iceConnectionState}`);
    };

    return pc;
};

// ===========================================
// QUALITY PRESETS
// ===========================================

export const QUALITY_PRESETS = {
    low: {
        video: { width: 640, height: 360, frameRate: 15 },
        videoBitrate: 500,
        audioBitrate: 64,
    },
    medium: {
        video: { width: 854, height: 480, frameRate: 24 },
        videoBitrate: 1000,
        audioBitrate: 96,
    },
    high: {
        video: { width: 1280, height: 720, frameRate: 30 },
        videoBitrate: 2500,
        audioBitrate: 128,
    },
    ultra: {
        video: { width: 1920, height: 1080, frameRate: 30 },
        videoBitrate: 4000,
        audioBitrate: 192,
    },
};

// ===========================================
// ✅ NEW: Connection quality monitor
// ===========================================

/**
 * Monitor connection quality and stats
 * @param {RTCPeerConnection} pc - The peer connection to monitor
 * @param {function} onStats - Callback with stats data
 * @param {number} interval - Polling interval in ms (default 2000)
 * @returns {function} Stop function
 */
export const monitorConnectionQuality = (pc, onStats, interval = 2000) => {
    if (!pc || typeof onStats !== "function") return () => { };

    let previousStats = null;

    const poll = async () => {
        try {
            const stats = await pc.getStats();
            const report = {
                timestamp: Date.now(),
                video: { bytesSent: 0, bytesReceived: 0, packetsLost: 0, jitter: 0, frameRate: 0 },
                audio: { bytesSent: 0, bytesReceived: 0, packetsLost: 0, jitter: 0 },
                connection: { rtt: 0, availableBandwidth: 0 },
            };

            stats.forEach(stat => {
                if (stat.type === "outbound-rtp" && stat.kind === "video") {
                    report.video.bytesSent = stat.bytesSent || 0;
                    report.video.frameRate = stat.framesPerSecond || 0;
                }
                if (stat.type === "outbound-rtp" && stat.kind === "audio") {
                    report.audio.bytesSent = stat.bytesSent || 0;
                }
                if (stat.type === "inbound-rtp" && stat.kind === "video") {
                    report.video.bytesReceived = stat.bytesReceived || 0;
                    report.video.packetsLost = stat.packetsLost || 0;
                    report.video.jitter = stat.jitter || 0;
                }
                if (stat.type === "inbound-rtp" && stat.kind === "audio") {
                    report.audio.bytesReceived = stat.bytesReceived || 0;
                    report.audio.packetsLost = stat.packetsLost || 0;
                    report.audio.jitter = stat.jitter || 0;
                }
                if (stat.type === "candidate-pair" && stat.state === "succeeded") {
                    report.connection.rtt = stat.currentRoundTripTime * 1000 || 0;
                    report.connection.availableBandwidth = stat.availableOutgoingBitrate || 0;
                }
            });

            // Calculate bitrates if we have previous stats
            if (previousStats) {
                const timeDiff = (report.timestamp - previousStats.timestamp) / 1000;
                if (timeDiff > 0) {
                    report.video.bitrate = Math.round(
                        ((report.video.bytesSent - previousStats.video.bytesSent) * 8) / timeDiff / 1000
                    );
                    report.audio.bitrate = Math.round(
                        ((report.audio.bytesSent - previousStats.audio.bytesSent) * 8) / timeDiff / 1000
                    );
                }
            }

            previousStats = report;
            onStats(report);
        } catch (err) {
            console.error("Error getting stats:", err);
        }
    };

    const intervalId = setInterval(poll, interval);
    poll(); // Initial poll

    return () => clearInterval(intervalId);
};

/**
 * Get connection quality label based on stats
 */
export const getQualityLabel = (stats) => {
    if (!stats) return "unknown";

    const { rtt } = stats.connection || {};
    const { packetsLost, jitter } = stats.video || {};

    if (rtt < 100 && packetsLost < 5 && jitter < 0.03) return "excellent";
    if (rtt < 200 && packetsLost < 20 && jitter < 0.05) return "good";
    if (rtt < 400 && packetsLost < 50 && jitter < 0.1) return "fair";
    return "poor";
};

// ===========================================
// DEFAULT EXPORT
// ===========================================
export default RTC_CONFIG;
