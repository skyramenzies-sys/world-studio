// src/components/UploadPage.jsx
// World-Studio.live - Upload & Sell Content (Universe Edition)
// Engineered for Commander Sandro Menzies by AIRPATH

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../api/api";

// ===========================================
// ICONS (Inline SVG for no extra deps)
// ===========================================
const Icons = {
    ArrowLeft: () => (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
    ),
    Upload: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
    ),
    Image: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
    ),
    Video: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
    ),
    Music: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2zM9 10l12-3" />
        </svg>
    ),
    Check: () => (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
    ),
    Dollar: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    Gift: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
        </svg>
    ),
    Tag: () => (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
    ),
    X: () => (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
    ),
    ShoppingCart: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
    ),
};

// ===========================================
// CATEGORIES – MATCHEN MET BACKEND CATEGORIES
// ===========================================
const CATEGORIES = [
    { id: "General", name: "General", icon: "📁" },
    { id: "Gaming", name: "Gaming", icon: "🎮" },
    { id: "Music", name: "Music", icon: "🎵" },
    { id: "Art", name: "Art & Design", icon: "🎨" },
    { id: "Photography", name: "Photography", icon: "📷" },
    { id: "Comedy", name: "Comedy", icon: "😂" },
    { id: "Education", name: "Education", icon: "📚" },
    { id: "Sports", name: "Sports", icon: "🏅" },
    { id: "News", name: "News", icon: "📰" },
    { id: "Technology", name: "Technology", icon: "💻" },
    { id: "Lifestyle", name: "Lifestyle", icon: "🌈" },
    { id: "Fashion", name: "Fashion & Beauty", icon: "👗" },
    { id: "Food", name: "Food & Cooking", icon: "🍳" },
    { id: "Travel", name: "Travel", icon: "✈️" },
    { id: "Fitness", name: "Fitness & Health", icon: "💪" },
    { id: "Entertainment", name: "Entertainment", icon: "🎬" },
    { id: "Vlogs", name: "Vlogs", icon: "📹" },
    { id: "Tutorials", name: "Tutorials", icon: "📖" },
    { id: "Reviews", name: "Reviews", icon: "⭐" },
    { id: "Other", name: "Other", icon: "📌" },
];

const LICENSE_TYPES = [
    {
        id: "personal",
        name: "Personal Use",
        description: "Buyer can use for personal projects only",
        icon: "👤",
    },
    {
        id: "commercial",
        name: "Commercial Use",
        description: "Buyer can use for commercial projects",
        icon: "💼",
    },
    {
        id: "exclusive",
        name: "Exclusive Rights",
        description: "Full exclusive rights transfer to buyer",
        icon: "👑",
    },
];

