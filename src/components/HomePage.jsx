import React, { useEffect, useRef, useState, Suspense, lazy, startTransition } from "react";
import { Heart, MessageCircle, Eye, LogOut, UserCircle2 } from "lucide-react";
import { toast } from "react-hot-toast";
import socket from "../api/socket";
import useSWR from "swr";
import create from "zustand";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

// Quantum/AI/analytics hooks (future-proof stubs)
const useQuantumPredictor = (input) => ({ prediction: "🚀", confidence: 1.0 });
const useRealtimeAnalytics = (event) => useEffect(() => {/* send event to analytics */ }, [event]);

function SkeletonCard() {
    return (
        <div className="bg-white/5 border-white/10 rounded-2xl shadow-lg animate-pulse p-6 my-4">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gray-700 rounded-full" />
                <div className="flex-1 h-4 bg-gray-700 rounded" />
            </div>
            <div className="w-full h-56 bg-gray-800 rounded mb-4" />
            <div className="h-4 bg-gray-700 rounded w-1/2 mb-2" />
            <div className="h-4 bg-gray-700 rounded w-1/3" />
        </div>
    );
}

// === Zustand: Global feed, presence, analytics ===
const useFeedStore = create((set, get) => ({
    posts: [],
    otherFeed: [],
    setPosts: (posts) => set({ posts }),
    setOtherFeed: (otherFeed) => set({ otherFeed }),
    presence: {},
    setPresence: (presence) => set({ presence }),
    analytics: [],
    addAnalytics: (evt) => set((state) => ({ analytics: [...state.analytics, evt] })),
    // ... All your optimistic and merge methods as before ...
}));

// SWR: Federated/multi-source fetching
const fetcher = (url) =>
    fetch(url)
        .then((res) => {
            if (!res.ok) throw new Error("Failed to fetch!");
            return res.json();
        })
        .then((data) => (Array.isArray(data.posts) ? data.posts : []));

function ErrorBoundary({ children, fallback }) {
    return (
        <React.Suspense fallback={fallback}>
            {children}
        </React.Suspense>
    );
}

