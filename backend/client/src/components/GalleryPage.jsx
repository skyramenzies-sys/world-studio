import React, { useState, useEffect } from 'react';
import NavigationBar from './NavigationBar';
import { Grid, List, Filter, Download, Trash2, Eye, Heart, MessageCircle, Play, Volume2 } from 'lucide-react';
import apiService from '../services/api';

function GalleryPage({ currentUser, currentPage, setCurrentPage, onLogout }) {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
    const [filterType, setFilterType] = useState('all'); // 'all', 'image', 'video', 'audio'
    const [selectedPost, setSelectedPost] = useState(null);

    useEffect(() => {
        loadPosts();
    }, []);

    const loadPosts = async () => {
        try {
            setLoading(true);
            const allPosts = await apiService.getPosts();
            // Filter user's own posts
            const userPosts = allPosts.filter(post => post.userId === currentUser.id);
            setPosts(userPosts);
        } catch (error) {
            console.error('Error loading posts:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (postId) => {
        if (window.confirm('Are you sure you want to delete this content?')) {
            try {
                await apiService.deletePost(postId);
                setPosts(posts.filter(p => p.id !== postId));
                setSelectedPost(null);
            } catch (error) {
                alert('Error deleting post: ' + error.message);
            }
        }
    };

    const filteredPosts = filterType === 'all'
        ? posts
        : posts.filter(p => p.type === filterType);

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black text-white">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItaDJ2LTJoLTJ6bTAgNHYyaDJ2LTJoLTJ6bTAtOHYyaDJ2LTJoLTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>

            <div className="relative z-10">
                <NavigationBar
                    currentUser={currentUser}
                    currentPage={currentPage}
                    setCurrentPage={setCurrentPage}
                    onLogout={onLogout}
                />

                <div className="max-w-7xl mx-auto p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                            My Gallery
                        </h1>

                        <div className="flex items-center gap-3">
                            {/* Filter Buttons */}
                            <div className="flex gap-2 bg-white/10 backdrop-blur-lg rounded-xl p-1 border border-white/20">
                                {['all', 'image', 'video', 'audio'].map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setFilterType(type)}
                                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${filterType === type
                                                ? 'bg-gradient-to-r from-cyan-500 to-purple-500'
                                                : 'hover:bg-white/10'
                                            }`}
                                    >
                                        {type.charAt(0).toUpperCase() + type.slice(1)}
                                    </button>
                                ))}
                            </div>

                            {/* View Mode Toggle */}
                            <div className="flex gap-2 bg-white/10 backdrop-blur-lg rounded-xl p-1 border border-white/20">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-cyan-500/20' : 'hover:bg-white/10'
                                        }`}
                                >
                                    <Grid className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-cyan-500/20' : 'hover:bg-white/10'
                                        }`}
                                >
                                    <List className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-20">
                            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-cyan-400 border-t-transparent"></div>
                            <p className="mt-4 text-gray-400">Loading gallery...</p>
                        </div>
                    ) : filteredPosts.length === 0 ? (
                        <div className="text-center py-20">
                            <div className="text-6xl mb-4">📁</div>
                            <p className="text-xl text-gray-400 mb-4">No content yet</p>
                            <button
                                onClick={() => setCurrentPage('upload')}
                                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-xl font-semibold hover:opacity-90 transition-opacity"
                            >
                                Upload Your First Content
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Grid View */}
                            {viewMode === 'grid' && (
                                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {filteredPosts.map(post => (
                                        <div
                                            key={post.id}
                                            onClick={() => setSelectedPost(post)}
                                            className="bg-white/10 backdrop-blur-lg rounded-xl overflow-hidden border border-white/20 hover:border-cyan-400/50 transition-all cursor-pointer group"
                                        >
                                            {/* Thumbnail */}
                                            <div className="aspect-square bg-gradient-to-br from-cyan-500/10 to-purple-500/10 flex items-center justify-center relative">
                                                {post.type === 'image' && post.fileUrl && (
                                                    <img
                                                        src={post.fileUrl}
                                                        alt={post.title}
                                                        className="w-full h-full object-cover"
                                                    />
                                                )}
                                                {post.type === 'video' && (
                                                    <div className="text-6xl">
                                                        🎬
                                                        <Play className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 text-white opacity-70 group-hover:opacity-100 transition-opacity" />
                                                    </div>
                                                )}
                                                {post.type === 'audio' && (
                                                    <div className="text-6xl">
                                                        🎵
                                                        <Volume2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 text-white opacity-70 group-hover:opacity-100 transition-opacity" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="p-3">
                                                <h3 className="font-semibold truncate mb-2">{post.title}</h3>
                                                <div className="flex items-center gap-3 text-sm text-gray-400">
                                                    <span className="flex items-center gap-1">
                                                        <Eye className="w-4 h-4" /> {post.views}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Heart className="w-4 h-4" /> {post.likes}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* List View */}
                            {viewMode === 'list' && (
                                <div className="space-y-3">
                                    {filteredPosts.map(post => (
                                        <div
                                            key={post.id}
                                            className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20 hover:border-cyan-400/50 transition-all flex items-center gap-4"
                                        >
                                            {/* Thumbnail */}
                                            <div className="w-20 h-20 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                                {post.type === 'image' && post.fileUrl && (
                                                    <img
                                                        src={post.fileUrl}
                                                        alt={post.title}
                                                        className="w-full h-full object-cover rounded-lg"
                                                    />
                                                )}
                                                {post.type === 'video' && <div className="text-3xl">🎬</div>}
                                                {post.type === 'audio' && <div className="text-3xl">🎵</div>}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1">
                                                <h3 className="font-semibold mb-1">{post.title}</h3>
                                                <p className="text-sm text-gray-400 line-clamp-1">{post.description}</p>
                                                <div className="flex items-center gap-4 text-sm text-gray-400 mt-2">
                                                    <span className="flex items-center gap-1">
                                                        <Eye className="w-4 h-4" /> {post.views}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Heart className="w-4 h-4" /> {post.likes}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <MessageCircle className="w-4 h-4" /> {post.comments?.length || 0}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setSelectedPost(post)}
                                                    className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                                                    title="View"
                                                >
                                                    <Eye className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(post.id)}
                                                    className="p-2 bg-red-500/20 rounded-lg hover:bg-red-500/30 transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Modal for viewing content */}
            {selectedPost && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={() => setSelectedPost(null)}
                >
                    <div
                        className="bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Content Display */}
                        <div className="p-6">
                            {selectedPost.type === 'image' && (
                                <img
                                    src={selectedPost.fileUrl}
                                    alt={selectedPost.title}
                                    className="w-full rounded-lg mb-4"
                                />
                            )}
                            {selectedPost.type === 'video' && (
                                <video
                                    src={selectedPost.fileUrl}
                                    controls
                                    className="w-full rounded-lg mb-4"
                                />
                            )}
                            {selectedPost.type === 'audio' && (
                                <div className="bg-gradient-to-br from-cyan-500/10 to-purple-500/10 rounded-lg p-12 mb-4 text-center">
                                    <div className="text-8xl mb-4">🎵</div>
                                    <audio src={selectedPost.fileUrl} controls className="w-full" />
                                </div>
                            )}

                            <h2 className="text-2xl font-bold mb-2">{selectedPost.title}</h2>
                            <p className="text-gray-400 mb-4">{selectedPost.description}</p>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4 text-sm">
                                    <span className="flex items-center gap-1">
                                        <Eye className="w-4 h-4" /> {selectedPost.views} views
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Heart className="w-4 h-4" /> {selectedPost.likes} likes
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <MessageCircle className="w-4 h-4" /> {selectedPost.comments?.length || 0} comments
                                    </span>
                                </div>

                                <div className="flex gap-2">
                                    <a
                                        href={selectedPost.fileUrl}
                                        download
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/50 rounded-lg hover:bg-cyan-500/30 transition-colors flex items-center gap-2"
                                    >
                                        <Download className="w-4 h-4" />
                                        Download
                                    </a>
                                    <button
                                        onClick={() => {
                                            handleDelete(selectedPost.id);
                                        }}
                                        className="px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-lg hover:bg-red-500/30 transition-colors flex items-center gap-2"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Delete
                                    </button>
                                    <button
                                        onClick={() => setSelectedPost(null)}
                                        className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default GalleryPage;