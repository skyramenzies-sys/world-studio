// GoLiveForm.jsx
import React, { useState } from "react";
import axios from "axios";

const CATEGORIES = [
    "Music", "Gaming", "Talk", "Art", "Education", "Sports"
];

export default function GoLiveForm({ token, onLiveStarted }) {
    const [title, setTitle] = useState("");
    const [category, setCategory] = useState(CATEGORIES[0]);
    const [coverImage, setCoverImage] = useState("");
    const [loading, setLoading] = useState(false);
    const [info, setInfo] = useState("");

    // Optional: handle image upload to Cloudinary or similar
    async function handleCoverUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        // Replace this with your upload logic
        const formData = new FormData();
        formData.append("file", file);
        setInfo("Uploading cover...");
        try {
            const res = await axios.post("/api/upload", formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "multipart/form-data"
                }
            });
            setCoverImage(res.data.url);
            setInfo("Cover uploaded!");
        } catch (err) {
            setInfo("Upload failed.");
        }
    }

    async function handleGoLive(e) {
        e.preventDefault();
        if (!title) return setInfo("Please enter a title.");
        setLoading(true);
        setInfo("");
        try {
            const res = await axios.post(
                "/api/live/start",
                { title, category, coverImage },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setLoading(false);
            setTitle("");
            setCoverImage("");
            setInfo("You're live!");
            if (onLiveStarted) onLiveStarted(res.data);
        } catch (err) {
            setLoading(false);
            setInfo(
                err.response?.data?.error ||
                "Failed to go live. Please try again."
            );
        }
    }

    return (
        <form className="max-w-lg mx-auto bg-white/10 rounded-xl p-6 border border-white/20 text-white" onSubmit={handleGoLive}>
            <h2 className="text-2xl font-bold mb-4">🎥 Start a Live Stream</h2>
            <div className="mb-4">
                <label className="block mb-1">Title</label>
                <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 outline-none"
                    required
                />
            </div>
            <div className="mb-4">
                <label className="block mb-1">Category</label>
                <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 outline-none"
                >
                    {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>
            </div>
            <div className="mb-4">
                <label className="block mb-1">Cover Image</label>
                <input type="file" accept="image/*" onChange={handleCoverUpload} />
                {coverImage && (
                    <img src={coverImage} alt="cover" className="mt-2 w-40 rounded-lg border border-white/30" />
                )}
            </div>
            <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-semibold hover:shadow-lg hover:shadow-cyan-500/30 transition-all"
            >
                {loading ? "Starting..." : "Go Live"}
            </button>
            {info && <div className="mt-3 text-yellow-200">{info}</div>}
        </form>
    );
}
