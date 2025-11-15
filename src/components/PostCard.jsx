import React, { useState } from "react";
import { Heart, Eye, MessageCircle } from "lucide-react";
import API from "../api/api";
import socket from "../api/socket";

export default function PostCard({ post, currentUser }) {
    const [likeLoading, setLikeLoading] = useState(false);
    const [likes, setLikes] = useState(post.likes || 0);
    const [hasLiked, setHasLiked] = useState(false); // Optionally track if user has liked

    const handleLike = async () => {
        if (likeLoading || hasLiked) return;
        setLikeLoading(true);
        setLikes(likes + 1); // Optimistic UI
        setHasLiked(true);
        try {
            // Replace with your real API call:
            await API.likePost(post._id);
            socket.emit("likePost", {
                postId: post._id,
                username: currentUser?.username,
                postTitle: post.title,
                likes: likes + 1,
            });
        } catch (err) {
            setLikes(likes); // Rollback UI
            setHasLiked(false);
            // Optionally show an error toast/message
        }
        setLikeLoading(false);
    };

    return (
        <div className="bg-white/10 border border-white/10 rounded-2xl overflow-hidden hover:border-white/30 transition">
            <div className="p-4 flex items-center gap-3">
                <img
                    src={post.avatar || "/default-avatar.png"}
                    alt={`${post.username || "User"}'s avatar`}
                    className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                    <h3 className="font-semibold text-white">{post.username}</h3>
                    {post.title && (
                        <div className="text-xs text-white/50">{post.title}</div>
                    )}
                </div>
            </div>

            <div className="px-4 text-white/80">{post.description}</div>

            {post.type === "image" && post.fileUrl && (
                <img
                    src={post.fileUrl}
                    alt={post.title || post.description || "Post image"}
                    className="w-full object-cover max-h-96"
                    loading="lazy"
                />
            )}
            {post.type === "video" && post.fileUrl && (
                <video
                    src={post.fileUrl}
                    controls
                    className="w-full max-h-96"
                    poster={post.thumbnail || ""}
                >
                    Sorry, your browser doesn't support embedded videos.
                </video>
            )}

            <div className="flex justify-between items-center p-4 text-white/70 text-sm">
                <button
                    onClick={handleLike}
                    className={`flex items-center gap-1 transition ${likeLoading || hasLiked
                        ? "opacity-60 cursor-not-allowed"
                        : "hover:text-red-400"
                        }`}
                    disabled={likeLoading || hasLiked}
                    aria-label="Like this post"
                >
                    <Heart
                        className={`w-4 h-4 ${hasLiked ? "fill-red-400 text-red-400" : "text-red-400"
                            }`}
                    />{" "}
                    {likes}
                </button>
                <div className="flex items-center gap-1" aria-label="Comments">
                    <MessageCircle className="w-4 h-4" /> {(post?.comments || []).length} Comments
                </div>
                <div className="flex items-center gap-1" aria-label="Views">
                    <Eye className="w-4 h-4" /> {post.views || 0}
                </div>
            </div>
        </div>
    );
}