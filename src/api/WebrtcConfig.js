// src/api/WebrtcConfig.js
// World-Studio.live - WebRTC Configuration for Live Streaming

/**
 * WebRTC Configuration for World-Studio Live Streaming
 * 
 * STUN servers: Help peers discover their public IP addresses
 * TURN servers: Relay traffic when direct connection fails (firewall/NAT issues)
 * 
 * @see https://world-studio-production.up.railway.app/docs/webrtc
 */

// ===========================================
// API CONFIGURATION
// ===========================================
export const API_BASE_URL = "https://world-studio-production.up.railway.app";
export const SOCKET_URL = "https://world-studio-production.up.railway.app";

// ===========================================
// PRIMARY RTC CONFIGURATION
// ===========================================
export const RTC_CONFIG = {
    iceServers: [
        // ========================================
        // STUN Servers (free, unlimited)
        // ========================================

        // Google's global STUN servers (most reliable)
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

        // OpenRelay (free tier - limited bandwidth)
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

    // ICE candidate pool size (pre-gather candidates for faster connection)
    iceCandidatePoolSize: 10,

    // Bundle policy: How to bundle media streams
    // "balanced" - Bundle audio/video separately if needed
    // "max-bundle" - Bundle everything together (recommended for most cases)
    bundlePolicy: "max-bundle",

    // RTCP Mux policy: Multiplex RTP and RTCP on same port
    rtcpMuxPolicy: "require",

    // ICE transport policy
    // "all" - Use both STUN and TURN
    // "relay" - Force TURN only (useful for testing)
    iceTransportPolicy: "all",
};

// ===========================================
// MINIMAL CONFIG (STUN only - for testing)
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
// TURN-ONLY CONFIG (for strict firewalls)
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
    iceTransportPolicy: "relay", // Force TURN
};

// ===========================================
// MEDIA CONSTRAINTS
// ===========================================

/**
 * Default media constraints for getUserMedia
 */
export const MEDIA_CONSTRAINTS = {
    // Video constraints
    video: {
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
        frameRate: { ideal: 30, max: 60 },
        facingMode: "user", // Front camera on mobile
    },

    // Audio constraints
    audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000,
    },
};

// Video-only constraints
export const VIDEO_ONLY_CONSTRAINTS = {
    video: MEDIA_CONSTRAINTS.video,
    audio: false,
};

// Audio-only constraints (for audio live streams)
export const AUDIO_ONLY_CONSTRAINTS = {
    video: false,
    audio: MEDIA_CONSTRAINTS.audio,
};

// Screen share constraints
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

// HD Video constraints
export const HD_VIDEO_CONSTRAINTS = {
    video: {
        width: { ideal: 1920, max: 1920 },
        height: { ideal: 1080, max: 1080 },
        frameRate: { ideal: 30, max: 60 },
        facingMode: "user",
    },
    audio: MEDIA_CONSTRAINTS.audio,
};

// Mobile-optimized constraints
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
 * @param {number} videoBitrate - Video bitrate in kbps
 * @param {number} audioBitrate - Audio bitrate in kbps
 * @returns {string} Modified SDP
 */
export const modifySdpForBitrate = (sdp, videoBitrate = 2500, audioBitrate = 128) => {
    let modifiedSdp = sdp;

    // Video bitrate (in kbps)
    modifiedSdp = modifiedSdp.replace(
        /m=video (.*)\r\n/,
        `m=video $1\r\nb=AS:${videoBitrate}\r\n`
    );

    // Audio bitrate (in kbps)
    modifiedSdp = modifiedSdp.replace(
        /m=audio (.*)\r\n/,
        `m=audio $1\r\nb=AS:${audioBitrate}\r\n`
    );

    return modifiedSdp;
};

/**
 * Check if WebRTC is supported
 * @returns {boolean}
 */
export const isWebRTCSupported = () => {
    return !!(
        navigator.mediaDevices &&
        navigator.mediaDevices.getUserMedia &&
        window.RTCPeerConnection
    );
};

/**
 * Check if screen sharing is supported
 * @returns {boolean}
 */
export const isScreenShareSupported = () => {
    return !!(
        navigator.mediaDevices &&
        navigator.mediaDevices.getDisplayMedia
    );
};

/**
 * Get available media devices
 * @returns {Promise<{audioInputs: MediaDeviceInfo[], audioOutputs: MediaDeviceInfo[], videoInputs: MediaDeviceInfo[]}>}
 */
export const getMediaDevices = async () => {
    try {
        // Request permission first to get device labels
        await navigator.mediaDevices.getUserMedia({ audio: true, video: true }).catch(() => { });

        const devices = await navigator.mediaDevices.enumerateDevices();
        return {
            audioInputs: devices.filter(d => d.kind === "audioinput"),
            audioOutputs: devices.filter(d => d.kind === "audiooutput"),
            videoInputs: devices.filter(d => d.kind === "videoinput"),
        };
    } catch (err) {
        console.error("Error getting media devices:", err);
        return {
            audioInputs: [],
            audioOutputs: [],
            videoInputs: [],
        };
    }
};

/**
 * Test ICE connectivity
 * @param {RTCConfiguration} config - RTC configuration to test
 * @returns {Promise<{stun: boolean, turn: boolean, candidates: string[]}>}
 */
export const testIceConnectivity = async (config = RTC_CONFIG) => {
    return new Promise((resolve) => {
        const pc = new RTCPeerConnection(config);
        const results = {
            stun: false,
            turn: false,
            candidates: [],
            timeElapsed: 0,
        };

        const startTime = Date.now();

        pc.onicecandidate = (event) => {
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
                results.timeElapsed = Date.now() - startTime;
                pc.close();
                resolve(results);
            }
        };

        // Create dummy data channel to trigger ICE gathering
        pc.createDataChannel("test");
        pc.createOffer()
            .then(offer => pc.setLocalDescription(offer))
            .catch(err => {
                console.error("ICE test error:", err);
                resolve(results);
            });

        // Timeout after 10 seconds
        setTimeout(() => {
            results.timeElapsed = Date.now() - startTime;
            pc.close();
            resolve(results);
        }, 10000);
    });
};

/**
 * Get optimal RTC config based on network conditions
 * @returns {Promise<RTCConfiguration>}
 */
export const getOptimalRtcConfig = async () => {
    try {
        // Test with full config first
        const results = await testIceConnectivity(RTC_CONFIG);

        console.log("🌐 ICE connectivity test results:", results);

        // If TURN works, use full config
        if (results.turn) {
            console.log("✅ Using full RTC config with TURN");
            return RTC_CONFIG;
        }

        // If only STUN works, use STUN-only config
        if (results.stun) {
            console.log("⚠️ TURN unavailable, using STUN-only config");
            return RTC_CONFIG_STUN_ONLY;
        }

        // If nothing works, force TURN-only
        console.log("❌ Direct connection failed, forcing TURN relay");
        return RTC_CONFIG_TURN_ONLY;
    } catch (err) {
        console.error("Error testing ICE connectivity:", err);
        return RTC_CONFIG; // Fallback to default
    }
};

/**
 * Get constraints based on device type
 * @returns {MediaStreamConstraints}
 */
export const getDeviceOptimizedConstraints = () => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
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
 * @returns {RTCPeerConnection}
 */
export const createPeerConnection = async () => {
    const config = await getOptimalRtcConfig();
    const pc = new RTCPeerConnection(config);

    // Add connection state logging
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
// DEFAULT EXPORT
// ===========================================
export default RTC_CONFIG;