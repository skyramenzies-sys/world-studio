import React, { useEffect, useState, useRef } from "react";
import socket from "../api/socket";

export default function LiveStreamPage({ stream }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const chatEndRef = useRef(null);

    useEffect(() => {
        socket.emit("join_stream", stream._id);

        socket.on("chat_message", msg => {
            setMessages((msgs) => [...msgs, msg]);
        });

        return () => {
            socket.off("chat_message");
            socket.emit("leave_stream", stream._id);
        };
    }, [stream._id]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    function sendMessage(e) {
        e.preventDefault();
        if (input.trim()) {
            socket.emit("chat_message", {
                streamId: stream._id,
                user: "You", // Replace with current user’s name
                text: input
            });
            setInput("");
        }
    }

    return (
        <div>
            <h2>{stream.title}</h2>
            {/* Video player goes here */}
            <div className="chat-panel bg-white/10 p-3 rounded-lg" style={{ maxHeight: 250, overflowY: "auto" }}>
                {messages.map((msg, idx) => (
                    <div key={idx}><b>{msg.user}:</b> {msg.text} <span className="text-xs text-white/60">{new Date(msg.timestamp).toLocaleTimeString()}</span></div>
                ))}
                <div ref={chatEndRef} />
            </div>
            <form onSubmit={sendMessage} className="flex mt-2">
                <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-l-lg bg-white/20 border-none outline-none"
                    placeholder="Say something..."
                />
                <button type="submit" className="px-4 py-2 bg-cyan-500 text-black rounded-r-lg">Send</button>
            </form>
        </div>
    );
}