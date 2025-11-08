// src/components/UploadPage.jsx
import React, { useState } from "react";
import { ArrowLeft, Upload, Image, Video, Music2 } from "lucide-react";

export default function UploadPage({ currentUser, setCurrentPage, onUpload, onLogout }) {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [type, setType] = useState("image"); // image | video | audio
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState("");

    const handleFileChange = (e) => {
        const f = e.target.files[0];
        if (!f) return;
        setFile(f);
        setPreview(URL.createObjectURL(f));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!file) {
            setError("Please select a file to upload.");
            return;
        }

        setUploading(true);
        setError("");

        try {
            // Maak een FormData object aan
            const formData = new FormData();
            formData.append("file", file);
            formData.append("title", title || "Untitled");
            formData.append("description", description || "");
            formData.append("type", type);

            // Roep uploadfunctie uit App.jsx aan
            await onUpload(formData);

            // Reset state
            setFile(null);
            setPreview(null);
            setTitle("");
            setDescription("");
            alert("✅ Upload successful!");
            setCurrentPage("home");
        } catch (err) {
            console.error("Upload error:", err);
            setError("Upload failed. Please try again.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black text-white p-8">
            <div className="max-w-3xl mx-auto bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <button
                        onClick={() => setCurrentPage("home")}
                        className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-lg hover:bg-white/20 transition"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                    <button
                        onClick={onLogout}
                        className="px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-lg hover:bg-red-500/30 transition"
                    >
                        Logout
                    </button>
                </div>

                {/* Form */}
                <h1 className="text-2xl font-bold mb-4 text-center">🚀 Upload Content</h1>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* File type */}
                    <div>
                        <label className="block text-sm mb-2 text-gray-300">Select Type</label>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition ${type === "image"
                                        ? "bg-blue-500/20 border-blue-400 text-blue-300"
                                        : "bg-white/5 border-white/20 text-white/60"
                                    }`}
                                onClick={() => setType("image")}
                            >
                                <Image className="w-4 h-4" /> Image
                            </button>
                            <button
                                type="button"
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition ${type === "video"
                                        ? "bg-green-500/20 border-green-400 text-green-300"
                                        : "bg-white/5 border-white/20 text-white/60"
                                    }`}
                                onClick={() => setType("video")}
                            >
                                <Video className="w-4 h-4" /> Video
                            </button>
                            <button
                                type="button"
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition ${type === "audio"
                                        ? "bg-yellow-500/20 border-yellow-400 text-yellow-300"
                                        : "bg-white/5 border-white/20 text-white/60"
                                    }`}
                                onClick={() => setType("audio")}
                            >
                                <Music2 className="w-4 h-4" /> Audio
                            </button>
                        </div>
                    </div>

                    {/* File */}
                    <div>
                        <label className="block text-sm mb-2 text-gray-300">Choose File</label>
                        <input
                            type="file"
                            accept={type === "image" ? "image/*" : type === "video" ? "video/*" : "audio/*"}
                            onChange={handleFileChange}
                            className="block w-full text-sm text-gray-300 border border-white/20 rounded-lg p-2 bg-white/5"
                        />
                        {preview && (
                            <div className="mt-4">
                                {type === "image" && (
                                    <img src={preview} alt="preview" className="rounded-lg max-h-64 object-cover" />
                                )}
                                {type === "video" && (
                                    <video
                                        src={preview}
                                        controls
                                        className="rounded-lg max-h-64 object-cover"
                                    />
                                )}
                                {type === "audio" && <audio src={preview} controls className="w-full" />}
                            </div>
                        )}
                    </div>

                    {/* Title */}
                    <div>
                        <label className="block text-sm mb-2 text-gray-300">Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter a title..."
                            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm mb-2 text-gray-300">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe your content..."
                            rows="4"
                            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none"
                        />
                    </div>

                    {error && <div className="text-red-400 text-sm">{error}</div>}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={uploading}
                        className={`w-full py-3 font-bold rounded-xl transition flex items-center justify-center gap-2 ${uploading
                                ? "bg-gray-600 cursor-not-allowed"
                                : "bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90"
                            }`}
                    >
                        {uploading ? (
                            <>
                                <Upload className="w-5 h-5 animate-spin" /> Uploading...
                            </>
                        ) : (
                            <>
                                <Upload className="w-5 h-5" /> Publish to World-Studio 🌍
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
