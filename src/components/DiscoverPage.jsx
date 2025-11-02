import React, { useState } from 'react';
import { Heart, MessageCircle, Eye, DollarSign, Share2, Search, Filter, TrendingUp, Lock, ShoppingCart } from 'lucide-react';
import NavigationBar from './NavigationBar';
import ShareModal from './ShareModal';

function DiscoverPage({ currentUser, currentPage, setCurrentPage, posts, users, onLike, onComment, onView, onSupport, onPurchase, onFollow, onUnfollow, onLogout }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [sortBy, setSortBy] = useState('recent');
    const [commentInputs, setCommentInputs] = useState({});
    const [expandedComments, setExpandedComments] = useState({});
    const [supportModal, setSupportModal] = useState({ show: false, postId: null, creatorId: null });
    const [supportAmount, setSupportAmount] = useState(5);
    const [shareModal, setShareModal] = useState({ show: false, post: null });

    const categories = [
        { id: 'all', name: 'All', emoji: '🌍' },
        { id: 'art', name: 'Art', emoji: '🎨' },
        { id: 'photography', name: 'Photography', emoji: '📸' },
        { id: 'video', name: 'Video', emoji: '🎬' },
        { id: 'music', name: 'Music', emoji: '🎵' },
        { id: 'design', name: 'Design', emoji: '✨' },
        { id: 'animation', name: 'Animation', emoji: '🎭' },
        { id: 'other', name: 'Other', emoji: '📦' }
    ];

    const openShareModal = (post) => {
        setShareModal({ show: true, post });
    };

    const closeShareModal = () => {
        setShareModal({ show: false, post: null });
    };

    const handleCommentChange = (postId, value) => {
        setCommentInputs({ ...commentInputs, [postId]: value });
    };

    const handleCommentSubmit = (postId) => {
        const comment = commentInputs[postId];
        if (comment && comment.trim()) {
            onComment(postId, comment);
            setCommentInputs({ ...commentInputs, [postId]: '' });
        }
    };

    const toggleComments = (postId) => {
        setExpandedComments({
            ...expandedComments,
            [postId]: !expandedComments[postId]
        });
    };

    const handleViewIncrement = (postId) => {
        onView(postId);
    };

    const openSupportModal = (postId, creatorId) => {
        setSupportModal({ show: true, postId, creatorId });
        setSupportAmount(5);
    };

    const closeSupportModal = () => {
        setSupportModal({ show: false, postId: null, creatorId: null });
        setSupportAmount(5);
    };

    const handleSendSupport = () => {
        if (supportAmount > 0 && supportModal.creatorId) {
            onSupport(supportModal.creatorId, supportAmount);
            closeSupportModal();
        }
    };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    const getCategoryEmoji = (category) => {
        const cat = categories.find(c => c.id === category);
        return cat ? cat.emoji : '📦';
    };

    // Filter and sort posts
    let filteredPosts = [...posts];

    // Filter by search
    if (searchQuery) {
        filteredPosts = filteredPosts.filter(post =>
            post.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            post.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            post.username?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
        filteredPosts = filteredPosts.filter(post => post.category === selectedCategory);
    }

    // Sort posts
    switch (sortBy) {
        case 'popular':
            filteredPosts.sort((a, b) => (b.likes || 0) - (a.likes || 0));
            break;
        case 'views':
            filteredPosts.sort((a, b) => (b.views || 0) - (a.views || 0));
            break;
        case 'recent':
        default:
            filteredPosts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            break;
    }

    // Top creators
    const topCreators = users
        .filter(user => user.id !== currentUser?.id)
        .sort((a, b) => (b.totalLikes || 0) - (a.totalLikes || 0))
        .slice(0, 5);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <NavigationBar
                currentUser={currentUser}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                onLogout={onLogout}
            />

            <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Header */}
                        <div className="text-center mb-8">
                            <h1 className="text-4xl font-bold text-white mb-2 flex items-center justify-center gap-3">
                                <TrendingUp className="w-10 h-10" />
                                Discover
                            </h1>
                            <p className="text-white/60">Explore amazing content from creators worldwide</p>
                        </div>

                        {/* Search and Filters */}
                        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20">
                            {/* Search */}
                            <div className="relative mb-4">
                                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search posts, creators..."
                                    className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                                />
                            </div>

                            {/* Categories */}
                            <div className="flex flex-wrap gap-2 mb-4">
                                {categories.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSelectedCategory(cat.id)}
                                        className={`px-4 py-2 rounded-xl font-medium transition-all ${selectedCategory === cat.id
                                                ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
                                                : 'bg-white/5 text-white/60 hover:bg-white/10'
                                            }`}
                                    >
                                        <span className="mr-2">{cat.emoji}</span>
                                        {cat.name}
                                    </button>
                                ))}
                            </div>

                            {/* Sort */}
                            <div className="flex items-center gap-2">
                                <Filter className="w-5 h-5 text-white/60" />
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="flex-1 px-4 py-2 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                                >
                                    <option value="recent">Most Recent</option>
                                    <option value="popular">Most Popular</option>
                                    <option value="views">Most Viewed</option>
                                </select>
                            </div>
                        </div>

                        {/* Posts */}
                        <div className="space-y-6">
                            {filteredPosts.length === 0 ? (
                                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-12 border border-white/20 text-center">
                                    <div className="text-6xl mb-4">🔍</div>
                                    <h3 className="text-2xl font-bold text-white mb-2">No posts found</h3>
                                    <p className="text-white/60">Try different filters or search terms</p>
                                </div>
                            ) : (
                                filteredPosts.map(post => (
                                    <div
                                        key={post.id}
                                        className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 overflow-hidden hover:border-white/30 transition-all"
                                    >
                                        {/* Post Header */}
                                        <div className="p-6 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="text-3xl">{post.avatar}</div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-bold text-white">{post.username}</h3>
                                                        <span className="text-sm text-white/60">•</span>
                                                        <span className="text-sm text-white/60">{formatTime(post.timestamp)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm text-white/60">
                                                        <span>{getCategoryEmoji(post.category)}</span>
                                                        <span className="capitalize">{post.category}</span>
                                                        {(() => {
                                                            const postCreator = users?.find(u => u.id === post.userId);
                                                            if (postCreator) {
                                                                return (
                                                                    <>
                                                                        <span>•</span>
                                                                        <span>{(postCreator.followers || []).length} followers</span>
                                                                    </>
                                                                );
                                                            }
                                                        })()}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {/* Follow Button */}
                                                {post.userId !== currentUser?.id && (() => {
                                                    const isFollowing = (currentUser?.following || []).includes(post.userId);
                                                    return isFollowing ? (
                                                        <button
                                                            onClick={() => onUnfollow(post.userId)}
                                                            className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl font-semibold transition-all flex items-center gap-2"
                                                        >
                                                            <span>✓</span>
                                                            <span>Following</span>
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => onFollow(post.userId)}
                                                            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white rounded-xl font-semibold transition-all flex items-center gap-2 shadow-lg"
                                                        >
                                                            <span>+</span>
                                                            <span>Follow</span>
                                                        </button>
                                                    );
                                                })()}
                                            </div>
                                        </div>

                                        {/* Post Content */}
                                        <div className="px-6 pb-4">
                                            <h2 className="text-2xl font-bold text-white mb-2">{post.title}</h2>
                                            {post.description && (
                                                <p className="text-white/80 mb-4">{post.description}</p>
                                            )}
                                        </div>

                                        {/* ✅ ECHTE MEDIA CONTENT MET ACCESS CONTROL */}
                                        <div className="bg-black/50 relative">
                                            {(() => {
                                                const isOwner = post.userId === currentUser?.id;
                                                const isFree = post.isFree !== false;
                                                const hasPurchased = post.purchasedBy?.includes(currentUser?.id);
                                                const hasAccess = isOwner || isFree || hasPurchased;

                                                return (
                                                    <>
                                                        <div
                                                            className={`${!hasAccess ? 'filter blur-xl pointer-events-none select-none' : ''}`}
                                                            onClick={() => hasAccess && handleViewIncrement(post.id)}
                                                        >
                                                            {post.type === 'image' && post.fileUrl && (
                                                                <img
                                                                    src={post.fileUrl}
                                                                    alt={post.title}
                                                                    className="w-full h-auto max-h-[600px] object-contain cursor-pointer"
                                                                    loading="lazy"
                                                                />
                                                            )}
                                                            {post.type === 'video' && post.fileUrl && (
                                                                <video
                                                                    src={post.fileUrl}
                                                                    controls={hasAccess}
                                                                    className="w-full h-auto max-h-[600px]"
                                                                    onPlay={() => hasAccess && handleViewIncrement(post.id)}
                                                                />
                                                            )}
                                                            {post.type === 'audio' && post.fileUrl && (
                                                                <div className="p-12 text-center">
                                                                    <div className="text-6xl mb-4">🎵</div>
                                                                    <audio
                                                                        src={post.fileUrl}
                                                                        controls={hasAccess}
                                                                        className="w-full max-w-md mx-auto"
                                                                        onPlay={() => hasAccess && handleViewIncrement(post.id)}
                                                                    />
                                                                </div>
                                                            )}
                                                            {!post.fileUrl && (
                                                                <div className="p-12 text-center">
                                                                    <div className="text-6xl mb-4">{post.thumbnail || '📦'}</div>
                                                                    <p className="text-white/60">Content preview not available</p>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* 🔒 LOCKED OVERLAY */}
                                                        {!hasAccess && !isFree && (
                                                            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900/95 to-purple-900/95 backdrop-blur-sm">
                                                                <div className="text-center p-8 max-w-md">
                                                                    <div className="mb-6">
                                                                        <div className="inline-block p-6 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-full border-4 border-yellow-500/50">
                                                                            <Lock className="w-16 h-16 text-yellow-400" />
                                                                        </div>
                                                                    </div>

                                                                    {post.isPremium && (
                                                                        <div className="mb-4">
                                                                            <span className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-white text-sm font-bold">
                                                                                ⭐ PREMIUM CONTENT
                                                                            </span>
                                                                        </div>
                                                                    )}

                                                                    <div className="mb-6">
                                                                        <div className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400 mb-2">
                                                                            ${post.price}
                                                                        </div>
                                                                        <p className="text-white/60">One-time purchase</p>
                                                                    </div>

                                                                    <p className="text-white/80 mb-6">
                                                                        Purchase to unlock this exclusive content!
                                                                    </p>

                                                                    <button
                                                                        onClick={() => onPurchase(post.id)}
                                                                        className="w-full px-8 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white rounded-xl font-bold text-lg transition-all transform hover:scale-105 flex items-center justify-center gap-3 shadow-lg shadow-yellow-500/50"
                                                                    >
                                                                        <ShoppingCart className="w-6 h-6" />
                                                                        Buy Now for ${post.price}
                                                                    </button>

                                                                    <div className="mt-4 text-sm text-white/60">
                                                                        <p>✓ Instant access</p>
                                                                        <p>✓ Creator earns ${(post.price * 0.9).toFixed(2)}</p>
                                                                        <p>✓ Lifetime access</p>
                                                                    </div>

                                                                    {post.sales > 0 && (
                                                                        <div className="mt-4 text-green-400 text-sm font-semibold">
                                                                            🔥 {post.sales} purchased!
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* ✅ OWNED BADGE */}
                                                        {!isOwner && hasPurchased && (
                                                            <div className="absolute top-4 right-4 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full text-white font-bold text-sm shadow-lg flex items-center gap-2">
                                                                <span>✓</span>
                                                                <span>You Own This</span>
                                                            </div>
                                                        )}

                                                        {/* 💰 PRICE BADGE */}
                                                        {!isFree && !isOwner && (
                                                            <div className="absolute top-4 left-4 px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full text-white font-bold text-sm shadow-lg flex items-center gap-2">
                                                                <DollarSign className="w-4 h-4" />
                                                                <span>${post.price}</span>
                                                            </div>
                                                        )}

                                                        {/* 🆓 FREE BADGE */}
                                                        {isFree && (
                                                            <div className="absolute top-4 left-4 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full text-white font-bold text-sm shadow-lg">
                                                                🆓 FREE
                                                            </div>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </div>

                                        {/* Post Actions */}
                                        <div className="p-6">
                                            <div className="flex items-center gap-6 mb-4">
                                                <button
                                                    onClick={() => onLike(post.id)}
                                                    className={`flex items-center gap-2 transition-all ${post.likedBy?.includes(currentUser?.id)
                                                            ? 'text-red-500'
                                                            : 'text-white/60 hover:text-red-500'
                                                        }`}
                                                >
                                                    <Heart
                                                        className="w-6 h-6"
                                                        fill={post.likedBy?.includes(currentUser?.id) ? 'currentColor' : 'none'}
                                                    />
                                                    <span className="font-semibold">{post.likes || 0}</span>
                                                </button>

                                                <button
                                                    onClick={() => toggleComments(post.id)}
                                                    className="flex items-center gap-2 text-white/60 hover:text-cyan-400 transition-colors"
                                                >
                                                    <MessageCircle className="w-6 h-6" />
                                                    <span className="font-semibold">{post.comments?.length || 0}</span>
                                                </button>

                                                <div className="flex items-center gap-2 text-white/60">
                                                    <Eye className="w-6 h-6" />
                                                    <span className="font-semibold">{post.views || 0}</span>
                                                </div>

                                                <button
                                                    onClick={() => openShareModal(post)}
                                                    className="flex items-center gap-2 text-white/60 hover:text-white transition-colors ml-auto"
                                                >
                                                    <Share2 className="w-6 h-6" />
                                                </button>

                                                {post.userId !== currentUser?.id && (
                                                    <button
                                                        onClick={() => openSupportModal(post.id, post.userId)}
                                                        className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all flex items-center gap-2"
                                                    >
                                                        <DollarSign className="w-4 h-4" />
                                                        Support
                                                    </button>
                                                )}
                                            </div>

                                            {/* Comments Section */}
                                            {expandedComments[post.id] && (
                                                <div className="mt-4 pt-4 border-t border-white/10">
                                                    <div className="flex gap-3 mb-4">
                                                        <div className="text-2xl">{currentUser?.avatar}</div>
                                                        <div className="flex-1 flex gap-2">
                                                            <input
                                                                type="text"
                                                                value={commentInputs[post.id] || ''}
                                                                onChange={(e) => handleCommentChange(post.id, e.target.value)}
                                                                onKeyPress={(e) => {
                                                                    if (e.key === 'Enter') handleCommentSubmit(post.id);
                                                                }}
                                                                placeholder="Write a comment..."
                                                                className="flex-1 px-4 py-2 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                                                            />
                                                            <button
                                                                onClick={() => handleCommentSubmit(post.id)}
                                                                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-xl transition-colors"
                                                            >
                                                                <MessageCircle className="w-5 h-5 text-white" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-3 max-h-80 overflow-y-auto">
                                                        {post.comments && post.comments.length > 0 ? (
                                                            post.comments.map(comment => (
                                                                <div key={comment.id} className="flex gap-3 p-3 bg-white/5 rounded-xl">
                                                                    <div className="text-xl">{comment.avatar}</div>
                                                                    <div className="flex-1">
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <span className="font-semibold text-white text-sm">
                                                                                {comment.username}
                                                                            </span>
                                                                            <span className="text-xs text-white/40">
                                                                                {formatTime(comment.timestamp)}
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-white/80 text-sm">{comment.text}</p>
                                                                    </div>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <p className="text-white/40 text-center py-4">
                                                                No comments yet. Be the first to comment!
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Top Creators */}
                        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 sticky top-24">
                            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5" />
                                Top Creators
                            </h3>
                            <div className="space-y-3">
                                {topCreators.map(creator => (
                                    <div key={creator.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                                        <div className="text-2xl">{creator.avatar}</div>
                                        <div className="flex-1">
                                            <div className="font-semibold text-white text-sm">{creator.username}</div>
                                            <div className="text-xs text-white/60">{creator.totalLikes || 0} likes</div>
                                        </div>
                                    </div>
                                ))}
                                {topCreators.length === 0 && (
                                    <p className="text-white/40 text-sm text-center py-4">No creators yet</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Support Modal */}
            {supportModal.show && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-6">
                    <div className="bg-slate-900 rounded-2xl border border-white/20 p-8 max-w-md w-full">
                        <h2 className="text-2xl font-bold text-white mb-4">Support Creator 💰</h2>
                        <p className="text-white/60 mb-6">
                            Show your appreciation by sending financial support to this creator!
                        </p>

                        <div className="mb-6">
                            <label className="block text-white font-semibold mb-3">Amount ($)</label>
                            <div className="flex gap-2 mb-4">
                                {[5, 10, 20, 50].map(amount => (
                                    <button
                                        key={amount}
                                        onClick={() => setSupportAmount(amount)}
                                        className={`flex-1 py-3 rounded-xl font-semibold transition-all ${supportAmount === amount
                                                ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white'
                                                : 'bg-white/10 text-white hover:bg-white/20'
                                            }`}
                                    >
                                        ${amount}
                                    </button>
                                ))}
                            </div>
                            <input
                                type="number"
                                value={supportAmount}
                                onChange={(e) => setSupportAmount(parseInt(e.target.value) || 0)}
                                min="1"
                                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={closeSupportModal}
                                className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSendSupport}
                                disabled={supportAmount <= 0}
                                className="flex-1 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                            >
                                Send ${supportAmount}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Share Modal */}
            <ShareModal
                isOpen={shareModal.show}
                onClose={closeShareModal}
                post={shareModal.post}
                currentUser={currentUser}
            />
        </div>
    );
}

export default DiscoverPage;