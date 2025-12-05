// src/pages/PostDetail.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Heart, MessageCircle, Eye, Share2, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../api/api";
import PostCard from "../components/PostCard";

export default function PostDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPost = async () => {
            try {
                setLoading(true);
                setError(null);

                const response = await api.get(`/posts/${id}`);
                setPost(response.data);

                // Track view
                api.post(`/posts/${id}/view`).catch(() => { });
            } catch (err) {
                console.error("Failed to fetch post:", err);
                if (err.response?.status === 404) {
                    setError("Post not found");
                } else {
                    setError("Failed to load post");
                }
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchPost();
        }
    }, [id]);

    // Handle post delete
    const handleDelete = () => {
        toast.success("Post deleted");
        navigate("/");
    };

    // Handle post update
    const handleUpdate = (updatedPost) => {
        setPost(updatedPost);
    };

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
                    <p className="text-white/70">Loading post...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <div className="w-24 h-24 mx-auto mb-6 bg-white/5 rounded-full flex items-center justify-center">
                        <span className="text-5xl">😢</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">
                        {error === "Post not found" ? "Post Not Found" : "Oops!"}
                    </h1>
                    <p className="text-white/60 mb-6">
                        {error === "Post not found"
                            ? "This post may have been deleted or doesn't exist."
                            : "Something went wrong while loading this post."
                        }
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

    // Post found
    return (
        <div className="min-h-screen text-white">
            <div className="max-w-2xl mx-auto py-6 px-4">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="text-xl font-bold">Post</h1>
                </div>

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