import React, { useEffect, useState } from "react";
import API from "../api/api";

export default function ProfilePage() {
    const [user, setUser] = useState(null);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const token = localStorage.getItem("token");
                if (!token) {
                    window.location.href = "/login";
                    return;
                }

                const res = await API.get("/users/me", {
                    headers: { Authorization: `Bearer ${token}` },
                });

                setUser(res.data.user);
                setPosts(res.data.posts || []);
            } catch (err) {
                console.error("❌ Failed to load profile:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen text-white text-xl">
                Loading profile...
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex items-center justify-center h-screen text-white text-xl">
                User not found. Please login again.
            </div>
        );
    }

    return (
        <div className="text-white p-6 max-w-4xl mx-auto">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 shadow-lg">
                <div className="flex items-center gap-4">
                    <img
                        src={user.avatar || "/default-avatar.png"}
                        alt="Avatar"
                        className="w-16 h-16 rounded-full border border-white/30 object-cover"
                    />
                    <div>
                        <h1 className="text-2xl font-bold">{user.username}</h1>
                        <p className="text-gray-300">{user.email}</p>
                        <p className="text-gray-400 mt-1">{user.bio || "No bio yet."}</p>
                    </div>
                </div>
            </div>

            <div className="mt-8">
                <h2 className="text-xl font-semibold mb-4">📸 Your Posts</h2>
                {posts.length === 0 ? (
                    <div className="text-gray-400">You haven’t uploaded anything yet.</div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                        {posts.map((p) => (
                            <div
                                key={p._id}
                                className="bg-white/10 rounded-xl border border-white/20 overflow-hidden shadow-md hover:shadow-cyan-400/20 transition"
                            >
                                {p.type === "image" && (
                                    <img src={p.fileUrl} alt={p.title} className="w-full h-48 object-cover" />
                                )}
                                {p.type === "video" && (
                                    <video src={p.fileUrl} controls className="w-full h-48 object-cover" />
                                )}
                                <div className="p-4">
                                    <h3 className="font-semibold">{p.title}</h3>
                                    <p className="text-gray-400 text-sm">{p.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
