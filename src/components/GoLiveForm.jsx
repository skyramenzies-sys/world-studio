// src/components/GoLiveForm.jsx
import React, { useReducer, useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../api/api";

const CATEGORIES = ["Music", "Gaming", "Talk", "Art", "Education", "Sports", "Cooking", "Fitness"];
const MAX_FILE_SIZE_MB = 5;

const initialState = {
    title: "",
    category: CATEGORIES[0],
    coverImage: "",
    coverFile: null,
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
        case "CLEAR_ERROR":
            const newErrors = { ...state.errors };
            delete newErrors[action.field];
            return { ...state, errors: newErrors };
        case "RESET":
            return { ...initialState, category: CATEGORIES[0] };
        default:
            return state;
    }
}

export default function GoLiveForm({ onLiveStarted }) {
    const navigate = useNavigate();
    const [state, dispatch] = useReducer(reducer, initialState);
    const fileRef = useRef(null);

    // Get current user from localStorage
    const [currentUser, setCurrentUser] = useState(null);

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

    // Validation
    function validate() {
        const errors = {};
        if (!state.title.trim()) {
            errors.title = "Title is required.";
        }
        if (state.title.length > 100) {
            errors.title = "Title must be 100 characters or less.";
        }
        if (state.coverFile && state.coverFile.size / 1024 / 1024 > MAX_FILE_SIZE_MB) {
            errors.coverFile = `Image must be ≤ ${MAX_FILE_SIZE_MB}MB.`;
        }
        return errors;
    }

    // Handle cover image upload
    async function handleCoverUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Clear previous errors
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

        dispatch({ type: "SET", payload: { uploading: true, info: "Uploading cover..." } });

        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await api.post("/upload", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
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

    // Remove cover image
    function removeCover() {
        dispatch({
            type: "SET",
            payload: {
                coverFile: null,
                coverImage: "",
            },
        });
        if (fileRef.current) {
            fileRef.current.value = "";
        }
    }

    // Handle Go Live
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

        try {
            const res = await api.post("/live", {
                title: state.title.trim(),
                category: state.category,
                coverImage: state.coverImage,
                hostId: currentUser._id || currentUser.id,
                hostUsername: currentUser.username,
            });

            dispatch({ type: "SET", payload: { loading: false, info: "You're live! 🔴" } });
            toast.success("You're now live!");

            // Reset form
            dispatch({ type: "RESET" });
            if (fileRef.current) fileRef.current.value = "";

            // Callback with stream data
            if (onLiveStarted) {
                onLiveStarted(res.data);
            } else {
                // Navigate to the live page with the stream
                navigate(`/live/${res.data._id || res.data.roomId}`);
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

    return (
        <form
            onSubmit={handleGoLive}
            className="max-w-lg mx-auto bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 text-white shadow-xl"
            noValidate
        >
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                Start a Live Stream
            </h2>

            {/* Not logged in warning */}
            {!currentUser && (
                <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <p className="text-yellow-400 text-sm">
                        ⚠️ Please{" "}
                        <button
                            type="button"
                            onClick={() => navigate("/login")}
                            className="underline hover:text-yellow-300"
                        >
                            log in
                        </button>{" "}
                        to start streaming
                    </p>
                </div>
            )}

            {/* TITLE */}
            <div className="mb-5">
                <label className="block mb-2 font-semibold">
                    Stream Title <span className="text-red-400">*</span>
                </label>
                <input
                    type="text"
                    value={state.title}
                    onChange={(e) =>
                        dispatch({
                            type: "SET",
                            payload: {
                                title: e.target.value,
                            },
                        })
                    }
                    onFocus={() => dispatch({ type: "CLEAR_ERROR", field: "title" })}
                    placeholder="What are you streaming today?"
                    maxLength={100}
                    className={`w-full px-4 py-3 rounded-lg bg-white/10 border ${state.errors.title ? "border-red-500" : "border-white/20"
                        } outline-none focus:border-cyan-400 transition`}
                />
                <div className="flex justify-between mt-1">
                    {state.errors.title ? (
                        <span className="text-red-400 text-sm">{state.errors.title}</span>
                    ) : (
                        <span></span>
                    )}
                    <span className="text-white/40 text-sm">{state.title.length}/100</span>
                </div>
            </div>

            {/* CATEGORY */}
            <div className="mb-5">
                <label className="block mb-2 font-semibold">Category</label>
                <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat}
                            type="button"
                            onClick={() => dispatch({ type: "SET", payload: { category: cat } })}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${state.category === cat
                                    ? "bg-cyan-500 text-black"
                                    : "bg-white/10 text-white/70 hover:bg-white/20"
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* COVER IMAGE */}
            <div className="mb-6">
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
                        <div className={`border-2 border-dashed rounded-lg p-8 text-center transition ${state.uploading
                                ? "border-cyan-400 bg-cyan-500/10"
                                : "border-white/20 hover:border-white/40"
                            }`}>
                            {state.uploading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-cyan-400"></div>
                                    <span className="text-cyan-400">Uploading...</span>
                                </div>
                            ) : (
                                <>
                                    <p className="text-white/60 mb-1">📷 Click to upload cover image</p>
                                    <p className="text-white/40 text-sm">or drag and drop</p>
                                </>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="relative inline-block">
                        <img
                            src={state.coverImage}
                            alt="Cover Preview"
                            className="w-full max-w-xs rounded-lg border border-white/20 object-cover"
                            style={{ aspectRatio: "16/9" }}
                        />
                        <button
                            type="button"
                            onClick={removeCover}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-sm hover:bg-red-400 transition"
                        >
                            ×
                        </button>
                    </div>
                )}

                {state.errors.coverFile && (
                    <p className="text-red-400 text-sm mt-2">{state.errors.coverFile}</p>
                )}
            </div>

            {/* GO LIVE BUTTON */}
            <button
                type="submit"
                disabled={state.loading || state.uploading || !currentUser}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${state.loading || state.uploading || !currentUser
                        ? "bg-gray-600 cursor-not-allowed opacity-60"
                        : "bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-400 hover:to-pink-500 hover:shadow-lg hover:shadow-red-500/30"
                    }`}
            >
                {state.loading ? (
                    <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Starting Stream...
                    </>
                ) : (
                    <>
                        <span className="w-3 h-3 bg-white rounded-full"></span>
                        Go Live
                    </>
                )}
            </button>

            {/* Info message */}
            {state.info && (
                <p className="mt-4 text-center text-cyan-400 font-medium">{state.info}</p>
            )}
        </form>
    );
}