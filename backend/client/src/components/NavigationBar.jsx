import React, { useState } from 'react';
import { Home, Plus, Bell, LogOut, DollarSign, BarChart3, Compass, X, Image } from 'lucide-react';

function NavigationBar({ currentUser, currentPage, setCurrentPage, onLogout }) {
    const [showNotifications, setShowNotifications] = useState(false);

    const notifications = [
        {
            id: 1,
            type: 'like',
            message: 'Someone liked your post "Amazing Content"',
            time: '2 minutes ago',
            icon: '❤️'
        },
        {
            id: 2,
            type: 'comment',
            message: 'New comment on your video',
            time: '15 minutes ago',
            icon: '💬'
        },
        {
            id: 3,
            type: 'support',
            message: 'You received $10 support!',
            time: '1 hour ago',
            icon: '💰'
        }
    ];

    return (
        <div className="bg-white/10 backdrop-blur-lg border-b border-white/20 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-6 py-4">
                <div className="flex items-center justify-between">
                    <h1
                        className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent cursor-pointer"
                        onClick={() => setCurrentPage('home')}
                    >
                        World-Studio
                    </h1>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage('home')}
                            className={`p-3 rounded-xl transition-colors ${currentPage === 'home'
                                    ? 'bg-cyan-500/20 border border-cyan-500/50'
                                    : 'hover:bg-white/10'
                                }`}
                            title="Home"
                        >
                            <Home className="w-5 h-5" />
                        </button>

                        <button
                            onClick={() => setCurrentPage('discover')}
                            className={`p-3 rounded-xl transition-colors ${currentPage === 'discover'
                                    ? 'bg-cyan-500/20 border border-cyan-500/50'
                                    : 'hover:bg-white/10'
                                }`}
                            title="Discover"
                        >
                            <Compass className="w-5 h-5" />
                        </button>

                        <button
                            onClick={() => setCurrentPage('gallery')}
                            className={`p-3 rounded-xl transition-colors ${currentPage === 'gallery'
                                    ? 'bg-cyan-500/20 border border-cyan-500/50'
                                    : 'hover:bg-white/10'
                                }`}
                            title="My Gallery"
                        >
                            <Image className="w-5 h-5" />
                        </button>

                        <button
                            onClick={() => setCurrentPage('analytics')}
                            className={`p-3 rounded-xl transition-colors ${currentPage === 'analytics'
                                    ? 'bg-cyan-500/20 border border-cyan-500/50'
                                    : 'hover:bg-white/10'
                                }`}
                            title="Analytics"
                        >
                            <BarChart3 className="w-5 h-5" />
                        </button>

                        <button
                            onClick={() => setCurrentPage('earnings')}
                            className={`p-3 rounded-xl transition-colors ${currentPage === 'earnings'
                                    ? 'bg-cyan-500/20 border border-cyan-500/50'
                                    : 'hover:bg-white/10'
                                }`}
                            title="Earnings"
                        >
                            <DollarSign className="w-5 h-5" />
                        </button>

                        <button
                            onClick={() => setCurrentPage('upload')}
                            className="p-3 rounded-xl hover:bg-white/10 transition-colors"
                            title="Upload"
                        >
                            <Plus className="w-5 h-5" />
                        </button>

                        <div className="relative">
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="p-3 rounded-xl hover:bg-white/10 transition-colors relative"
                            >
                                <Bell className="w-5 h-5" />
                                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                            </button>

                            {showNotifications && (
                                <div className="absolute right-0 top-full mt-2 w-80 bg-slate-800 rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
                                    <div className="p-4 border-b border-white/10 flex items-center justify-between">
                                        <h3 className="font-bold text-lg">Notifications</h3>
                                        <button
                                            onClick={() => setShowNotifications(false)}
                                            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="max-h-96 overflow-y-auto">
                                        {notifications.map(notif => (
                                            <div
                                                key={notif.id}
                                                className="p-4 hover:bg-white/5 transition-colors border-b border-white/5 cursor-pointer"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="text-2xl">{notif.icon}</div>
                                                    <div className="flex-1">
                                                        <p className="text-sm text-white">{notif.message}</p>
                                                        <p className="text-xs text-gray-400 mt-1">{notif.time}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="p-3 bg-white/5 text-center">
                                        <button className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
                                            View All Notifications
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="h-6 w-px bg-white/20 mx-2"></div>

                        <button
                            onClick={() => setCurrentPage('profile')}
                            className="flex items-center gap-3 hover:bg-white/10 p-2 rounded-xl transition-colors"
                        >
                            <div className="text-right">
                                <div className="text-sm font-semibold">{currentUser.username}</div>
                                <div className="text-xs text-gray-400">{currentUser.role}</div>
                            </div>
                            <div className="text-2xl">{currentUser.avatar}</div>
                        </button>

                        <button
                            onClick={onLogout}
                            className="p-3 rounded-xl hover:bg-red-500/20 transition-colors ml-2"
                            title="Logout"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default NavigationBar;