import React from 'react';
import NavigationBar from './NavigationBar';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Eye, Heart, MessageCircle } from 'lucide-react';

function AnalyticsPage({ currentUser, currentPage, setCurrentPage, posts, onLogout }) {
    // Calculate stats
    const totalViews = posts.reduce((sum, p) => sum + p.views, 0);
    const totalLikes = posts.reduce((sum, p) => sum + p.likes, 0);
    const totalComments = posts.reduce((sum, p) => sum + p.comments.length, 0);
    const avgEngagement = posts.length > 0
        ? ((totalLikes + totalComments) / posts.length).toFixed(1)
        : 0;

    // Posts by type
    const postsByType = posts.reduce((acc, post) => {
        acc[post.type] = (acc[post.type] || 0) + 1;
        return acc;
    }, {});

    const pieData = Object.entries(postsByType).map(([type, count]) => ({
        name: type.charAt(0).toUpperCase() + type.slice(1),
        value: count
    }));

    const COLORS = ['#06b6d4', '#a855f7', '#ec4899', '#10b981'];

    // Top performing posts
    const topPosts = [...posts]
        .sort((a, b) => (b.views + b.likes * 2) - (a.views + a.likes * 2))
        .slice(0, 5)
        .map(post => ({
            name: post.title.slice(0, 20),
            views: post.views,
            likes: post.likes,
            comments: post.comments.length
        }));

    // Activity over time (last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    const activityData = last7Days.map((day, index) => ({
        name: day,
        posts: Math.floor(Math.random() * 5),
        engagement: Math.floor(Math.random() * 50) + 10
    }));

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
                    <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                        Analytics Dashboard
                    </h1>

                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 backdrop-blur-lg rounded-2xl p-6 border border-cyan-500/30">
                            <Eye className="w-8 h-8 text-cyan-400 mb-2" />
                            <div className="text-3xl font-bold">{totalViews}</div>
                            <div className="text-sm text-gray-300">Total Views</div>
                        </div>

                        <div className="bg-gradient-to-br from-pink-500/20 to-red-500/20 backdrop-blur-lg rounded-2xl p-6 border border-pink-500/30">
                            <Heart className="w-8 h-8 text-pink-400 mb-2" />
                            <div className="text-3xl font-bold">{totalLikes}</div>
                            <div className="text-sm text-gray-300">Total Likes</div>
                        </div>

                        <div className="bg-gradient-to-br from-purple-500/20 to-violet-500/20 backdrop-blur-lg rounded-2xl p-6 border border-purple-500/30">
                            <MessageCircle className="w-8 h-8 text-purple-400 mb-2" />
                            <div className="text-3xl font-bold">{totalComments}</div>
                            <div className="text-sm text-gray-300">Comments</div>
                        </div>

                        <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-lg rounded-2xl p-6 border border-green-500/30">
                            <TrendingUp className="w-8 h-8 text-green-400 mb-2" />
                            <div className="text-3xl font-bold">{avgEngagement}</div>
                            <div className="text-sm text-gray-300">Avg Engagement</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        {/* Activity Chart */}
                        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 border border-white/20">
                            <h2 className="text-xl font-bold mb-4">Activity Over Time</h2>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={activityData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                                    <XAxis dataKey="name" stroke="#ffffff80" />
                                    <YAxis stroke="#ffffff80" />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#1e293b',
                                            border: '1px solid #334155',
                                            borderRadius: '8px'
                                        }}
                                    />
                                    <Line type="monotone" dataKey="engagement" stroke="#06b6d4" strokeWidth={3} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Content Type Distribution */}
                        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 border border-white/20">
                            <h2 className="text-xl font-bold mb-4">Content Distribution</h2>
                            {pieData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                            outerRadius={100}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#1e293b',
                                                border: '1px solid #334155',
                                                borderRadius: '8px'
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-[300px] flex items-center justify-center text-gray-400">
                                    No content yet
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Top Performing Posts */}
                    <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 border border-white/20">
                        <h2 className="text-xl font-bold mb-4">Top Performing Content</h2>
                        {topPosts.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={topPosts}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                                    <XAxis dataKey="name" stroke="#ffffff80" />
                                    <YAxis stroke="#ffffff80" />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#1e293b',
                                            border: '1px solid #334155',
                                            borderRadius: '8px'
                                        }}
                                    />
                                    <Bar dataKey="views" fill="#06b6d4" />
                                    <Bar dataKey="likes" fill="#ec4899" />
                                    <Bar dataKey="comments" fill="#a855f7" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[300px] flex items-center justify-center text-gray-400">
                                Create some posts to see analytics
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AnalyticsPage;
