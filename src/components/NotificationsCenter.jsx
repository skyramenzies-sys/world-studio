import React, { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import socket from "../api/socket";

export default function NotificationCenter() {
    const [open, setOpen] = useState(false);
    const [list, setList] = useState([]);

    useEffect(() => {
        socket.on("notification", (n) => {
            setList((prev) => [n, ...prev.slice(0, 19)]);
        });
        return () => socket.off("notification");
    }, []);

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="relative w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
            >
                <Bell className="w-5 h-5 text-white" />
                {list.length > 0 && (
                    <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
                )}
            </button>

            {open && (
                <div className="absolute right-0 mt-3 w-80 bg-black/70 backdrop-blur-lg border border-white/10 rounded-xl p-3 text-white z-50">
                    <h3 className="font-semibold mb-2">Notifications</h3>
                    {list.length === 0 ? (
                        <p className="text-white/50 text-sm">No new notifications</p>
                    ) : (
                        <ul className="max-h-80 overflow-y-auto space-y-2">
                            {list.map((n, i) => (
                                <li
                                    key={i}
                                    className="p-2 bg-white/10 rounded-lg text-sm border border-white/5"
                                >
                                    {n.message}
                                    <div className="text-white/40 text-xs">
                                        {new Date(n.timestamp).toLocaleString()}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}
