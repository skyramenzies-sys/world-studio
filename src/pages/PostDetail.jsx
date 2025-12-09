// src/pages/PostDetail.jsx - Universum Edition 🌌
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
    ArrowLeft,
    Heart,
    MessageCircle,
    Eye,
    Share2,
    Loader2,
} from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../api/api";
import PostCard from "../components/PostCard";

export default function PostDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sharing, setSharing] = useState(false);

    // ================================
    // FETCH POST
    // ================================
    useEffect(() => {
        const fetchPost = async () => {
            if (!id) return;

            try {
                setLoading(true);
                setError(null);

                // Scroll naar boven bij nieuwe post
                if (typeof window !== "undefined") {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                }

                const response = await api.get(`/posts/${id}`);
                setPost(response.data);

                // View tracken (fire & forget)
                api.post(`/posts/${id}/view`).catch(() => { });
            } catch (err) {
                console.error("Failed to fetch post:", err);
                if (err?.response?.status === 404) {
                    setError("Post not found");
                } else {
                    setError("Failed to load post");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchPost();
    }, [id]);

    // ================================
    // HANDLERS
    // ================================
    const handleDelete = () => {
        // Verwijderen gebeurt meestal in PostCard → hier alleen UI-redirect
        toast.success("Post deleted");
        navigate("/");
    };


    const handleUpdate = (updatedPost) => {
        setPost(updatedPost);
    };

    const handleShare = useCallback(async () => {
        if (!post) return;
        setSharing(true);

        try {
            let url = `/posts/${id}`;

            if (typeof window !== "undefined") {
                const origin = window.location.origin || "";
                url = window.location.href || `${origin}/posts/${id}`;
            }

            const shareData = {
                title: post.title || "World-Studio Post",
                text:
                    post.caption ||
                    post.description ||
                    "Check out this post on World-Studio Live",
                url,
            };

            if (typeof navigator !== "undefined" && navigator.share) {
                // Web Share API (mobile / modern browsers)
                await navigator.share(shareData);
                toast.success("Shared!");
            } else if (
                typeof navigator !== "undefined" &&
                navigator.clipboard &&
                navigator.clipboard.writeText
            ) {
                await navigator.clipboard.writeText(url);
                toast.success("Link copied to clipboard");
            } else {
                // Fallback
                toast("Share this link: " + url, { icon: "🔗" });
            }
        } catch (err) {
            console.error("Share error:", err);
            toast.error("Could not share this post");
        } finally {
            setSharing(false);
        }
    }, [post, id]);

    // ================================
    // RENDER STATES
    // ================================
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
                    <p className="text-white/70">Loading post...</p>
                </div>
            </div>
        );
    }


    if (error) {
        const isNotFound = error === "Post not found";

        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
                <div className="text-center max-w-md">
                    <div className="w-24 h-24 mx-auto mb-6 bg-white/5 rounded-full flex items-center justify-center">
                        <span className="text-5xl">😢</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">
                        {isNotFound ? "Post Not Found" : "Oops!"}
                    </h1>
                    <p className="text-white/60 mb-6">
                        {isNotFound
                            ? "This post may have been deleted or doesn't exist."
                            : "Something went wrong while loading this post."}
                    </p>
                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={() => navigate(-1)}
                            className="px-6 py-3 bg-white/10 rounded-xl font-semibold hover:bg-white/20 transition"
                        >
                            Go Back
                        </button>
                        <Link
                            to="/"
                            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-semibold hover:shadow-lg transition"
                        >
                            Go Home
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // ================================
    // MAIN RENDER
    // ================================
    const likes = post?.likesCount ?? post?.likes?.length ?? 0;
    const comments = post?.commentsCount ?? post?.comments?.length ?? 0;
    const views = post?.views ?? post?.viewsCount ?? 0;

    const authorUsername =
        post?.author?.username || post?.username || post?.user?.username;
    const authorId =
        post?.author?._id || post?.userId || post?.authorId || post?.user?._id;

    return (
        <div className="min-h-screen text-white bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
            <div className="max-w-2xl mx-auto py-6 px-4">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold">Post</h1>
                        {authorUsername && (
                            <p className="text-xs text-white/50">
                                by{" "}
                                {authorId ? (
                                    <Link
                                        to={`/profile/${authorId}`}
                                        className="font-semibold text-cyan-400 hover:underline"
                                    >
                                        {authorUsername}
                                    </Link>
                                ) : (
                                    <span className="font-semibold text-white">
                                        {authorUsername}
                                    </span>
                                )}
                            </p>
                        )}
                    </div>
                    <div className="flex-1" />
                    {/* Share button in header */}
                    {post && (
                        <button
                            onClick={handleShare}
                            disabled={sharing}
                            className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-xl text-xs font-semibold hover:bg-white/20 disabled:opacity-50 transition"
                        >
                            <Share2 size={16} />
                            <span>{sharing ? "Sharing..." : "Share"}</span>
                        </button>
                    )}
                </div>

                {/* Meta bar */}
                {post && (
                    <div className="flex items-center gap-4 mb-4 text-xs text-white/60">
                        <div className="flex items-center gap-1">
                            <Heart className="w-4 h-4 text-pink-400" />
                            <span>{likes}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <MessageCircle className="w-4 h-4 text-cyan-400" />
                            <span>{comments}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Eye className="w-4 h-4 text-emerald-400" />
                            <span>{views}</span>
                        </div>
                        {post?.createdAt && (
                            <div className="ml-auto text-[11px] text-white/40">
                                {new Date(post.createdAt).toLocaleString()}
                            </div>
                        )}
                    </div>
                )}

                {/* Post */}
                {post && (
                    <PostCard
                        post={post}
                        onUpdate={handleUpdate}
                        onDelete={handleDelete}
                    />
                )}

                {/* More posts suggestion */}
                <div className="mt-8 text-center">
                    <p className="text-white/50 mb-4">Discover more content</p>
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-semibold hover:shadow-lg transition"
                    >
                        Explore Feed
                    </Link>
                </div>
            </div>
        </div>
    );
}
