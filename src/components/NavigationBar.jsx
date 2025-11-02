import React, { useState } from 'react';
import { Home, Plus, Bell, LogOut, DollarSign, BarChart3, Compass, X, MessageCircle } from 'lucide-react';

function NavigationBar({ currentUser, currentPage, setCurrentPage, onLogout, messages }) {
    // Get unread notifications count
    const unreadCount = (currentUser?.notifications || []).filter(n => !n.read).length;

    // Get unread messages count
    const unreadMessagesCount = messages ? messages.filter(msg =>
        msg.receiverId === currentUser?.id && !msg.read
    ).length : 0;

    // ✅ NULL CHECK: Als currentUser null is, render de navbar niet of toon een fallback
    if (!currentUser) {
        return null; // Of je kunt een loading state teruggeven
    }

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

                        {/* Stock Predictor Button */}
                        <button
                            onClick={() => setCurrentPage('stocks')}
                            className={`p-3 rounded-xl transition-colors ${currentPage === 'stocks'
                                ? 'bg-green-500/20 border border-green-500/50'
                                : 'hover:bg-white/10'
                                }`}
                            title="AI Stock Predictor"
                        >
                            <span className="text-xl">📈</span>
                        </button>

                        <button
                            onClick={() => setCurrentPage('upload')}
                            className="p-3 rounded-xl hover:bg-white/10 transition-colors"
                            title="Upload"
                        >
                            <Plus className="w-5 h-5" />
                        </button>

                        {/* Messages Button */}
                        <button
                            onClick={() => setCurrentPage('messages')}
                            className={`p-3 rounded-xl transition-colors relative ${currentPage === 'messages'
                                ? 'bg-cyan-500/20 border border-cyan-500/50'
                                : 'hover:bg-white/10'
                                }`}
                            title="Messages"
                        >
                            <MessageCircle className="w-5 h-5" />
                            {unreadMessagesCount > 0 && (
                                <span className="absolute -top-1 -right-1 px-2 py-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-bold rounded-full min-w-[20px] flex items-center justify-center shadow-lg">
                                    {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                                </span>
                            )}
                        </button>

                        {/* Notifications Button */}
                        <button
                            onClick={() => setCurrentPage('notifications')}
                            className={`p-3 rounded-xl transition-colors relative ${currentPage === 'notifications'
                                ? 'bg-cyan-500/20 border border-cyan-500/50'
                                : 'hover:bg-white/10'
                                }`}
                            title="Notifications"
                        >
                            <Bell className="w-5 h-5" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 px-2 py-0.5 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold rounded-full min-w-[20px] flex items-center justify-center shadow-lg">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>

                        <div className="h-6 w-px bg-white/20 mx-2"></div>

                        <button
                            onClick={() => setCurrentPage('profile')}
                            className="flex items-center gap-3 hover:bg-white/10 p-2 rounded-xl transition-colors"
                        >
                            <div className="text-right">
                                {/* ✅ VEILIGE TOEGANG met optional chaining en fallback */}
                                <div className="text-sm font-semibold">
                                    {currentUser?.username || 'Guest'}
                                </div>
                                <div className="text-xs text-gray-400">
                                    {currentUser?.role || 'User'}
                                </div>
                            </div>
                            <div className="text-2xl">
                                {currentUser?.avatar || '👤'}
                            </div>
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