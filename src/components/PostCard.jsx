import React, { useState, useEffect } from "react";
import { Heart, Eye, MessageCircle } from "lucide-react";
import API from "../api/api";
import socket from "../api/socket";

export default function PostCard({ post, currentUser }) {
    const [likeLoading, setLikeLoading] = useState(false);
    const [likes, setLikes] = useState(post.likes || 0);

    // Detecteer of user al geliked heeft (van backend)
    const [hasLiked, setHasLiked] = useState(
        Array.isArray(post.likedBy) && currentUser
            ? post.likedBy.includes(currentUser.id)
            : false
    );

    // Sync likes via realtime socket
    useEffect(() => {
        const handleUpdate = ({ postId, likes }) => {
            if (postId === post._id) {
                setLikes(likes);
            }
        };

        socket.on("update_likes", handleUpdate);
        return () => socket.off("update_likes", handleUpdate);
    }, [post._id]);

    // -----------------------------------
    // LIKE HANDLER (Optimistic + Secure)
    // -----------------------------------
    const handleLike = async () => {
        if (!currentUser || likeLoading || hasLiked) return;

        setLikeLoading(true);
        setLikes((prev) => prev + 1); // Optimistic UI
        setHasLiked(true);

        try {
            await API.likePost(post._id);

            socket.emit("likePost", {
                postId: post._id,
                username: currentUser?.username,
                postTitle: post.title,
                likes: likes + 1,
            });
        } catch (err) {
            // Rollback UI on failure
            setLikes((prev) => prev - 1);
            setHasLiked(false);
        }

        setLikeLoading(false);
    };

    // -----------------------------------
    // RENDER
    // -----------------------------------
    return (
        <div className="bg-white/10 border border-white/10 rounded-2xl overflow-hidden hover:border-white/30 transition">

            {/* Header */}
            <div className="p-4 flex items-center gap-3">
                <img
                    src={post.avatar || "/default-avatar.png"}
                    alt={`${post.username || "User"} avatar`}
                    className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                    <h3 className="font-semibold text-white">{post.username}</h3>
                    <p className="text-xs text-white/50">{post.title}</p>
                </div>
            </div>

            {/* Description */}
            {post.description && (
                <div className="px-4 text-white/80 pb-3">{post.description}</div>
            )}

            {/* Media */}
            {post.type === "image" && post.fileUrl && (
                <img
                    src={post.fileUrl}
                    alt={post.title || "Post image"}
                    className="w-full object-cover max-h-96"
                    loading="lazy"
                />
            )}

            {post.type === "video" && post.fileUrl && (
                <video
                    src={post.fileUrl}
                    controls
                    className="w-full max-h-96"
                    poster={post.thumbnail}
                />
            )}

            {/* Footer stats */}
            <div className="flex justify-between items-center p-4 text-white/70 text-sm">

                {/* LIKE BUTTON */}
                <button
                    onClick={handleLike}
                    disabled={likeLoading || hasLiked}
                    className={`flex items-center gap-1 transition ${hasLiked
                            ? "text-red-400 cursor-not-allowed"
                            : "hover:text-red-400"
                        }`}
                >
                    <Heart
                        className={`w-4 h-4 ${hasLiked ? "fill-red-400 text-red-400" : "text-red-400"
                            }`}
                    />
                    {likes}
                </button>

                {/* COMMENTS COUNT */}
                <div className="flex items-center gap-1">
                    <MessageCircle className="w-4 h-4" />
                    {Array.isArray(post.comments) ? post.comments.length : 0} Comments
                </div>

                {/* VIEWS */}
                <div className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {post.views || 0}
                </div>
            </div>
        </div>
    );
}
