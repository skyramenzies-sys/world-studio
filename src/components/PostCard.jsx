import React from "react";
import { Heart, Eye, MessageCircle } from "lucide-react";
import API from "../api/api";
import socket from "../api/socket";

export default function PostCard({ post, currentUser }) {
    const handleLike = async () => {
        const res = await API.create({}); // placeholder
        socket.emit("likePost", {
            postId: post._id,
            username: currentUser?.username,
            postTitle: post.title,
            likes: post.likes + 1,
        });
    };

    return (
        <div className="bg-white/10 border border-white/10 rounded-2xl overflow-hidden hover:border-white/30 transition">
            <div className="p-4 flex items-center gap-3">
                <img
                    src={post.avatar || "/default-avatar.png"}
                    alt="avatar"
                    className="w-10 h-10 rounded-full object-cover"
                />
                <h3 className="font-semibold text-white">{post.username}</h3>
            </div>

            <div className="px-4 text-white/80">{post.description}</div>

            {post.type === "image" && (
                <img src={post.fileUrl} alt="" className="w-full" />
            )}
            {post.type === "video" && (
                <video src={post.fileUrl} controls className="w-full" />
            )}

            <div className="flex justify-between items-center p-4 text-white/70 text-sm">
                <button onClick={handleLike} className="flex items-center gap-1">
                    <Heart className="w-4 h-4 text-red-400" /> {post.likes}
                </button>
                <div className="flex items-center gap-1">
                    <MessageCircle className="w-4 h-4" /> {post.comments?.length}
                </div>
                <div className="flex items-center gap-1">
                    <Eye className="w-4 h-4" /> {post.views}
                </div>
            </div>
        </div>
    );
}