// ===========================================
// COMPONENT
// ===========================================
export default function UploadPage() {
    const navigate = useNavigate();


    const [currentUser, setCurrentUser] = useState(null);


    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [type, setType] = useState("image"); // image | video | audio
    const [category, setCategory] = useState("General");
    const [tags, setTags] = useState([]);
    const [tagInput, setTagInput] = useState("");


    const [isFree, setIsFree] = useState(true);
    const [price, setPrice] = useState(""); // dollars in UI
    const [licenseType, setLicenseType] = useState("personal");
    const [allowCommercial, setAllowCommercial] = useState(false);


    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState("");
    const [uploadProgress, setUploadProgress] = useState(0);

    // Load user
    useEffect(() => {
        const storedUser =
            localStorage.getItem("ws_currentUser") ||
            localStorage.getItem("user");
        if (storedUser) {
            try {
                setCurrentUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Failed to parse ws_currentUser:", e);
            }
        }
    }, []);

    // Clean preview URL
    useEffect(
        () => () => {
            if (preview) URL.revokeObjectURL(preview);
        },
        [preview]
    );

    // Reset file when type changes
    useEffect(() => {
        setFile(null);
        setPreview(null);
        setError("");
    }, [type]);

    // ===========================================
    // HELPERS
    // ===========================================
    const formatFileSize = (bytes) => {
        if (!bytes) return "0 B";
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    };

    const calculateEarnings = () => {
        const priceNum = parseFloat(price) || 0;
        const platformFee = priceNum * 0.15;
        const earnings = priceNum - platformFee;
        return earnings.toFixed(2);
    };

    // Tags
    const addTag = () => {
        const tag = tagInput.trim().toLowerCase();
        if (tag && !tags.includes(tag) && tags.length < 10) {
            setTags((prev) => [...prev, tag]);
            setTagInput("");
        }
    };

    const removeTag = (tagToRemove) => {
        setTags((prev) => prev.filter((t) => t !== tagToRemove));
    };

    const handleTagKeyDown = (e) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addTag();
        }
    };

    // ===========================================
    // FILE & FORM
    // ===========================================
    const handleFileChange = (e) => {
        const f = e.target.files?.[0];
        if (!f) return;

        setError("");

        // Frontend limit: free 50MB, paid 100MB
        const maxSizeMB = isFree ? 50 : 100;
        if (f.size / (1024 * 1024) > maxSizeMB) {
            setError(`File exceeds ${maxSizeMB} MB limit.`);
            return;
        }

        // Match backend allowed MIME types as veel mogelijk
        const validTypes = {
            image: ["image/jpeg", "image/png", "image/gif", "image/webp"],
            video: [
                "video/mp4",
                "video/webm",
                "video/quicktime",
                "video/x-msvideo",
            ],
            audio: [
                "audio/mpeg",
                "audio/wav",
                "audio/ogg",
                "audio/mp4",
                "audio/webm",
            ],
        };

        const allowed = validTypes[type] || [];
        const isValidType =
            allowed.includes(f.type) ||
            f.type.startsWith(type + "/");

        if (!isValidType) {
            setError(`Invalid file type. Please select a ${type} file.`);
            return;
        }

        setFile(f);


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

        // Validate price for paid content
        let priceNum = 0;
        let priceCents = 0;

        if (!isFree) {
            priceNum = parseFloat(price);
            if (isNaN(priceNum) || priceNum < 0.99) {
                setError("Minimum price is $0.99");
                return;
            }
            if (priceNum > 9999) {
                setError("Maximum price is $9,999");
                return;
            }
            // Backend normalizePricing gebruikt parseInt(price)
            // => prijs moet integer zijn (cents)
            priceCents = Math.round(priceNum * 100);
        }

        setUploading(true);
        setError("");
        setUploadProgress(0);

        try {
            const formData = new FormData();
            // ✅ backend: upload.array("files", ...)
            formData.append("files", file);
            formData.append(
                "title",
                title || "Untitled"
            );
            formData.append(
                "description",
                description || ""
            );

            // type wordt server-side bepaald via mimetype,
            // maar kan geen kwaad om mee te sturen (wordt gewoon genegeerd)
            formData.append("type", type);

            // ✅ category moet exact overeenkomen met backend CATEGORIES
            formData.append("category", category);

            // ✅ tags als comma-separated string, zodat parseTags goed werkt
            if (tags.length > 0) {
                formData.append("tags", tags.join(","));
            }

            // Pricing flags voor backend
            formData.append("isFree", isFree.toString());



            if (!isFree) {
                // Backend kijkt alleen naar "price"
                formData.append("price", String(priceCents)); // cents integer

                // Extra info, backend negeert deze voorlopig
                formData.append("priceDisplay", priceNum.toFixed(2));
                formData.append("currency", "usd");
                formData.append("licenseType", licenseType);
                formData.append(
                    "allowCommercial",
                    allowCommercial.toString()
                );
                formData.append("isPremium", "true");
            }


            const response = await api.post("/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" },
                onUploadProgress: (evt) => {
                    if (!evt.total) return;
                    const progress = Math.round(
                        (evt.loaded * 100) / evt.total
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
            setTags([]);
            setPrice("");
            setUploadProgress(0);

            const successMsg = isFree
                ? "Content uploaded successfully! 🎉"
                : `Content listed for sale at $${priceNum.toFixed(2)}! 💰`;

            toast.success(successMsg);

            // Navigation
            setTimeout(() => {
                if (!isFree) {
                    navigate("/shop");
                } else {
                    navigate("/");
                }

            }, 1000);
        } catch (err) {
            console.error("Upload error:", err);
            const errorMsg =
                err?.response?.data?.error ||
                err?.response?.data?.message ||
                "Upload failed. Please try again.";
            setError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setUploading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("ws_token");
        localStorage.removeItem("ws_currentUser");
        toast.success("Logged out");
        navigate("/login");
    };

    // ===========================================
    // RENDER
    // ===========================================
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black text-white p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header Card */}
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 shadow-xl mb-6">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => navigate("/")}
                            className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-lg hover:bg-white/20 transition"
                        >
                            <Icons.ArrowLeft />
                            Back
                        </button>

                        <div className="flex items-center gap-3">
                            {currentUser && (
                                <div className="flex items-center gap-2">
                                    <img
                                        src={
                                            currentUser.avatar ||
                                            "/defaults/default-avatar.png"
                                        }
                                        alt={currentUser.username}
                                        className="w-8 h-8 rounded-full object-cover border border-white/20"
                                        onError={(e) => {
                                            e.target.src =
                                                "/defaults/default-avatar.png";
                                        }}
                                    />
                                    <span className="text-white/60 text-sm hidden sm:block">
                                        {currentUser.username}
                                    </span>
                                </div>
                            )}
                            <button
                                onClick={handleLogout}
                                className="px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-lg hover:bg-red-500/30 transition text-sm"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Upload Card */}
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 shadow-xl">
                    <h1 className="text-2xl font-bold mb-2 text-center">
                        🚀 Upload & Sell Content
                    </h1>
                    <p className="text-white/60 text-center text-sm mb-6">
                        Share for free or sell your creative work
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* PRICING MODE TOGGLE */}
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => setIsFree(true)}
                                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${isFree
                                        ? "border-green-500 bg-green-500/20 shadow-lg shadow-green-500/20"
                                        : "border-white/20 bg-white/5 hover:bg-white/10"
                                    }`}
                            >
                                <div
                                    className={`w-12 h-12 rounded-full flex items-center justify-center ${isFree ? "bg-green-500" : "bg-white/10"
                                        }`}
                                >
                                    <Icons.Gift />
                                </div>
                                <span className="font-semibold">Share Free</span>
                                <span className="text-xs text-white/50">
                                    Free for everyone
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setIsFree(false)}
                                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${!isFree
                                        ? "border-yellow-500 bg-yellow-500/20 shadow-lg shadow-yellow-500/20"
                                        : "border-white/20 bg-white/5 hover:bg-white/10"
                                    }`}
                            >
                                <div
                                    className={`w-12 h-12 rounded-full flex items-center justify-center ${!isFree ? "bg-yellow-500" : "bg-white/10"
                                        }`}
                                >
                                    <Icons.Dollar />
                                </div>
                                <span className="font-semibold">Sell Content</span>
                                <span className="text-xs text-white/50">
                                    Earn from your work
                                </span>
                            </button>
                        </div>

                        {/* TYPE SELECTOR */}
                        <div>
                            <label className="block text-sm mb-2 text-gray-300">
                                Content Type
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setType("image")}
                                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition ${type === "image"
                                            ? "bg-blue-500/20 border-blue-400 text-blue-300"
                                            : "bg-white/5 border-white/20 text-white/60 hover:bg-white/10"
                                        }`}
                                >
                                    <Icons.Image />
                                    <span className="text-sm font-medium">
                                        Image
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setType("video")}
                                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition ${type === "video"
                                            ? "bg-green-500/20 border-green-400 text-green-300"
                                            : "bg-white/5 border-white/20 text-white/60 hover:bg-white/10"
                                        }`}
                                >
                                    <Icons.Video />
                                    <span className="text-sm font-medium">
                                        Video
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setType("audio")}
                                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition ${type === "audio"
                                            ? "bg-yellow-500/20 border-yellow-400 text-yellow-300"
                                            : "bg-white/5 border-white/20 text-white/60 hover:bg-white/10"
                                        }`}
                                >
                                    <Icons.Music />
                                    <span className="text-sm font-medium">
                                        Audio
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* FILE UPLOAD */}
                        <div>
                            <label className="block text-sm mb-2 text-gray-300">
                                Choose File{" "}
                                <span className="text-white/40">
                                    (Max {isFree ? "50" : "100"}MB)
                                </span>
                            </label>

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
                                className="block w-full text-sm text-gray-300 border-2 border-dashed border-white/20 rounded-xl p-6 bg-white/5 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-cyan-500/20 file:text-cyan-300 hover:file:bg-cyan-500/30 cursor-pointer hover:border-cyan-500/50 transition"
                            />


                            {file && (
                                <div className="mt-3 p-3 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center gap-2">
                                    <Icons.Check />
                                    <span className="text-green-400 text-sm">
                                        {file.name} ({formatFileSize(file.size)})
                                    </span>
                                </div>
                            )}

                            {/* PREVIEW */}
                            {preview && (
                                <div className="mt-4 rounded-xl overflow-hidden border border-white/10">
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
                                        <div className="p-6 bg-gradient-to-r from-purple-500/20 to-pink-500/20">
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="w-16 h-16 bg-white/10 rounded-xl flex items-center justify-center">
                                                    <Icons.Music />
                                                </div>
                                                <div>
                                                    <p className="font-medium">
                                                        {file?.name || "Audio File"}
                                                    </p>
                                                    <p className="text-sm text-white/50">
                                                        {formatFileSize(file?.size || 0)}
                                                    </p>
                                                </div>
                                            </div>
                                            <audio src={preview} controls className="w-full" />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* TITLE */}
                        <div>
                            <label className="block text-sm mb-2 text-gray-300">
                                Title *
                            </label>
                            <input
                                type="text"
                                value={title}
                                maxLength={100}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Give your content a catchy title..."
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-cyan-400 transition"
                                required
                            />
                            <p className="text-xs text-white/40 mt-1">
                                {title.length}/100
                            </p>
                        </div>

                        {/* DESCRIPTION */}
                        <div>
                            <label className="block text-sm mb-2 text-gray-300">
                                Description
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows="3"
                                maxLength={500}
                                placeholder="Describe your content..."
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-cyan-400 transition resize-none"
                            />
                            <p className="text-xs text-white/40 mt-1">
                                {description.length}/500
                            </p>
                        </div>

                        {/* CATEGORY */}
                        <div>
                            <label className="block text-sm mb-2 text-gray-300">
                                Category
                            </label>
                            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                                {CATEGORIES.map((cat) => (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => setCategory(cat.id)}
                                        className={`p-2 rounded-lg text-center transition text-xs ${category === cat.id
                                                ? "bg-cyan-500/20 border border-cyan-500/50 text-cyan-300"
                                                : "bg-white/5 border border-white/10 hover:bg-white/10"
                                            }`}
                                    >
                                        <span className="text-lg">
                                            {cat.icon}
                                        </span>
                                        <p className="mt-1 truncate">
                                            {cat.name}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* TAGS */}
                        <div>
                            <label className="block text-sm mb-2 text-gray-300">
                                Tags{" "}
                                <span className="text-white/40">
                                    (up to 10)
                                </span>
                            </label>
                            <div className="flex gap-2 mb-2 flex-wrap">
                                {tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="px-3 py-1 bg-cyan-500/20 text-cyan-300 rounded-full text-sm flex items-center gap-1"
                                    >
                                        <Icons.Tag />
                                        {tag}
                                        <button
                                            type="button"
                                            onClick={() => removeTag(tag)}
                                            className="ml-1 hover:text-red-400"
                                        >
                                            <Icons.X />
                                        </button>
                                    </span>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={tagInput}
                                    onChange={(e) =>
                                        setTagInput(e.target.value)
                                    }
                                    onKeyDown={handleTagKeyDown}
                                    placeholder="Add tag and press Enter..."
                                    className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-cyan-400 transition text-sm"
                                    maxLength={20}
                                />
                                <button
                                    type="button"
                                    onClick={addTag}
                                    disabled={
                                        !tagInput.trim() || tags.length >= 10
                                    }
                                    className="px-4 py-2 bg-cyan-500/20 text-cyan-300 rounded-lg hover:bg-cyan-500/30 transition disabled:opacity-50"
                                >
                                    Add
                                </button>
                            </div>
                        </div>

                        {/* PRICING SECTION (ONLY WHEN SELLING) */}
                        {!isFree && (
                            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl space-y-4">
                                <h3 className="font-semibold text-yellow-400 flex items-center gap-2">
                                    <Icons.Dollar /> Pricing Details
                                </h3>

                                {/* Price */}
                                <div>
                                    <label className="block text-sm mb-2 text-gray-300">
                                        Price (USD) *
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50">
                                            $
                                        </span>
                                        <input
                                            type="number"
                                            value={price}
                                            onChange={(e) =>
                                                setPrice(e.target.value)
                                            }
                                            placeholder="0.00"
                                            min="0.99"
                                            max="9999"
                                            step="0.01"
                                            className="w-full pl-8 pr-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-yellow-400 transition"
                                            required={!isFree}
                                        />
                                    </div>
                                    <p className="text-xs text-white/40 mt-1">
                                        Min: $0.99 • Max: $9,999
                                    </p>
                                </div>

                                {/* Earnings */}
                                {price && parseFloat(price) > 0 && (
                                    <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-white/60">
                                                Your Price:
                                            </span>
                                            <span>
                                                ${parseFloat(price).toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-white/60">
                                                Platform Fee (15%):
                                            </span>
                                            <span className="text-red-400">
                                                -
                                                {(
                                                    parseFloat(price) *
                                                    0.15
                                                ).toFixed(2)}
                                            </span>
                                        </div>
                                        <hr className="border-white/10 my-2" />
                                        <div className="flex justify-between font-semibold">
                                            <span className="text-green-400">
                                                You Earn:
                                            </span>
                                            <span className="text-green-400">
                                                ${calculateEarnings()}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* License */}
                                <div>
                                    <label className="block text-sm mb-2 text-gray-300">
                                        License Type
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                        {LICENSE_TYPES.map((license) => (
                                            <button
                                                key={license.id}
                                                type="button"
                                                onClick={() =>
                                                    setLicenseType(license.id)
                                                }
                                                className={`p-3 rounded-lg text-left transition ${licenseType === license.id
                                                        ? "bg-yellow-500/20 border border-yellow-500/50"
                                                        : "bg-white/5 border border-white/10 hover:bg-white/10"
                                                    }`}
                                            >
                                                <span className="text-xl">
                                                    {license.icon}
                                                </span>
                                                <p className="font-medium text-sm mt-1">
                                                    {license.name}
                                                </p>
                                                <p className="text-xs text-white/50 mt-1">
                                                    {license.description}
                                                </p>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Commercial toggle */}
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            checked={allowCommercial}
                                            onChange={(e) =>
                                                setAllowCommercial(
                                                    e.target.checked
                                                )
                                            }
                                            className="sr-only"
                                        />
                                        <div
                                            className={`w-12 h-6 rounded-full transition ${allowCommercial
                                                    ? "bg-green-500"
                                                    : "bg-white/20"
                                                }`}
                                        >
                                            <div
                                                className={`w-5 h-5 bg-white rounded-full shadow transition-transform mt-0.5 ${allowCommercial
                                                        ? "translate-x-6"
                                                        : "translate-x-0.5"
                                                    }`}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">
                                            Allow Commercial Use
                                        </p>
                                        <p className="text-xs text-white/50">
                                            Buyers can use for business
                                            purposes
                                        </p>
                                    </div>
                                </label>
                            </div>
                        )}

                        {/* PROGRESS */}
                        {uploading && uploadProgress > 0 && (
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-white/60">
                                        Uploading...
                                    </span>
                                    <span className="text-cyan-400">
                                        {uploadProgress}%
                                    </span>
                                </div>
                                <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                                    <div
                                        className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-300"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* ERROR */}
                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                                <p className="text-red-400 text-sm">
                                    ⚠️ {error}
                                </p>
                            </div>
                        )}

                        {/* SUBMIT */}
                        <button
                            type="submit"
                            disabled={uploading || !file || !title.trim()}
                            className={`w-full py-4 font-bold rounded-xl transition flex items-center justify-center gap-2 ${uploading || !file || !title.trim()
                                    ? "bg-gray-600 cursor-not-allowed opacity-50"
                                    : isFree
                                        ? "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500"
                                        : "bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400"
                                }`}
                        >
                            {uploading ? (
                                <>
                                    <svg
                                        className="animate-spin h-5 w-5"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
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
                            ) : isFree ? (
                                <>
                                    <Icons.Upload />
                                    Share Content Free 🎁
                                </>
                            ) : (
                                <>
                                    <Icons.ShoppingCart />
                                    List for Sale ${price || "0.00"} 💰
                                </>
                            )}
                        </button>
                    </form>

                    {/* TIPS */}
                    <div className="mt-8 p-4 bg-white/5 rounded-xl border border-white/10">
                        <h3 className="font-semibold mb-3 text-white/80">
                            💡 Upload Tips
                        </h3>
                        <div className="grid md:grid-cols-2 gap-4 text-sm text-white/50">
                            <div>
                                <p className="font-medium text-white/70 mb-1">
                                    📸 Images
                                </p>
                                <p>JPG, PNG, WebP, GIF supported</p>
                            </div>
                            <div>
                                <p className="font-medium text-white/70 mb-1">
                                    🎬 Videos
                                </p>
                                <p>MP4, WebM, MOV / AVI supported</p>
                            </div>
                            <div>
                                <p className="font-medium text-white/70 mb-1">
                                    🎵 Audio
                                </p>
                                <p>MP3 (audio/mpeg), WAV, OGG, MP4, WEBM</p>
                            </div>
                            <div>
                                <p className="font-medium text-white/70 mb-1">
                                    💾 File Size
                                </p>
                                <p>Free: 50MB max • Selling: 100MB max</p>
                            </div>
                        </div>

                        {!isFree && (
                            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                                <p className="text-yellow-400 text-sm font-medium">
                                    💰 Seller Tips
                                </p>
                                <ul className="text-xs text-white/50 mt-1 space-y-1">
                                    <li>• High-quality content sells better</li>
                                    <li>• Add relevant tags for better discovery</li>
                                    <li>• Write detailed descriptions</li>
                                    <li>• Platform fee is only 15%</li>
                                </ul>
                            </div>
                        )}
                    </div>


                    <div className="mt-6 text-center">
                        <p className="text-white/30 text-xs">
                            🌍 World-Studio.live • Create • Share • Earn
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
