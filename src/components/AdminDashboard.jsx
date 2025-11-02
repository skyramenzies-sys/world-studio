import React from 'react';
import { Settings, LogOut, Users, TrendingUp, Eye, Heart, MessageCircle } from 'lucide-react';

function AdminDashboard({ users, posts, onLogout, onDeleteUser, onDeletePost }) {
    const totalUsers = users.length;
    const totalPosts = posts.length;
    const totalViews = posts.reduce((sum, p) => sum + p.views, 0);
    const totalLikes = posts.reduce((sum, p) => sum + p.likes, 0);

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black text-white">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItaDJ2LTJoLTJ6bTAgNHYyaDJ2LTJoLTJ6bTAtOHYyaDJ2LTJoLTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>

            <div className="relative z-10">
                {/* Header */}
                <div className="bg-white/10 backdrop-blur-lg border-b border-white/20 px-6 py-4">
                    <div className="max-w-7xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Settings className="w-8 h-8 text-cyan-400" />
                            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                        </div>
                        <button
                            onClick={onLogout}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-xl hover:bg-red-500/30 transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Logout
                        </button>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto p-6 space-y-6">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 backdrop-blur-lg rounded-2xl p-6 border border-cyan-500/30">
                            <Users className="w-8 h-8 text-cyan-400 mb-2" />
                            <div className="text-3xl font-bold">{totalUsers}</div>
                            <div className="text-sm text-gray-300">Total Users</div>
                        </div>

                        <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-lg rounded-2xl p-6 border border-purple-500/30">
                            <TrendingUp className="w-8 h-8 text-purple-400 mb-2" />
                            <div className="text-3xl font-bold">{totalPosts}</div>
                            <div className="text-sm text-gray-300">Total Posts</div>
                        </div>

                        <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-lg rounded-2xl p-6 border border-green-500/30">
                            <Eye className="w-8 h-8 text-green-400 mb-2" />
                            <div className="text-3xl font-bold">{totalViews}</div>
                            <div className="text-sm text-gray-300">Total Views</div>
                        </div>

                        <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 backdrop-blur-lg rounded-2xl p-6 border border-orange-500/30">
                            <Heart className="w-8 h-8 text-orange-400 mb-2" />
                            <div className="text-3xl font-bold">{totalLikes}</div>
                            <div className="text-sm text-gray-300">Total Likes</div>
                        </div>
                    </div>

                    {/* Users Management */}
                    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                        <h2 className="text-xl font-bold mb-4">Users Management</h2>
                        <div className="space-y-3">
                            {users.map(user => (
                                <div key={user.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                                    <div className="flex items-center gap-3">
                                        <div className="text-3xl">{user.avatar}</div>
                                        <div>
                                            <div className="font-semibold">{user.username}</div>
                                            <div className="text-sm text-gray-400">{user.email}</div>
                                        </div>
                                        <span className="px-3 py-1 bg-purple-500/20 border border-purple-500/50 rounded-full text-xs">
                                            {user.role}
                                        </span>
                                    </div>
                                    {user.role !== 'admin' && (
                                        <button
                                            onClick={() => onDeleteUser(user.id)}
                                            className="px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-lg hover:bg-red-500/30 transition-colors text-sm"
                                        >
                                            Delete
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Posts Management */}
                    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                        <h2 className="text-xl font-bold mb-4">Posts Management</h2>
                        <div className="space-y-3">
                            {posts.map(post => (
                                <div key={post.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                                    <div className="flex items-center gap-3 flex-1">
                                        <div className="text-3xl">{post.thumbnail}</div>
                                        <div className="flex-1">
                                            <div className="font-semibold">{post.title}</div>
                                            <div className="text-sm text-gray-400">by {post.username}</div>
                                        </div>
                                        <div className="flex gap-4 text-sm">
                                            <span className="flex items-center gap-1">
                                                <Eye className="w-4 h-4" /> {post.views}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Heart className="w-4 h-4" /> {post.likes}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <MessageCircle className="w-4 h-4" /> {post.comments.length}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => onDeletePost(post.id)}
                                        className="px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-lg hover:bg-red-500/30 transition-colors text-sm ml-4"
                                    >
                                        Delete
                                    </button>
                                </div>
                            ))}
                            {posts.length === 0 && (
                                <div className="text-center text-gray-400 py-8">No posts yet</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AdminDashboard;