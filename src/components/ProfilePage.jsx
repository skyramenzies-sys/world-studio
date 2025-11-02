import React, { useState } from 'react';
import { Settings, Camera, Heart, MessageCircle, Eye, Play, Music, Image as ImageIcon, MoreVertical, Share2 } from 'lucide-react';
import NavigationBar from './NavigationBar';
import ShareModal from './ShareModal';
import EmojiSelector from './EmojiSelector';
import SubscriptionTiers, { SubscriberBadge, SubscriberList } from './SubscriptionTiers';

function ProfilePage({ currentUser, currentPage, setCurrentPage, posts, users, onUpdateAvatar, onFollow, onUnfollow, onLogout, onSubscribe, onUnsubscribe }) {
    const [activeTab, setActiveTab] = useState('posts');
    const [shareModal, setShareModal] = useState({ show: false, post: null });
    const [showEmojiSelector, setShowEmojiSelector] = useState(false);
    const [showFollowersModal, setShowFollowersModal] = useState(false);
    const [showFollowingModal, setShowFollowingModal] = useState(false);

    const openShareModal = (post) => {
        setShareModal({ show: true, post });
    };

    const closeShareModal = () => {
        setShareModal({ show: false, post: null });
    };

    const handleAvatarSelect = (emoji) => {
        if (onUpdateAvatar) {
            onUpdateAvatar(emoji);
        }
    };

    // Calculate totals
    const totalViews = posts.reduce((sum, post) => sum + (post.views || 0), 0);
    const totalLikes = posts.reduce((sum, post) => sum + (post.likes || 0), 0);
    const totalComments = posts.reduce((sum, post) => sum + (post.comments?.length || 0), 0);

    const stats = [
        { label: 'Total Views', value: totalViews, icon: Eye, color: 'from-blue-500 to-cyan-500' },
        { label: 'Total Likes', value: totalLikes, icon: Heart, color: 'from-pink-500 to-rose-500' },
        { label: 'Comments', value: totalComments, icon: MessageCircle, color: 'from-purple-500 to-indigo-500' },
        { label: 'Earnings', value: `$${currentUser?.earnings || 0}`, icon: null, color: 'from-yellow-500 to-orange-500' }
    ];

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getContentIcon = (type) => {
        switch (type) {
            case 'video': return Play;
            case 'audio': return Music;
            case 'image': return ImageIcon;
            default: return ImageIcon;
        }
    };

    const getCategoryEmoji = (category) => {
        const emojis = {
            art: '🎨',
            photography: '📸',
            video: '🎬',
            music: '🎵',
            design: '✨',
            animation: '🎭',
            other: '📦'
        };
        return emojis[category] || '📦';
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <NavigationBar
                currentUser={currentUser}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                onLogout={onLogout}
            />

            <div className="max-w-6xl mx-auto px-6 py-8">
                {/* Profile Header */}
                <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 mb-8">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        {/* Avatar */}
                        <div className="relative">
                            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 p-1 cursor-pointer" onClick={() => setShowEmojiSelector(true)}>
                                <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-6xl hover:bg-slate-800 transition-colors">
                                    {currentUser?.avatar || '👤'}
                                </div>
                            </div>
                            <button
                                onClick={() => setShowEmojiSelector(true)}
                                className="absolute bottom-0 right-0 p-3 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full hover:from-cyan-600 hover:to-purple-600 transition-all shadow-lg transform hover:scale-110"
                                title="Change avatar"
                            >
                                <Camera className="w-5 h-5 text-white" />
                            </button>
                        </div>

                        {/* Profile Info */}
                        <div className="flex-1 text-center md:text-left">
                            <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                                <h1 className="text-4xl font-bold text-white">{currentUser?.username}</h1>
                                <span className="px-3 py-1 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full text-white text-sm font-semibold">
                                    {currentUser?.role || 'Creator'}
                                </span>
                            </div>
                            <p className="text-white/60 mb-4">{currentUser?.email}</p>
                            <p className="text-white/80 mb-4">{currentUser?.bio || 'No bio yet'}</p>

                            {/* Stats Row */}
                            <div className="flex items-center justify-center md:justify-start gap-6">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-white">{posts.length}</div>
                                    <div className="text-sm text-white/60">Posts</div>
                                </div>
                                <button
                                    onClick={() => setShowFollowersModal(true)}
                                    className="text-center hover:bg-white/10 px-3 py-2 rounded-lg transition-all"
                                >
                                    <div className="text-2xl font-bold text-white">
                                        {(currentUser?.followers || []).length}
                                    </div>
                                    <div className="text-sm text-white/60">Followers</div>
                                </button>
                                <button
                                    onClick={() => setShowFollowingModal(true)}
                                    className="text-center hover:bg-white/10 px-3 py-2 rounded-lg transition-all"
                                >
                                    <div className="text-2xl font-bold text-white">
                                        {(currentUser?.following || []).length}
                                    </div>
                                    <div className="text-sm text-white/60">Following</div>
                                </button>
                            </div>
                        </div>

                        {/* Edit Button */}
                        <button
                            className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white font-semibold transition-all flex items-center gap-2"
                        >
                            <Settings className="w-5 h-5" />
                            Edit Profile
                        </button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {stats.map((stat, index) => {
                        const Icon = stat.icon;
                        return (
                            <div
                                key={index}
                                className={`bg-gradient-to-br ${stat.color} rounded-2xl p-6 text-white`}
                            >
                                {Icon && <Icon className="w-8 h-8 mb-2 opacity-80" />}
                                {!Icon && <div className="text-3xl mb-2">💰</div>}
                                <div className="text-3xl font-bold mb-1">{stat.value}</div>
                                <div className="text-sm opacity-80">{stat.label}</div>
                            </div>
                        );
                    })}
                </div>

                {/* Tabs */}
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 mb-6 p-2">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setActiveTab('posts')}
                            className={`flex-1 py-3 rounded-xl font-semibold transition-all ${activeTab === 'posts'
                                    ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
                                    : 'text-white/60 hover:text-white'
                                }`}
                        >
                            Posts ({posts.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('subscriptions')}
                            className={`flex-1 py-3 rounded-xl font-semibold transition-all ${activeTab === 'subscriptions'
                                    ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
                                    : 'text-white/60 hover:text-white'
                                }`}
                        >
                            💎 Tiers
                        </button>
                        {(currentUser.subscribers || []).length > 0 && (
                            <button
                                onClick={() => setActiveTab('subscribers')}
                                className={`flex-1 py-3 rounded-xl font-semibold transition-all ${activeTab === 'subscribers'
                                        ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
                                        : 'text-white/60 hover:text-white'
                                    }`}
                            >
                                Subscribers ({(currentUser.subscribers || []).length})
                            </button>
                        )}
                        <button
                            onClick={() => setActiveTab('about')}
                            className={`flex-1 py-3 rounded-xl font-semibold transition-all ${activeTab === 'about'
                                    ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
                                    : 'text-white/60 hover:text-white'
                                }`}
                        >
                            About
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                {activeTab === 'posts' ? (
                    <div>
                        {posts.length === 0 ? (
                            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-12 border border-white/20 text-center">
                                <div className="text-6xl mb-4">📭</div>
                                <h3 className="text-2xl font-bold text-white mb-2">No posts yet</h3>
                                <p className="text-white/60 mb-6">Start sharing your creativity with the world!</p>
                                <button
                                    onClick={() => setCurrentPage('upload')}
                                    className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                                >
                                    Upload Content
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {posts.map(post => {
                                    const ContentIcon = getContentIcon(post.type);
                                    return (
                                        <div
                                            key={post.id}
                                            className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 overflow-hidden hover:border-white/30 transition-all group"
                                        >
                                            {/* Media Preview */}
                                            <div className="relative aspect-square bg-black/50 cursor-pointer">
                                                {/* ✅ ECHTE CONTENT WEERGAVE */}
                                                {post.type === 'image' && post.fileUrl && (
                                                    <img
                                                        src={post.fileUrl}
                                                        alt={post.title}
                                                        className="w-full h-full object-cover"
                                                        loading="lazy"
                                                    />
                                                )}

                                                {post.type === 'video' && post.fileUrl && (
                                                    <div className="relative w-full h-full">
                                                        <video
                                                            src={post.fileUrl}
                                                            className="w-full h-full object-cover"
                                                            preload="metadata"
                                                        />
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                                            <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center">
                                                                <Play className="w-8 h-8 text-black ml-1" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {post.type === 'audio' && (
                                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900 to-indigo-900">
                                                        <Music className="w-24 h-24 text-white/40" />
                                                    </div>
                                                )}

                                                {/* Fallback als geen fileUrl */}
                                                {!post.fileUrl && (
                                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                                                        <div className="text-6xl">{post.thumbnail || '📦'}</div>
                                                    </div>
                                                )}

                                                {/* Overlay */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <div className="absolute bottom-0 left-0 right-0 p-4">
                                                        <div className="flex items-center gap-4 text-white">
                                                            <div className="flex items-center gap-1">
                                                                <Eye className="w-4 h-4" />
                                                                <span className="text-sm">{post.views || 0}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <Heart className="w-4 h-4" />
                                                                <span className="text-sm">{post.likes || 0}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <MessageCircle className="w-4 h-4" />
                                                                <span className="text-sm">{post.comments?.length || 0}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Type Badge */}
                                                <div className="absolute top-3 left-3 px-3 py-1 bg-black/70 backdrop-blur-sm rounded-full flex items-center gap-2">
                                                    <ContentIcon className="w-4 h-4 text-white" />
                                                    <span className="text-white text-sm capitalize">{post.type}</span>
                                                </div>

                                                {/* Actions */}
                                                <div className="absolute top-3 right-3 flex gap-2">
                                                    <button
                                                        onClick={() => openShareModal(post)}
                                                        className="p-2 bg-black/70 backdrop-blur-sm rounded-full hover:bg-black/90 transition-colors"
                                                    >
                                                        <Share2 className="w-4 h-4 text-white" />
                                                    </button>
                                                    <button className="p-2 bg-black/70 backdrop-blur-sm rounded-full hover:bg-black/90 transition-colors">
                                                        <MoreVertical className="w-4 h-4 text-white" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Post Info */}
                                            <div className="p-4">
                                                <div className="flex items-start justify-between mb-2">
                                                    <h3 className="font-bold text-white line-clamp-2 flex-1">{post.title}</h3>
                                                    <span className="text-2xl ml-2">{getCategoryEmoji(post.category)}</span>
                                                </div>
                                                {post.description && (
                                                    <p className="text-white/60 text-sm line-clamp-2 mb-2">{post.description}</p>
                                                )}
                                                <div className="flex items-center justify-between text-xs text-white/40">
                                                    <span>{formatTime(post.timestamp)}</span>
                                                    <span className="capitalize">{post.category}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ) : activeTab === 'subscriptions' ? (
                    /* Subscriptions Tab */
                    <SubscriptionTiers
                        creator={currentUser}
                        currentUser={currentUser}
                        onSubscribe={onSubscribe}
                        onUnsubscribe={onUnsubscribe}
                    />
                ) : activeTab === 'subscribers' ? (
                    /* Subscribers Tab */
                    <SubscriberList
                        subscribers={currentUser.subscribers || []}
                        users={users}
                    />
                ) : (
                    /* About Tab */
                    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
                        <h2 className="text-2xl font-bold text-white mb-6">About</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="text-white/60 text-sm mb-1 block">Username</label>
                                <p className="text-white text-lg">{currentUser?.username}</p>
                            </div>

                            <div>
                                <label className="text-white/60 text-sm mb-1 block">Email</label>
                                <p className="text-white text-lg">{currentUser?.email}</p>
                            </div>

                            <div>
                                <label className="text-white/60 text-sm mb-1 block">Role</label>
                                <p className="text-white text-lg capitalize">{currentUser?.role || 'Creator'}</p>
                            </div>

                            <div>
                                <label className="text-white/60 text-sm mb-1 block">Bio</label>
                                <p className="text-white text-lg">{currentUser?.bio || 'No bio yet'}</p>
                            </div>

                            <div>
                                <label className="text-white/60 text-sm mb-1 block">Member Since</label>
                                <p className="text-white text-lg">{new Date(currentUser?.createdAt || Date.now()).toLocaleDateString()}</p>
                            </div>

                            <div className="pt-4 border-t border-white/10">
                                <h3 className="text-white font-semibold mb-3">Statistics</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/5 rounded-xl p-4">
                                        <div className="text-white/60 text-sm mb-1">Total Posts</div>
                                        <div className="text-white text-2xl font-bold">{posts.length}</div>
                                    </div>
                                    <div className="bg-white/5 rounded-xl p-4">
                                        <div className="text-white/60 text-sm mb-1">Total Views</div>
                                        <div className="text-white text-2xl font-bold">{totalViews}</div>
                                    </div>
                                    <div className="bg-white/5 rounded-xl p-4">
                                        <div className="text-white/60 text-sm mb-1">Total Likes</div>
                                        <div className="text-white text-2xl font-bold">{totalLikes}</div>
                                    </div>
                                    <div className="bg-white/5 rounded-xl p-4">
                                        <div className="text-white/60 text-sm mb-1">Total Earnings</div>
                                        <div className="text-white text-2xl font-bold">${currentUser?.earnings || 0}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Share Modal */}
            <ShareModal
                isOpen={shareModal.show}
                onClose={closeShareModal}
                post={shareModal.post}
                currentUser={currentUser}
            />

            {/* Emoji Selector Modal */}
            <EmojiSelector
                isOpen={showEmojiSelector}
                onClose={() => setShowEmojiSelector(false)}
                onSelect={handleAvatarSelect}
                currentEmoji={currentUser?.avatar || '👤'}
            />

            {/* Followers Modal */}
            {showFollowersModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-6">
                    <div className="bg-slate-900 rounded-2xl border border-white/20 max-w-md w-full max-h-[70vh] flex flex-col">
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-white">Followers</h2>
                            <button
                                onClick={() => setShowFollowersModal(false)}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <span className="text-2xl">×</span>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6">
                            {(currentUser?.followers || []).length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="text-6xl mb-4">👥</div>
                                    <p className="text-white/60">No followers yet</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {(currentUser?.followers || []).map(followerId => {
                                        const follower = users?.find(u => u.id === followerId);
                                        if (!follower) return null;

                                        const isFollowingBack = (currentUser?.following || []).includes(followerId);

                                        return (
                                            <div key={followerId} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all">
                                                <div className="text-3xl">{follower.avatar || '👤'}</div>
                                                <div className="flex-1">
                                                    <div className="font-bold text-white">{follower.username}</div>
                                                    <div className="text-sm text-white/60">
                                                        {(follower.followers || []).length} followers
                                                    </div>
                                                </div>
                                                {!isFollowingBack && (
                                                    <button
                                                        onClick={() => {
                                                            onFollow(followerId);
                                                            setShowFollowersModal(false);
                                                        }}
                                                        className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white rounded-lg font-semibold transition-all text-sm"
                                                    >
                                                        Follow Back
                                                    </button>
                                                )}
                                                {isFollowingBack && (
                                                    <span className="text-green-400 text-sm">✓ Following</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Following Modal */}
            {showFollowingModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-6">
                    <div className="bg-slate-900 rounded-2xl border border-white/20 max-w-md w-full max-h-[70vh] flex flex-col">
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-white">Following</h2>
                            <button
                                onClick={() => setShowFollowingModal(false)}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <span className="text-2xl">×</span>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6">
                            {(currentUser?.following || []).length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="text-6xl mb-4">👤</div>
                                    <p className="text-white/60">Not following anyone yet</p>
                                    <button
                                        onClick={() => {
                                            setShowFollowingModal(false);
                                            setCurrentPage('discover');
                                        }}
                                        className="mt-4 px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                                    >
                                        Discover Creators
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {(currentUser?.following || []).map(followingId => {
                                        const followedUser = users?.find(u => u.id === followingId);
                                        if (!followedUser) return null;

                                        return (
                                            <div key={followingId} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all">
                                                <div className="text-3xl">{followedUser.avatar || '👤'}</div>
                                                <div className="flex-1">
                                                    <div className="font-bold text-white">{followedUser.username}</div>
                                                    <div className="text-sm text-white/60">
                                                        {(followedUser.followers || []).length} followers
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => onUnfollow(followingId)}
                                                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold transition-all text-sm"
                                                >
                                                    Unfollow
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ProfilePage;