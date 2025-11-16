// src/api/WebrtcConfig.js

export const RTC_CONFIG = {
    iceServers: [
        // ⭐ Google's global STUN server
        { urls: "stun:stun.l.google.com:19302" },

        // ⭐ Backups (stabiliteit)
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },

        // ⭐ Public TURN (free-tier by OpenRelay)
        // Functional, but limited throughput
        {
            urls: "turn:openrelay.metered.ca:80",
            username: "openrelayproject",
            credential: "openrelayproject"
        },
        {
            urls: "turn:openrelay.metered.ca:443",
            username: "openrelayproject",
            credential: "openrelayproject"
        },
        {
            urls: "turn:openrelay.metered.ca:443?transport=tcp",
            username: "openrelayproject",
            credential: "openrelayproject"
        },
    ],

    // Optional: improves stability
    iceCandidatePoolSize: 4,
    bundlePolicy: "balanced",
    rtcpMuxPolicy: "require",
};
