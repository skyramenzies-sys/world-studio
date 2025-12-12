// src/components/GoLiveForm.jsx - WORLD STUDIO LIVE EDITION 🔴 (U.E.)
import React, { useReducer, useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

// ✅ Use shared instances
import api from "../api/api";
import socket from "../api/socket";

/* ============================================================
   CONSTANTS
   ============================================================ */
const CATEGORIES = [
    { id: "music", name: "Music", icon: "🎵" },
    { id: "gaming", name: "Gaming", icon: "🎮" },
    { id: "talk", name: "Talk", icon: "💬" },
    { id: "art", name: "Art", icon: "🎨" },
    { id: "education", name: "Education", icon: "📚" },
    { id: "sports", name: "Sports", icon: "⚽" },
    { id: "cooking", name: "Cooking", icon: "🍳" },
    { id: "fitness", name: "Fitness", icon: "💪" },
    { id: "dance", name: "Dance", icon: "💃" },
    { id: "comedy", name: "Comedy", icon: "😂" },
    { id: "beauty", name: "Beauty", icon: "💄" },
    { id: "travel", name: "Travel", icon: "✈️" },
];

const MAX_FILE_SIZE_MB = 5;
const MAX_TITLE_LENGTH = 100;
const DEFAULT_AVATAR = "/defaults/default-avatar.png";

/* ============================================================
   STATE MANAGEMENT
   ============================================================ */
const initialState = {
    title: "",
    category: CATEGORIES[0].id,
    coverImage: "",
    coverFile: null,
    description: "",
    isPrivate: false,
    allowGifts: true,
    allowComments: true,
    loading: false,
    uploading: false,
    info: "",
    errors: {},
};

function reducer(state, action) {
    switch (action.type) {
        case "SET":
            return { ...state, ...action.payload };
        case "ERROR":
            return {
                ...state,
                errors: { ...state.errors, [action.field]: action.error },
            };
        case "CLEAR_ERROR": {
            const newErrors = { ...state.errors };
            delete newErrors[action.field];
            return { ...state, errors: newErrors };
        }
        case "RESET":
            return { ...initialState, category: CATEGORIES[0].id };
        default:
            return state;
    }
}

/* Helper: generate roomId compatible with LiveModeSelector */
const generateRoomId = (username) => {
    return `${username || "room"}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
};

/* ============================================================
   MAIN COMPONENT
   ============================================================ */
export default function GoLiveForm({ onLiveStarted }) {
    const navigate = useNavigate();
    const [state, dispatch] = useReducer(reducer, initialState);
    const fileRef = useRef(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [showAdvanced, setShowAdvanced] = useState(false);

    const selfId = currentUser?._id || currentUser?.id;

    /* ========================================================
       LOAD USER
       ======================================================== */
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

    /* ========================================================
       VALIDATION
       ======================================================== */
    function validate() {
        const errors = {};
        if (!state.title.trim()) {
            errors.title = "Title is required.";
        }
        if (state.title.length > MAX_TITLE_LENGTH) {
            errors.title = `Title must be ${MAX_TITLE_LENGTH} characters or less.`;
        }
        if (state.coverFile && state.coverFile.size / 1024 / 1024 > MAX_FILE_SIZE_MB) {
            errors.coverFile = `Image must be ≤ ${MAX_FILE_SIZE_MB}MB.`;
        }
        return errors;
    }

    /* ========================================================
       HANDLE COVER IMAGE UPLOAD
       ======================================================== */
    async function handleCoverUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        dispatch({ type: "CLEAR_ERROR", field: "coverFile" });

        // Validate file type
        if (!file.type.startsWith("image/")) {
            return dispatch({
                type: "ERROR",
                field: "coverFile",
                error: "File must be an image.",
            });
        }

        // Validate file size
        if (file.size / 1024 / 1024 > MAX_FILE_SIZE_MB) {
            return dispatch({
                type: "ERROR",
                field: "coverFile",
                error: `Image must be ≤ ${MAX_FILE_SIZE_MB}MB.`,
            });
        }

        dispatch({
            type: "SET",
            payload: { uploading: true, info: "Uploading cover..." },
        });

        try {
            const formData = new FormData();
            formData.append("file", file);


            const res = await api.post("/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            dispatch({
                type: "SET",
                payload: {
                    coverFile: file,
                    coverImage: res.data.url || res.data.mediaUrl,
                    uploading: false,
                    info: "Cover uploaded! ✓",
                },
            });

            toast.success("Cover image uploaded!");
        } catch (err) {
            console.error("Cover upload error:", err);
            dispatch({
                type: "ERROR",
                field: "coverFile",
                error: err.response?.data?.error || "Upload failed. Try again.",
            });
            dispatch({ type: "SET", payload: { uploading: false, info: "" } });
            toast.error("Failed to upload cover image");
        }
    }

    /* ========================================================
       REMOVE COVER IMAGE
       ======================================================== */
    function removeCover() {
        dispatch({
            type: "SET",
            payload: { coverFile: null, coverImage: "" },
        });
        if (fileRef.current) {
            fileRef.current.value = "";
        }
    }

    /* ========================================================
       HANDLE GO LIVE
       ======================================================== */
    async function handleGoLive(e) {
        e.preventDefault();

        // Check if logged in
        if (!currentUser) {
            toast.error("Please log in to go live");
            navigate("/login");
            return;
        }

        // Validate form
        const errors = validate();
        if (Object.keys(errors).length) {
            Object.entries(errors).forEach(([field, error]) =>
                dispatch({ type: "ERROR", field, error })
            );
            return;
        }

        dispatch({ type: "SET", payload: { loading: true, info: "" } });

        const roomId = generateRoomId(currentUser.username);

        try {
            const payload = {
                title: state.title.trim(),
                category: state.category,
                coverImage: state.coverImage,
                description: state.description.trim(),
                isPrivate: state.isPrivate,
                allowGifts: state.allowGifts,
                allowComments: state.allowComments,
                hostId: selfId,
                hostUsername: currentUser.username,
                hostAvatar: currentUser.avatar,
                roomId,
                mode: "solo",
                type: "solo",
            };


            const res = await api.post("/live/start", payload);

            dispatch({
                type: "SET",
                payload: { loading: false, info: "You're live! 🔴" },
            });
            toast.success("You're now live! 🎉");

            const stream = res.data.stream || res.data || {};
            const streamId = stream._id || stream.streamId || roomId;

            // Emit to socket so LiveDiscover / HomePage see it immediately
            socket.emit("stream_started", {
                streamId,
                roomId: stream.roomId || roomId,
                title: payload.title,
                category: payload.category,
                mode: payload.mode,
                hostId: payload.hostId,
                hostUsername: payload.hostUsername,
                hostAvatar: payload.hostAvatar,
                thumbnail: payload.coverImage,
                isLive: true,
                viewers: stream.viewers || 0,
                startedAt: stream.startedAt || new Date().toISOString(),
            });

            // Reset form
            dispatch({ type: "RESET" });
            if (fileRef.current) fileRef.current.value = "";

            // Callback with stream data
            if (onLiveStarted) {
                onLiveStarted(stream);
            } else {
                navigate(`/live/${streamId}`);
            }
        } catch (err) {
            console.error("Go live error:", err);
            const msg = err.response?.data?.error || err.response?.data?.message || "Failed to go live";

            dispatch({
                type: "SET",
                payload: { loading: false, info: "" },
            });
            toast.error(msg);
        }
    }

    const selectedCategory = CATEGORIES.find((c) => c.id === state.category) || CATEGORIES[0];

    /* ========================================================
       RENDER
       ======================================================== */
    return (
        <form
            onSubmit={handleGoLive}
            className="max-w-lg mx-auto bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 text-white shadow-xl"
            noValidate
        >
            {/* Header - ✅ FIXED: was "flex.items-center" */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-3">
                    <div className="relative">
                        <span className="w-4 h-4 bg-red-500 rounded-full block animate-pulse" />
                        <span className="absolute inset-0 w-4 h-4 bg-red-500 rounded-full animate-ping opacity-75" />
                    </div>
                    Start Live Stream
                </h2>
            </div>

            {/* Not logged in warning */}
            {!currentUser && (
                <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                    <p className="text-yellow-400 text-sm flex items-center gap-2">
                        <span>⚠️</span>
                        Please{" "}
                        <button
                            type="button"
                            onClick={() => navigate("/login")}
                            className="underline hover:text-yellow-300 font-semibold"
                        >
                            log in
                        </button>{" "}
                        to start streaming
                    </p>
                </div>
            )}

            {/* Preview Card */}
            <div className="mb-6 bg-black/30 rounded-xl overflow-hidden border border-white/10">
                <div className="relative aspect-video bg-gradient-to-br from-purple-900/50 to-pink-900/50">
                    {state.coverImage ? (
                        <img
                            src={state.coverImage}
                            alt="Cover"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                                <span className="text-6xl mb-2 block">{selectedCategory.icon}</span>
                                <p className="text-white/40 text-sm">Stream Preview</p>
                            </div>
                        </div>
                    )}

                    {/* Live badge */}
                    <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1 bg-red-500 rounded-full">
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        <span className="text-xs font-bold">LIVE</span>
                    </div>

                    {/* Category badge - ✅ FIXED: was "px-3.py-1" */}
                    <div className="absolute top-3 right-3 px-3 py-1 bg-black/60 backdrop-blur rounded-full text-xs">
                        {selectedCategory.icon} {selectedCategory.name}
                    </div>
                </div>

                <div className="p-3">
                    <p className="font-semibold truncate">{state.title || "Your stream title..."}</p>
                    <div className="flex items-center gap-2 mt-1">
                        <img
                            src={currentUser?.avatar || DEFAULT_AVATAR}
                            alt=""
                            className="w-5 h-5 rounded-full"
                            onError={(e) => {
                                e.target.src = DEFAULT_AVATAR;
                            }}
                        />
                        <span className="text-white/60 text-sm">{currentUser?.username || "You"}</span>
                    </div>
                </div>
            </div>

            {/* TITLE */}
            <div className="mb-5">
                <label className="block mb-2 font-semibold">
                    Stream Title <span className="text-red-400">*</span>
                </label>
                <input
                    type="text"
                    value={state.title}
                    onChange={(e) => dispatch({ type: "SET", payload: { title: e.target.value } })}
                    onFocus={() => dispatch({ type: "CLEAR_ERROR", field: "title" })}
                    placeholder="What are you streaming today?"
                    maxLength={MAX_TITLE_LENGTH}
                    className={`w-full px-4 py-3 rounded-xl bg-white/10 border ${state.errors.title ? "border-red-500" : "border-white/20"
                        } outline-none focus:border-cyan-400 transition`}
                />
                {/* ✅ FIXED: was "justify-between.mt-1" */}
                <div className="flex justify-between mt-1">
                    {state.errors.title ? (
                        <span className="text-red-400 text-sm">{state.errors.title}</span>
                    ) : (
                        <span />
                    )}
                    <span className="text-white/40 text-sm">
                        {state.title.length}/{MAX_TITLE_LENGTH}
                    </span>
                </div>
            </div>

            {/* CATEGORY */}
            <div className="mb-5">
                <label className="block mb-2 font-semibold">Category</label>
                <div className="grid grid-cols-4 gap-2">
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat.id}
                            type="button"
                            onClick={() => dispatch({ type: "SET", payload: { category: cat.id } })}
                            className={`p-3 rounded-xl text-center transition ${state.category === cat.id
                                    ? "bg-cyan-500 text-black"
                                    : "bg-white/10 text-white/70 hover:bg-white/20"
                                }`}
                        >
                            <span className="text-xl block mb-1">{cat.icon}</span>
                            <span className="text-xs font-medium">{cat.name}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* COVER IMAGE */}
            <div className="mb-5">
                <label className="block mb-2 font-semibold">
                    Cover Image{" "}
                    <span className="text-white/40 font-normal">(optional, max {MAX_FILE_SIZE_MB}MB)</span>
                </label>

                {!state.coverImage ? (
                    <div className="relative">
                        <input
                            type="file"
                            ref={fileRef}
                            accept="image/*"
                            disabled={state.uploading}
                            onChange={handleCoverUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div
                            className={`border-2 border-dashed rounded-xl p-6 text-center transition ${state.uploading
                                    ? "border-cyan-400 bg-cyan-500/10"
                                    : "border-white/20 hover:border-white/40"
                                }`}
                        >
                            {state.uploading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-cyan-400" />
                                    <span className="text-cyan-400">Uploading...</span>
                                </div>
                            ) : (
                                <>
                                    <p className="text-3xl mb-2">📷</p>
                                    <p className="text-white/60 text-sm">Click to upload cover image</p>
                                    <p className="text-white/40 text-xs">or drag and drop</p>
                                </>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="relative inline-block w-full">
                        <img
                            src={state.coverImage}
                            alt="Cover Preview"
                            className="w-full rounded-xl border border-white/20 object-cover"
                            style={{ aspectRatio: "16/9" }}
                        />
                        <button
                            type="button"
                            onClick={removeCover}
                            className="absolute top-2 right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-400 transition shadow-lg"
                        >
                            ×
                        </button>
                    </div>
                )}

                {state.errors.coverFile && (
                    <p className="text-red-400 text-sm mt-2">{state.errors.coverFile}</p>
                )}
            </div>

            {/* ADVANCED OPTIONS */}
            <div className="mb-6">
                <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-2 text-white/60 hover:text-white transition text-sm"
                >
                    <span className={`transform transition ${showAdvanced ? "rotate-90" : ""}`}>▶</span>
                    Advanced Options
                </button>

                {showAdvanced && (
                    <div className="mt-4 space-y-4 p-4 bg-white/5 rounded-xl border border-white/10 animate-fadeIn">
                        {/* Description */}
                        <div>
                            <label className="block mb-2 text-sm font-medium">Description</label>
                            <textarea
                                value={state.description}
                                onChange={(e) =>
                                    dispatch({
                                        type: "SET",
                                        payload: { description: e.target.value },
                                    })
                                }
                                placeholder="Tell viewers what your stream is about..."
                                rows={3}
                                maxLength={500}
                                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 outline-none focus:border-cyan-400 transition resize-none text-sm"
                            />
                        </div>

                        {/* Toggles */}
                        <div className="space-y-3">
                            {[
                                { key: "allowGifts", label: "Allow Gifts", icon: "🎁" },
                                { key: "allowComments", label: "Allow Comments", icon: "💬" },
                                { key: "isPrivate", label: "Private Stream", icon: "🔒" },
                            ].map((option) => (
                                <label
                                    key={option.key}
                                    className="flex items-center justify-between cursor-pointer"
                                >
                                    <span className="flex items-center gap-2 text-sm">
                                        <span>{option.icon}</span>
                                        {option.label}
                                    </span>
                                    <div
                                        onClick={() =>
                                            dispatch({
                                                type: "SET",
                                                payload: { [option.key]: !state[option.key] },
                                            })
                                        }
                                        className={`w-12 h-6 rounded-full transition cursor-pointer ${state[option.key] ? "bg-cyan-500" : "bg-white/20"
                                            }`}
                                    >
                                        <div
                                            className={`w-5 h-5 bg-white rounded-full shadow transition transform mt-0.5 ${state[option.key]
                                                    ? "translate-x-6 ml-0.5"
                                                    : "translate-x-0.5"
                                                }`}
                                        />
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* GO LIVE BUTTON */}
            <button
                type="submit"
                disabled={state.loading || state.uploading || !currentUser}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3 ${state.loading || state.uploading || !currentUser
                        ? "bg-gray-600 cursor-not-allowed opacity-60"
                        : "bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-400 hover:to-pink-500 hover:shadow-lg hover:shadow-red-500/30 hover:scale-[1.02]"
                    }`}
            >
                {state.loading ? (
                    <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                        Starting Stream...
                    </>
                ) : (
                    <>
                        <div className="relative">
                            <span className="w-3 h-3 bg-white rounded-full block" />
                        </div>
                        Go Live
                    </>
                )}
            </button>

            {/* Info message */}
            {state.info && (
                <p className="mt-4 text-center text-cyan-400 font-medium animate-pulse">{state.info}</p>
            )}

            {/* Tips */}
            <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/10">
                <p className="text-white/60 text-xs mb-2 font-semibold">💡 Tips for a great stream:</p>
                <ul className="text-white/40 text-xs space-y-1">
                    <li>• Use a catchy title to attract viewers</li>
                    <li>• Add a cover image to stand out</li>
                    <li>• Interact with your audience</li>
                    <li>• Enable gifts to earn from your content</li>
                </ul>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
            `}</style>
        </form>
    );
}
