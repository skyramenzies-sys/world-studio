// Basis STUN. Voor productie wil je een TURN server toevoegen.
// (Bijv. Twilio/Nginx-TURN of een commercieel pakket.)
export const RTC_CONFIG = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
    ],
};
