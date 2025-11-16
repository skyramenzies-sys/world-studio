import React, { useEffect, useState, useRef } from "react";
import socket from "../api/socket";

export default function LiveStreamPage({ stream, currentUser }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const chatEndRef = useRef(null);

    // Smooth autoscroll
    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // ====== JOIN STREAM ROOM ======
    useEffect(() => {
        if (!stream?._id) return;

        // Join chat room
        socket.emit("join_stream", stream._id);

        // Listen to messages
        const handleMessage = (msg) => {
            setMessages((prev) => [...prev, msg]);
        };

        socket.on("chat_message", handleMessage);

        // Cleanup LISTENER + leave room
        return () => {
            socket.off("chat_message", handleMessage);
            socket.emit("leave_stream", stream._id);
        };
    }, [stream?._id]);

    // Scroll after every new message
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // ===== SEND MESSAGE =====
    function sendMessage(e) {
        e.preventDefault();
        const messageText = input.trim();
        if (!messageText) return;

        socket.emit("chat_message", {
            streamId: stream._id,
            user: currentUser?.username || "Anonymous",
            text: messageText,
            timestamp: Date.now(),
        });

        setInput("");
    }

    return (
        <div className="w-full max-w-3xl mx-auto text-white py-6">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">
                Live Chat — {stream.title}
            </h2>

            {/* CHAT WINDOW */}
            <div
                className="bg-white/10 border border-white/20 p-4 rounded-xl shadow-lg"
                style={{ maxHeight: 320, overflowY: "auto" }}
            >
                {messages.length === 0 && (
                    <div className="text-white/60 text-center py-4">
                        No messages yet — be the first! 🚀
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div key={idx} className="mb-1">
                        <b className="text-cyan-300">{msg.user}</b>:{" "}
                        <span>{msg.text}</span>
                        <span className="text-xs text-white/50 ml-2">
                            {msg.timestamp
                                ? new Date(msg.timestamp).toLocaleTimeString()
                                : ""}
                        </span>
                    </div>
                ))}

                <div ref={chatEndRef}></div>
            </div>

            {/* INPUT BAR */}
            <form
                onSubmit={sendMessage}
                className="flex mt-3 bg-white/10 rounded-lg overflow-hidden"
            >
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="flex-1 px-3 py-2 bg-transparent outline-none text-white"
                    placeholder="Type your message..."
                />

                <button
                    type="submit"
                    className="px-5 bg-cyan-500 text-black font-bold hover:bg-cyan-400 transition"
                >
                    Send
                </button>
            </form>
        </div>
    );
}
