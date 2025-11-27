// src/api/WebrtcConfig.js

/**
 * WebRTC Configuration for World-Studio Live Streaming
 * 
 * STUN servers: Help peers discover their public IP addresses
 * TURN servers: Relay traffic when direct connection fails (firewall/NAT issues)
 */

// Primary RTC Configuration
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

// Minimal config (STUN only - for testing)
export const RTC_CONFIG_STUN_ONLY = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
    ],
    iceCandidatePoolSize: 4,
    bundlePolicy: "balanced",
    rtcpMuxPolicy: "require",
};

// TURN-only config (for strict firewalls)
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

/**
 * Media constraints for getUserMedia
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

// Audio-only constraints
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

/**
 * SDP modifications for better quality
 */
export const modifySdpForBitrate = (sdp, videoBitrate = 2500, audioBitrate = 128) => {
    // Add bandwidth restrictions to SDP
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
 */
export const isScreenShareSupported = () => {
    return !!(
        navigator.mediaDevices &&
        navigator.mediaDevices.getDisplayMedia
    );
};

/**
 * Get available media devices
 */
export const getMediaDevices = async () => {
    try {
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
 */
export const testIceConnectivity = async (config = RTC_CONFIG) => {
    return new Promise((resolve) => {
        const pc = new RTCPeerConnection(config);
        const results = {
            stun: false,
            turn: false,
            candidates: [],
        };

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
            pc.close();
            resolve(results);
        }, 10000);
    });
};

// Default export
export default RTC_CONFIG;