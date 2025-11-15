// GoLiveForm.jsx
import React, { useReducer, useRef } from "react";
import axios from "axios";

const CATEGORIES = ["Music", "Gaming", "Talk", "Art", "Education", "Sports"];
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
        case "SET_FIELD":
            return { ...state, [action.field]: action.value, errors: { ...state.errors, [action.field]: "" } };
        case "SET_ERROR":
            return { ...state, errors: { ...state.errors, [action.field]: action.error } };
        case "SET_INFO":
            return { ...state, info: action.info };
        case "SET_LOADING":
            return { ...state, loading: action.loading };
        case "SET_UPLOADING":
            return { ...state, uploading: action.uploading };
        case "SET_COVER_IMAGE":
            return { ...state, coverImage: action.url, uploading: false };
        case "RESET":
            return { ...initialState, category: CATEGORIES[0] };
        default:
            return state;
    }
}

export default function GoLiveForm({ token, onLiveStarted }) {
    const [state, dispatch] = useReducer(reducer, initialState);
    const fileInputRef = useRef(null);

    function validate(fields = {}) {
        const errs = {};
        if ("title" in fields ? !fields.title : !state.title) errs.title = "Title is required.";
        if (state.coverFile && state.coverFile.size / (1024 * 1024) > MAX_FILE_SIZE_MB) {
            errs.coverFile = `Image must be ≤ ${MAX_FILE_SIZE_MB}MB.`;
        }
        return errs;
    }

    async function handleCoverUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            dispatch({ type: "SET_ERROR", field: "coverFile", error: "File must be an image." });
            return;
        }
        if (file.size / (1024 * 1024) > MAX_FILE_SIZE_MB) {
            dispatch({ type: "SET_ERROR", field: "coverFile", error: `Image must be ≤ ${MAX_FILE_SIZE_MB}MB.` });
            return;
        }

        dispatch({ type: "SET_UPLOADING", uploading: true });
        dispatch({ type: "SET_INFO", info: "Uploading cover..." });
        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await axios.post(
                process.env.REACT_APP_UPLOAD_URL || "/api/upload",
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "multipart/form-data",
                    },
                }
            );
            dispatch({ type: "SET_COVER_IMAGE", url: res.data.url });
            dispatch({ type: "SET_INFO", info: "Cover uploaded!" });
            dispatch({ type: "SET_FIELD", field: "coverFile", value: file });
        } catch (err) {
            dispatch({ type: "SET_ERROR", field: "coverFile", error: "Upload failed. Try again." });
            dispatch({ type: "SET_INFO", info: "" });
        }
    }

    async function handleGoLive(e) {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) {
            for (const field in errs) {
                dispatch({ type: "SET_ERROR", field, error: errs[field] });
            }
            return;
        }
        dispatch({ type: "SET_LOADING", loading: true });
        dispatch({ type: "SET_INFO", info: "" });
        try {
            const res = await axios.post(
                process.env.REACT_APP_LIVE_START_URL || "/api/live/start",
                {
                    title: state.title,
                    category: state.category,
                    coverImage: state.coverImage,
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            dispatch({ type: "SET_LOADING", loading: false });
            dispatch({ type: "RESET" });
            dispatch({ type: "SET_INFO", info: "You're live!" });
            if (onLiveStarted) onLiveStarted(res.data);
            if (fileInputRef.current) fileInputRef.current.value = "";
        } catch (err) {
            dispatch({ type: "SET_LOADING", loading: false });
            dispatch({
                type: "SET_INFO",
                info:
                    err.response?.data?.error && typeof err.response.data.error === "string"
                        ? `Failed to go live: ${err.response.data.error}`
                        : "Failed to go live. Please try again.",
            });
        }
    }

    return (
        <form
            className="max-w-lg mx-auto bg-white/10 rounded-xl p-6 border border-white/20 text-white"
            onSubmit={handleGoLive}
            aria-labelledby="golive-heading"
            noValidate
        >
            <h2 id="golive-heading" className="text-2xl font-bold mb-4">
                🎥 Start a Live Stream
            </h2>
            <div className="mb-4">
                <label htmlFor="title" className="block mb-1 font-semibold">
                    Title <span aria-hidden="true" className="text-red-400">*</span>
                </label>
                <input
                    id="title"
                    type="text"
                    name="title"
                    value={state.title}
                    onChange={(e) => dispatch({ type: "SET_FIELD", field: "title", value: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 outline-none ${state.errors.title ? "border-red-500" : ""}`}
                    aria-invalid={!!state.errors.title}
                    aria-describedby={state.errors.title ? "title-error" : undefined}
                    required
                />
                {state.errors.title && (
                    <div id="title-error" className="text-red-300 mt-1 text-sm">
                        {state.errors.title}
                    </div>
                )}
            </div>
            <div className="mb-4">
                <label htmlFor="category" className="block mb-1 font-semibold">
                    Category
                </label>
                <select
                    id="category"
                    name="category"
                    value={state.category}
                    onChange={(e) => dispatch({ type: "SET_FIELD", field: "category", value: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 outline-none"
                >
                    {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                            {cat}
                        </option>
                    ))}
                </select>
            </div>
            <div className="mb-4">
                <label htmlFor="coverImage" className="block mb-1 font-semibold">
                    Cover Image <span className="text-gray-400 font-normal">(optional, max {MAX_FILE_SIZE_MB}MB)</span>
                </label>
                <input
                    id="coverImage"
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleCoverUpload}
                    disabled={state.uploading}
                    aria-describedby={state.errors.coverFile ? "cover-error" : undefined}
                />
                {state.uploading && (
                    <div className="text-cyan-200 mt-1 text-sm">Uploading...</div>
                )}
                {state.errors.coverFile && (
                    <div id="cover-error" className="text-red-300 mt-1 text-sm">
                        {state.errors.coverFile}
                    </div>
                )}
                {state.coverImage && (
                    <img
                        src={state.coverImage}
                        alt="Cover Preview"
                        className="mt-2 w-40 rounded-lg border border-white/30"
                        style={{ objectFit: "cover", aspectRatio: "16/9" }}
                    />
                )}
            </div>
            <button
                type="submit"
                disabled={state.loading || state.uploading}
                className={`w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-semibold hover:shadow-lg hover:shadow-cyan-500/30 transition-all ${state.loading || state.uploading ? "opacity-60 cursor-not-allowed" : ""
                    }`}
                aria-busy={state.loading}
            >
                {state.loading ? "Starting..." : "Go Live"}
            </button>
            <div aria-live="polite" className="mt-3 min-h-[1.5em] text-yellow-200">
                {state.info}
            </div>
        </form>
    );
}