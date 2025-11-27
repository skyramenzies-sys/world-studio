// src/components/UploadPage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, Image, Video, Music2, Check } from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../api/api";

export default function UploadPage() {
    const navigate = useNavigate();

    // Get current user from localStorage
    const [currentUser, setCurrentUser] = useState(null);

    // Form state
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [type, setType] = useState("image");
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState("");
    const [uploadProgress, setUploadProgress] = useState(0);

    // Load user from localStorage
    useEffect(() => {
        const storedUser = localStorage.getItem("ws_currentUser");
        if (storedUser) {
            try {
                setCurrentUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Failed to parse user:", e);
            }
        }
    }, []);

    // Clean preview URL on unmount
    useEffect(() => {
        return () => {
            if (preview) URL.revokeObjectURL(preview);
        };
    }, [preview]);

    // Reset file when type changes
    useEffect(() => {
        setFile(null);
        setPreview(null);
        setError("");
    }, [type]);

    const handleFileChange = (e) => {
        const f = e.target.files[0];
        if (!f) return;

        setError("");

        // Size validation (50MB max)
        const maxSizeMB = 50;
        if (f.size / (1024 * 1024) > maxSizeMB) {
            setError(`File exceeds ${maxSizeMB} MB limit.`);
            return;
        }

        // Type validation
        const validTypes = {
            image: ["image/jpeg", "image/png", "image/webp", "image/jpg", "image/gif"],
            video: ["video/mp4", "video/webm", "video/quicktime"],
            audio: ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/m4a"]
        };

        const isValidType = validTypes[type].some(t =>
            f.type === t || f.type.startsWith(type + "/")
        );

        if (!isValidType) {
            setError(`Invalid file type. Please select a ${type} file.`);
            return;
        }

        setFile(f);

        // Clean previous preview
        if (preview) URL.revokeObjectURL(preview);
        setPreview(URL.createObjectURL(f));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!file) {
            setError("Please choose a file.");
            return;
        }

        if (!currentUser) {
            toast.error("Please log in to upload");
            navigate("/login");
            return;
        }

        setUploading(true);
        setError("");
        setUploadProgress(0);

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("title", title || "Untitled");
            formData.append("description", description || "");
            formData.append("type", type);
            formData.append("mediaType", type);
            formData.append("userId", currentUser._id || currentUser.id);
            formData.append("author", currentUser.username);

            // Upload with progress tracking
            const response = await api.post("/upload", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
                onUploadProgress: (progressEvent) => {
                    const progress = Math.round(
                        (progressEvent.loaded * 100) / progressEvent.total
                    );
                    setUploadProgress(progress);
                },
            });

            console.log("Upload success:", response.data);

            // Reset form
            setFile(null);
            setPreview(null);
            setTitle("");
            setDescription("");
            setUploadProgress(0);

            toast.success("Upload successful! 🎉");

            // Navigate to home after short delay
            setTimeout(() => {
                navigate("/");
            }, 1000);

        } catch (err) {
            console.error("Upload error:", err);
            const errorMsg = err.response?.data?.error ||
                err.response?.data?.message ||
                "Upload failed. Please try again.";
            setError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setUploading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("ws_currentUser");
        toast.success("Logged out");
        navigate("/login");
    };

    // File size display helper
    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black text-white p-4 md:p-8">
            <div className="max-w-3xl mx-auto bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 shadow-xl">

                {/* HEADER */}
                <div className="flex items-center justify-between mb-6">
                    <button
                        onClick={() => navigate("/")}
                        className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-lg hover:bg-white/20 transition"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back
                    </button>

                    <div className="flex items-center gap-3">
                        {currentUser && (
                            <span className="text-white/60 text-sm hidden sm:block">
                                {currentUser.username}
                            </span>
                        )}
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-lg hover:bg-red-500/30 transition text-sm"
                        >
                            Logout
                        </button>
                    </div>
                </div>

                <h1 className="text-2xl font-bold mb-6 text-center">🚀 Upload Content</h1>

                {/* FORM */}
                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* TYPE SELECTOR */}
                    <div>
                        <label className="block text-sm mb-2 text-gray-300">Content Type</label>
                        <div className="flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={() => setType("image")}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition ${type === "image"
                                        ? "bg-blue-500/20 border-blue-400 text-blue-300"
                                        : "bg-white/5 border-white/20 text-white/60 hover:bg-white/10"
                                    }`}
                            >
                                <Image className="w-4 h-4" /> Image
                            </button>

                            <button
                                type="button"
                                onClick={() => setType("video")}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition ${type === "video"
                                        ? "bg-green-500/20 border-green-400 text-green-300"
                                        : "bg-white/5 border-white/20 text-white/60 hover:bg-white/10"
                                    }`}
                            >
                                <Video className="w-4 h-4" /> Video
                            </button>

                            <button
                                type="button"
                                onClick={() => setType("audio")}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition ${type === "audio"
                                        ? "bg-yellow-500/20 border-yellow-400 text-yellow-300"
                                        : "bg-white/5 border-white/20 text-white/60 hover:bg-white/10"
                                    }`}
                            >
                                <Music2 className="w-4 h-4" /> Audio
                            </button>
                        </div>
                    </div>

                    {/* FILE UPLOAD */}
                    <div>
                        <label className="block text-sm mb-2 text-gray-300">
                            Choose File <span className="text-white/40">(Max 50MB)</span>
                        </label>

                        <div className="relative">
                            <input
                                type="file"
                                accept={
                                    type === "image"
                                        ? "image/*"
                                        : type === "video"
                                            ? "video/*"
                                            : "audio/*"
                                }
                                onChange={handleFileChange}
                                className="block w-full text-sm text-gray-300 border border-white/20 rounded-lg p-3 bg-white/5 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-cyan-500/20 file:text-cyan-300 hover:file:bg-cyan-500/30 cursor-pointer"
                            />
                        </div>

                        {/* File info */}
                        {file && (
                            <div className="mt-2 text-sm text-white/60 flex items-center gap-2">
                                <Check className="w-4 h-4 text-green-400" />
                                {file.name} ({formatFileSize(file.size)})
                            </div>
                        )}

                        {/* PREVIEW */}
                        {preview && (
                            <div className="mt-4 rounded-lg overflow-hidden border border-white/10">
                                {type === "image" && (
                                    <img
                                        src={preview}
                                        alt="preview"
                                        className="w-full max-h-64 object-contain bg-black/50"
                                    />
                                )}
                                {type === "video" && (
                                    <video
                                        src={preview}
                                        controls
                                        className="w-full max-h-64 object-contain bg-black"
                                    />
                                )}
                                {type === "audio" && (
                                    <div className="p-4 bg-white/5">
                                        <audio src={preview} controls className="w-full" />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* TITLE */}
                    <div>
                        <label className="block text-sm mb-2 text-gray-300">Title</label>
                        <input
                            type="text"
                            value={title}
                            maxLength={100}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Give your content a title..."
                            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-cyan-400 transition"
                        />
                        <p className="text-xs text-white/40 mt-1">{title.length}/100</p>
                    </div>

                    {/* DESCRIPTION */}
                    <div>
                        <label className="block text-sm mb-2 text-gray-300">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows="4"
                            maxLength={500}
                            placeholder="Describe your content..."
                            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-cyan-400 transition resize-none"
                        />
                        <p className="text-xs text-white/40 mt-1">{description.length}/500</p>
                    </div>

                    {/* UPLOAD PROGRESS */}
                    {uploading && uploadProgress > 0 && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-white/60">Uploading...</span>
                                <span className="text-cyan-400">{uploadProgress}%</span>
                            </div>
                            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                                <div
                                    className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-300"
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* ERRORS */}
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                            <p className="text-red-400 text-sm">⚠️ {error}</p>
                        </div>
                    )}

                    {/* SUBMIT */}
                    <button
                        type="submit"
                        disabled={uploading || !file}
                        className={`w-full py-4 font-bold rounded-xl transition flex items-center justify-center gap-2 ${uploading || !file
                                ? "bg-gray-600 cursor-not-allowed opacity-50"
                                : "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500"
                            }`}
                    >
                        {uploading ? (
                            <>
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle
                                        className="opacity-25"
                                        cx="12" cy="12" r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                        fill="none"
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                    />
                                </svg>
                                Uploading... {uploadProgress}%
                            </>
                        ) : (
                            <>
                                <Upload className="w-5 h-5" />
                                Publish to World-Studio 🌍
                            </>
                        )}
                    </button>
                </form>

                {/* TIPS */}
                <div className="mt-8 p-4 bg-white/5 rounded-lg border border-white/10">
                    <h3 className="font-semibold mb-2 text-white/80">💡 Upload Tips</h3>
                    <ul className="text-sm text-white/50 space-y-1">
                        <li>• Supported images: JPG, PNG, WebP, GIF</li>
                        <li>• Supported videos: MP4, WebM, MOV</li>
                        <li>• Supported audio: MP3, WAV, OGG, M4A</li>
                        <li>• Maximum file size: 50MB</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}