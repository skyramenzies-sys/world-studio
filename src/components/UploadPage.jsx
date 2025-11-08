import React, { useState } from "react";
import axios from "axios";

export default function UploadPage({ currentUser }) {
    const [title, setTitle] = useState("");
    const [type, setType] = useState("image");
    const [file, setFile] = useState(null);

    const handleUpload = async () => {
        const form = new FormData();
        form.append("file", file);
        form.append("title", title);
        form.append("type", type);
        try {
            await axios.post(
                "https://world-studio-production.up.railway.app/api/upload",
                form,
                {
                    headers: {
                        Authorization: `Bearer ${currentUser.token}`,
                    },
                }
            );
            alert("✅ Uploaded successfully");
        } catch (err) {
            alert("❌ Upload failed");
            console.error(err);
        }
    };

    return (
        <div className="p-8 text-white min-h-screen bg-gradient-to-br from-blue-900 to-black">
            <h1 className="text-3xl font-bold mb-6">Upload New Post 🎨</h1>
            <div className="space-y-4 max-w-md">
                <input
                    placeholder="Title"
                    className="w-full bg-white/10 p-2 rounded"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />
                <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full bg-white/10 p-2 rounded"
                >
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                    <option value="audio">Audio</option>
                </select>
                <input
                    type="file"
                    onChange={(e) => setFile(e.target.files[0])}
                    className="w-full bg-white/10 p-2 rounded"
                />
                <button
                    onClick={handleUpload}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 py-2 rounded font-semibold"
                >
                    Upload
                </button>
            </div>
        </div>
    );
}
