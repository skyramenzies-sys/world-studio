// src/api/socket.js
import { io } from "socket.io-client";

const SOCKET_BASE =
    import.meta.env.VITE_SOCKET_URL ||
    "https://world-studio-production.up.railway.app";

const socket = io(SOCKET_BASE, {
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    autoConnect: true,
});

export default socket;
