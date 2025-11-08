import { io } from "socket.io-client";

const SOCKET_URL =
    import.meta.env.VITE_API_BASE_URL ||
    "https://world-studio-production.up.railway.app";

const socket = io(SOCKET_URL, {
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 3000,
});

export default socket;
