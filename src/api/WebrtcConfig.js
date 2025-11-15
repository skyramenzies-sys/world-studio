// src/api/webrtc.js or similar

// Basic STUN config for WebRTC. 
// For production, add at least one TURN server for reliable connectivity.
// Example TURN (replace with your own credentials/server in production):
// { 
//     urls: "turn:your-turn-server.com:3478",
//     username: "your-username",
//     credential: "your-password"
// }

export const RTC_CONFIG = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        // Uncomment and configure for production:
        // {
        //     urls: "turn:your-turn-server.com:3478",
        //     username: "user",
        //     credential: "pass"
        // }
    ],
};
