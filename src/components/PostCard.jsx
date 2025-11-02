import React, { useState } from 'react';
import { Heart, MessageCircle, Share2, Eye, DollarSign } from 'lucide-react';

function PostCard({ post, currentUser, onLike, onComment, onView, onSupport }) {
    const [showComments, setShowComments] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [hasViewed, setHasViewed] = useState(false);
    const [showSupportModal, setShowSupportModal] = useState(false);
    const [supportAmount, setSupportAmount] = useState(5);

    const isLiked = post.likedBy.includes(currentUser.id);
    const isOwnPost = post.userId === currentUser.id;

    const handleView = () => {
        if (!hasViewed) {
            onView(post.id);
            setHasViewed(true);
        }
    };

    const submitComment = (e) => {
        e.preventDefault();
        if (commentText.trim()) {
            onComment(post.id, commentText);
            setCommentText('');
        }
    };

    const handleSupport = () => {
        onSupport(post.userId, supportAmount);
        setShowSupportModal(false);
        setSupportAmount(5);
    };

    return (
        <div
            className="bg-white/10 backdrop-blur-lg rounded-3xl overflow-hidden border border-white/20 hover:border-cyan-400/50 transition-all"
            onMouseEnter={handleView}
        >
            <div className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="text-3xl">{post.avatar}</div>
                    <div>
                        <div className="font-semibold">{post.username}</div>
                        <div className="text-xs text-gray-400">
                            {new Date(post.timestamp).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </div>
                    </div>
                </div>
                <Share2 className="w-5 h-5 text-gray-400 cursor-pointer hover:text-cyan-400 transition-colors" />
            </div>

            <div className="px-6 pb-4">
                <h3 className="text-xl font-bold mb-2">{post.title}</h3>
                <p className="text-gray-300 text-sm">{post.description}</p>
            </div>

            <div className="bg-gradient-to-br from-cyan-500/10 to-purple-500/10 aspect-video flex items-center justify-center border-y border-white/10">
                <div className="text-8xl">{post.thumbnail}</div>
            </div>

            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => onLike(post.id)}
                            className={`flex items-center gap-2 transition-all ${isLiked ? 'text-red-400 scale-110' : 'text-gray-400 hover:text-red-400'
                                }`}
                        >
                            <Heart className={`w-6 h-6 ${isLiked ? 'fill-current' : ''}`} />
                            <span className="font-semibold">{post.likes}</span>
                        </button>

                        <button
                            onClick={() => setShowComments(!showComments)}
                            className="flex items-center gap-2 text-gray-400 hover:text-cyan-400 transition-colors"
                        >
                            <MessageCircle className="w-6 h-6" />
                            <span className="font-semibold">{post.comments.length}</span>
                        </button>

                        <div className="flex items-center gap-2 text-gray-400">
                            <Eye className="w-6 h-6" />
                            <span className="font-semibold">{post.views}</span>
                        </div>
                    </div>

                    {!isOwnPost && (
                        <button
                            onClick={() => setShowSupportModal(true)}
                            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
                        >
                            <DollarSign className="w-4 h-4" />
                            Support Creator
                        </button>
                    )}
                </div>

                {/* Support Modal */}
                {showSupportModal && (
                    <div className="mb-4 p-4 bg-white/5 rounded-xl border border-cyan-500/30">
                        <h4 className="font-semibold mb-3">Support {post.username}</h4>
                        <div className="flex gap-2 mb-3">
                            {[5, 10, 20, 50].map(amount => (
                                <button
                                    key={amount}
                                    onClick={() => setSupportAmount(amount)}
                                    className={`px-4 py-2 rounded-lg transition-colors ${supportAmount === amount
                                            ? 'bg-cyan-500 text-white'
                                            : 'bg-white/10 hover:bg-white/20'
                                        }`}
                                >
                                    ${amount}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleSupport}
                                className="flex-1 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg font-semibold"
                            >
                                Send ${supportAmount}
                            </button>
                            <button
                                onClick={() => setShowSupportModal(false)}
                                className="px-4 py-2 bg-white/10 rounded-lg"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {showComments && (
                    <div className="mt-4 pt-4 border-t border-white/10 space-y-4">
                        {post.comments.map(comment => (
                            <div key={comment.id} className="flex gap-3">
                                <div className="text-xl">{comment.avatar}</div>
                                <div className="flex-1 bg-white/5 rounded-xl p-3">
                                    <div className="font-semibold text-sm">{comment.username}</div>
                                    <p className="text-sm text-gray-300 mt-1">{comment.text}</p>
                                </div>
                            </div>
                        ))}

                        <form onSubmit={submitComment} className="flex gap-2">
                            <input
                                type="text"
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                placeholder="Add a comment..."
                                className="flex-1 px-4 py-2 bg-white/5 border border-white/20 rounded-xl focus:outline-none focus:border-cyan-400 text-white"
                            />
                            <button
                                type="submit"
                                className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-xl font-semibold hover:opacity-90 transition-opacity"
                            >
                                Post
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}

export default PostCard;