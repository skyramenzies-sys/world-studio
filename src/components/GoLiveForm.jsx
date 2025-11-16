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
        case "SET":
            return { ...state, ...action.payload };
        case "ERROR":
            return {
                ...state,
                errors: { ...state.errors, [action.field]: action.error },
            };
        case "RESET":
            return { ...initialState, category: CATEGORIES[0] };
        default:
            return state;
    }
}

export default function GoLiveForm({ token, onLiveStarted }) {
    const [state, dispatch] = useReducer(reducer, initialState);
    const fileRef = useRef(null);

    /* -----------------------------
       VALIDATION
    ------------------------------ */
    function validate() {
        const errors = {};
        if (!state.title.trim()) errors.title = "Title is required.";
        if (state.coverFile && state.coverFile.size / 1024 / 1024 > MAX_FILE_SIZE_MB) {
            errors.coverFile = `Image must be ≤ ${MAX_FILE_SIZE_MB}MB.`;
        }
        return errors;
    }

    /* -----------------------------
       COVER UPLOAD
    ------------------------------ */
    async function handleCoverUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            return dispatch({
                type: "ERROR",
                field: "coverFile",
                error: "File must be an image.",
            });
        }

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

            dispatch({
                type: "SET",
                payload: {
                    coverFile: file,
                    coverImage: res.data.url,
                    uploading: false,
                    info: "Cover uploaded!",
                },
            });
        } catch {
            dispatch({
                type: "ERROR",
                field: "coverFile",
                error: "Upload failed. Try again.",
            });
            dispatch({ type: "SET", payload: { uploading: false, info: "" } });
        }
    }

    /* -----------------------------
       GO LIVE
    ------------------------------ */
    async function handleGoLive(e) {
        e.preventDefault();

        const errors = validate();
        if (Object.keys(errors).length) {
            Object.entries(errors).forEach(([field, error]) =>
                dispatch({ type: "ERROR", field, error })
            );
            return;
        }

        dispatch({ type: "SET", payload: { loading: true, info: "" } });

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

            dispatch({ type: "SET", payload: { loading: false, info: "You're live!" } });
            dispatch({ type: "RESET" });

            if (fileRef.current) fileRef.current.value = "";

            if (onLiveStarted) onLiveStarted(res.data);
        } catch (err) {
            const msg =
                err.response?.data?.error && typeof err.response.data.error === "string"
                    ? err.response.data.error
                    : "Failed to go live. Please try again.";

            dispatch({
                type: "SET",
                payload: { loading: false, info: `Failed to go live: ${msg}` },
            });
        }
    }

    /* -----------------------------
       RENDER
    ------------------------------ */
    return (
        <form
            onSubmit={handleGoLive}
            className="max-w-lg mx-auto bg-white/10 rounded-xl p-6 border border-white/20 text-white"
            noValidate
        >
            <h2 className="text-2xl font-bold mb-4">🎥 Start a Live Stream</h2>

            {/* TITLE */}
            <div className="mb-4">
                <label className="block mb-1 font-semibold">
                    Title <span className="text-red-400">*</span>
                </label>
                <input
                    type="text"
                    value={state.title}
                    onChange={(e) =>
                        dispatch({
                            type: "SET",
                            payload: {
                                title: e.target.value,
                                errors: { ...state.errors, title: "" },
                            },
                        })
                    }
                    className={`w-full px-3 py-2 rounded-lg bg-white/10 border ${state.errors.title ? "border-red-500" : "border-white/20"
                        } outline-none`}
                />
                {state.errors.title && (
                    <div className="text-red-300 text-sm mt-1">{state.errors.title}</div>
                )}
            </div>

            {/* CATEGORY */}
            <div className="mb-4">
                <label className="block mb-1 font-semibold">Category</label>
                <select
                    value={state.category}
                    onChange={(e) =>
                        dispatch({ type: "SET", payload: { category: e.target.value } })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 outline-none"
                >
                    {CATEGORIES.map((cat) => (
                        <option key={cat}>{cat}</option>
                    ))}
                </select>
            </div>

            {/* COVER IMAGE */}
            <div className="mb-4">
                <label className="block mb-1 font-semibold">
                    Cover Image{" "}
                    <span className="text-gray-400">(optional, max {MAX_FILE_SIZE_MB}MB)</span>
                </label>

                <input
                    type="file"
                    ref={fileRef}
                    accept="image/*"
                    disabled={state.uploading}
                    onChange={handleCoverUpload}
                />

                {state.uploading && (
                    <div className="text-cyan-200 mt-1 text-sm">Uploading...</div>
                )}

                {state.errors.coverFile && (
                    <div className="text-red-300 text-sm mt-1">
                        {state.errors.coverFile}
                    </div>
                )}

                {state.coverImage && (
                    <img
                        src={state.coverImage}
                        alt="Cover Preview"
                        className="mt-3 w-40 rounded-lg border border-white/20"
                        style={{
                            objectFit: "cover",
                            aspectRatio: "16/9",
                        }}
                    />
                )}
            </div>

            {/* BUTTON */}
            <button
                type="submit"
                disabled={state.loading || state.uploading}
                className={`w-full py-3 rounded-xl font-semibold bg-gradient-to-r 
                    from-cyan-500 to-blue-600 
                    hover:shadow-lg hover:shadow-cyan-500/30 transition-all
                    ${state.loading || state.uploading ? "opacity-60 cursor-not-allowed" : ""}
                `}
            >
                {state.loading ? "Starting..." : "Go Live"}
            </button>

            {/* INFO */}
            <div className="mt-3 text-yellow-200 min-h-[1.5em]">{state.info}</div>
        </form>
    );
}