// SINGULARITY UNLEASHED
export default function HomePage({ currentUser, onLike, onComment, onLogout, setCurrentPage }) {
    const feedRef = useRef(null);
    const {
        posts,
        otherFeed,
        setPosts,
        setOtherFeed,
        presence,
        setPresence,
        analytics,
        addAnalytics,
    } = useFeedStore();

    // Federated: Get from two APIs (could be more, even dynamic)
    const {
        data: feed1,
        error: error1,
        isLoading: loading1,
        mutate: refetch1,
    } = useSWR("/api/posts", fetcher, {
        refreshInterval: 10000,
        suspense: true,
        onSuccess: (data) => setPosts(data),
    });
    const {
        data: feed2,
        error: error2,
        isLoading: loading2,
        mutate: refetch2,
    } = useSWR("/api/federated", fetcher, {
        refreshInterval: 15000,
        suspense: true,
        onSuccess: (data) => setOtherFeed(data),
    });

    // Quantum prediction (demo, replace with real hook/endpoint)
    const { prediction } = useQuantumPredictor(posts);

    // SSR/Edge hydration awareness
    useEffect(() => {
        if (typeof window !== "undefined") {
            // Hydrated, can use localStorage/sessionStorage, etc.
        }
    }, []);

    // Analytics: log view for every post
    useEffect(() => {
        posts.forEach((post) => addAnalytics({ event: "view", postId: post._id, ts: Date.now() }));
        // eslint-disable-next-line
    }, [posts.length]);

    // CRDT (Yjs) collaborative feed
    const [yDoc] = useState(() => new Y.Doc());
    const [yFeed, setYFeed] = useState(null);
    const [commentText, setCommentText] = useState("");
    const [collabReady, setCollabReady] = useState(false);

    useEffect(() => {
        const provider = new WebsocketProvider("wss://demos.yjs.dev", "world-studio-feed", yDoc);
        const yArr = yDoc.getArray("posts");
        setYFeed(yArr);
        yArr.observeDeep(() => {
            const arr = yArr.toArray();
            setPosts(arr.length ? arr : posts);
            setCollabReady(true);
        });
        provider.awareness.setLocalStateField("user", {
            id: currentUser?.id,
            name: currentUser?.username,
        });
        provider.awareness.on("change", () => {
            setPresence({ ...provider.awareness.getStates() });
        });
        return () => {
            provider.destroy();
        };
        // eslint-disable-next-line
    }, []);

    // Socket.IO real-time
    useEffect(() => {
        socket.on("update_feed", (newPost) => {
            setPosts((prev) => [newPost, ...prev]);
            toast.success("🆕 New post arrived!");
            feedRef.current?.scrollTo({ top: 0, behavior: "smooth" });
        });
        socket.on("update_likes", ({ postId, likes }) => {
            setPosts((prev) => prev.map((post) => post._id === postId ? { ...post, likes } : post));
        });
        socket.on("update_comments", ({ postId, comments }) => {
            setPosts((prev) => prev.map((post) => post._id === postId ? { ...post, comments } : post));
        });
        return () => {
            socket.off("update_feed");
            socket.off("update_likes");
            socket.off("update_comments");
        };
    }, [setPosts]);

    // Optimistic Like/Comment (as in Black Hole)
    const handleLike = (postId) => {
        setPosts((prev) =>
            prev.map((post) =>
                post._id === postId
                    ? {
                        ...post,
                        likes: (post.likes || 0) + 1,
                        likedBy: [...(post.likedBy || []), currentUser?.id],
                    }
                    : post
            )
        );
        try {
            onLike?.(postId);
            if (yFeed) {
                const idx = yFeed.toArray().findIndex((p) => p._id === postId);
                if (idx > -1) {
                    const post = { ...yFeed.get(idx) };
                    post.likes = (post.likes || 0) + 1;
                    post.likedBy = [...(post.likedBy || []), currentUser?.id];
                    yFeed.delete(idx, 1);
                    yFeed.insert(idx, [post]);
                }
            }
        } catch {
            toast.error("Failed to like post!");
        }
    };

    const handleComment = (postId, text) => {
        if (!text.trim()) return;
        setPosts((prev) =>
            prev.map((post) =>
                post._id === postId
                    ? {
                        ...post,
                        comments: [
                            ...(Array.isArray(post.comments) ? post.comments : []),
                            { username: currentUser?.username || "You", text },
                        ],
                    }
                    : post
            )
        );
        setCommentText("");
        try {
            onComment?.(postId, text);
            if (yFeed) {
                const idx = yFeed.toArray().findIndex((p) => p._id === postId);
                if (idx > -1) {
                    const post = { ...yFeed.get(idx) };
                    post.comments = [
                        ...(Array.isArray(post.comments) ? post.comments : []),
                        { username: currentUser?.username || "You", text },
                    ];
                    yFeed.delete(idx, 1);
                    yFeed.insert(idx, [post]);
                }
            }
        } catch {
            toast.error("Failed to send comment!");
        }
    };

    // Merge federated feeds, deduplicate by _id
    const mergedPosts = [
        ...(Array.isArray(posts) ? posts : []),
        ...(Array.isArray(otherFeed) ? otherFeed : []),
    ].reduce((acc, post) => {
        if (!acc.some((p) => p._id === post._id)) acc.push(post);
        return acc;
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-black text-white">
            {/* Top Nav Bar */}
            <header className="flex items-center justify-between px-8 py-5 border-b border-white/10 bg-black/30 backdrop-blur-xl sticky top-0 z-50">
                <h1 className="text-2xl font-bold text-cyan-400">🌌 World-Studio SINGULARITY</h1>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setCurrentPage && setCurrentPage("live")}
                        className="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl shadow-lg hover:scale-105 transition-all"
                    >
                        🎥 Go Live
                    </button>
                    <button
                        onClick={() => setCurrentPage && setCurrentPage("profile")}
                        className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition"
                    >
                        <UserCircle2 className="w-5 h-5" />
                        Profile
                    </button>
                    <button
                        onClick={onLogout}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/40 rounded-xl hover:bg-red-500/30 transition"
                    >
                        <LogOut className="w-5 h-5" /> Logout
                    </button>
                </div>
            </header>
            {/* COLLABORATORS */}
            <div className="px-8 py-2 flex gap-2 items-center">
                {Object.values(presence || {}).map((user, i) =>
                    user.user ? (
                        <span
                            key={user.user.id || i}
                            className="inline-flex items-center px-2 py-1 rounded bg-cyan-900/70 text-cyan-200 text-xs mr-2"
                            title={user.user.name}
                        >
                            ● {user.user.name}
                        </span>
                    ) : null
                )}
                {collabReady ? null : (
                    <span className="text-white/50 text-xs">Connecting to SINGULARITY ...</span>
                )}
                <span className="ml-auto text-sm text-cyan-200">
                    🧑‍🚀 Quantum prediction: {prediction}
                </span>
            </div>
            {/* FEED */}
            <main
                className="max-w-3xl mx-auto py-10 space-y-8 px-4"
                ref={feedRef}
                tabIndex={-1}
                aria-live="polite"
            >
                <Suspense fallback={<SkeletonCard />}>
                    {(loading1 || loading2) ? (
                        <>
                            <SkeletonCard />
                            <SkeletonCard />
                            <SkeletonCard />
                        </>
                    ) : (error1 || error2) ? (
                        <div className="text-center text-red-400 py-20 space-y-3">
                            <div>
                                <span role="img" aria-label="error">⚠️</span> {error1?.message || error2?.message || "Error loading feed"}
                            </div>
                            <button
                                onClick={() => { refetch1(); refetch2(); }}
                                className="px-4 py-2 bg-cyan-600 rounded-lg font-semibold hover:shadow-lg hover:shadow-cyan-500/30 transition"
                            >
                                Retry
                            </button>
                        </div>
                    ) : mergedPosts.length === 0 ? (
                        <div className="text-center text-white/60 py-20 text-lg">
                            No posts yet. Be the first to upload something amazing! 🚀
                        </div>
                    ) : (
                        mergedPosts.map((post) => (
                            <div key={post._id || post.id} className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl overflow-hidden shadow-lg transition hover:shadow-cyan-500/20">
                                {/* HEADER */}
                                <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10">
                                    <img
                                        src={post.avatar || "/default-avatar.png"}
                                        alt="avatar"
                                        className="w-12 h-12 rounded-full object-cover border border-white/20"
                                    />
                                    <div>
                                        <h3 className="font-semibold text-white">{post.username}</h3>
                                        <p className="text-sm text-white/50">
                                            {post.timestamp ? new Date(post.timestamp).toLocaleString() : ""}
                                        </p>
                                    </div>
                                </div>
                                {/* MEDIA */}
                                <div className="bg-black flex justify-center items-center max-h-[600px]">
                                    {post.type === "image" && (
                                        <img src={post.fileUrl} alt={post.title} className="w-full object-cover" />
                                    )}
                                    {post.type === "video" && (
                                        <video src={post.fileUrl} controls className="w-full max-h-[600px] object-cover" />
                                    )}
                                    {post.type === "audio" && (
                                        <audio src={post.fileUrl} controls className="w-full p-4" />
                                    )}
                                </div>
                                {/* CAPTION */}
                                <div className="p-6 space-y-2">
                                    <h2 className="text-xl font-bold text-cyan-300">{post.title}</h2>
                                    <p className="text-white/70">{post.description}</p>
                                </div>
                                {/* ACTIONS */}
                                <div className="flex items-center justify-between px-6 pb-5">
                                    <div className="flex items-center gap-6 text-white/70">
                                        <button
                                            onClick={() => handleLike(post._id)}
                                            aria-pressed={post.likedBy?.includes(currentUser?.id) || false}
                                            className={`flex items-center gap-2 transition ${post.likedBy?.includes(currentUser?.id) ? "text-red-500" : "hover:text-red-400"}`}
                                        >
                                            <Heart
                                                className="w-6 h-6"
                                                fill={post.likedBy?.includes(currentUser?.id) ? "currentColor" : "none"}
                                            />
                                            <span>{post.likes || 0}</span>
                                        </button>
                                        <div className="flex items-center gap-2 text-white/70">
                                            <MessageCircle className="w-6 h-6" />
                                            <span>{Array.isArray(post.comments) ? post.comments.length : 0}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-white/70">
                                            <Eye className="w-6 h-6" />
                                            <span>{post.views || 0}</span>
                                        </div>
                                    </div>
                                </div>
                                {/* COMMENTS */}
                                <div className="px-6 pb-5 space-y-3">
                                    <h4 className="font-semibold text-white/80">Comments</h4>
                                    {Array.isArray(post.comments) && post.comments.length > 0 ? (
                                        <div className="space-y-2 max-h-48 overflow-y-auto">
                                            {post.comments.map((c, i) => (
                                                <div
                                                    key={i}
                                                    className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white/80"
                                                >
                                                    <span className="font-semibold">{c.username}</span>
                                                    {": "}
                                                    {c.text}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-white/50 text-sm">No comments yet</p>
                                    )}
                                    {/* Comment input */}
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="text"
                                            placeholder="Write a comment..."
                                            value={commentText}
                                            onChange={(e) => setCommentText(e.target.value)}
                                            className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:border-cyan-400"
                                            aria-label="Write a comment"
                                        />
                                        <button
                                            onClick={() => handleComment(post._id, commentText)}
                                            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg font-semibold hover:shadow-lg hover:shadow-cyan-500/30 transition"
                                            disabled={!commentText.trim()}
                                        >
                                            Send
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </Suspense>
            </main>
        </div>
    );
}
