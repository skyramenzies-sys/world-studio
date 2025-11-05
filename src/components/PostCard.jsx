import React, { useEffect } from "react";
import { Heart, MessageCircle, Eye, DollarSign, Share2 } from "lucide-react";

function PostCard({
    post,
    currentUser,
    users,
    onLike,
    onComment,
    onSupport,
    onPurchase,
    onFollow,
    onUnfollow,
    incrementViews,
}) {
    // 🔥 Views tellen zodra post zichtbaar wordt
    useEffect(() => {
        incrementViews(post.id);
    }, [post.id, incrementViews]);

    const postCreator = users?.find((u) => u.id === post.userId);

    return (
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 overflow-hidden hover:border-white/30 transition-all">
            <div className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="text-3xl">{postCreator?.avatar || "👤"}</div>
                    <div>
                        <h3 className="font-bold text-white">{post.username}</h3>
                        <p className="text-white/60 text-sm">
                            {postCreator?.followers?.length || 0} followers
                        </p>
                    </div>
                </div>
            </div>

            <div className="px-6 pb-4">
                <h2 className="text-2xl font-bold text-white mb-2">{post.title}</h2>
                <p className="text-white/80 mb-4">{post.description}</p>
            </div>

            <div className="bg-gray-900 rounded-2xl shadow-xl overflow-hidden hover:shadow-sky-500/30 transition">
                <img
                    src={imageUrl}
                    alt={post.title}
                    className="w-full max-h-[600px] object-cover"
                />
            </div>

            <div className="p-6 flex items-center gap-6">
                <button
                    onClick={() => onLike(post.id)}
                    className={`flex items-center gap-2 transition-all ${post.likedBy?.includes(currentUser?.id)
                        ? "text-red-500"
                        : "text-white/60 hover:text-red-500"
                        }`}
                >
                    <Heart
                        className="w-6 h-6"
                        fill={post.likedBy?.includes(currentUser?.id) ? "currentColor" : "none"}
                    />
                    <span className="font-semibold">{post.likes || 0}</span>
                </button>

                <div className="flex items-center gap-2 text-white/60">
                    <MessageCircle className="w-6 h-6" />
                    <span className="font-semibold">{post.comments?.length || 0}</span>
                </div>

                <div className="flex items-center gap-2 text-white/60">
                    <Eye className="w-6 h-6" />
                    <span className="font-semibold">{post.views || 0}</span>
                </div>

                <button className="flex items-center gap-2 text-white/60 hover:text-white transition-colors ml-auto">
                    <Share2 className="w-6 h-6" />
                </button>

                <button
                    onClick={() => onSupport(post.userId, 5)}
                    className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all flex items-center gap-2"
                >
                    <DollarSign className="w-4 h-4" />
                    Support
                </button>
            </div>
        </div>
    );
}

export default PostCard;
