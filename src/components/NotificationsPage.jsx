import React, { useState } from 'react';
import { Bell, X, Heart, MessageCircle, DollarSign, UserPlus, Eye } from 'lucide-react';
import NavigationBar from './NavigationBar';

function NotificationsPage({ currentUser, currentPage, setCurrentPage, users, onLogout, onClearNotification, onMarkAllAsRead }) {
    const [filter, setFilter] = useState('all'); // 'all', 'follows', 'likes', 'sales'

    const notifications = currentUser?.notifications || [];

    const filteredNotifications = filter === 'all'
        ? notifications
        : notifications.filter(n => {
            if (filter === 'follows') return n.type === 'follow';
            if (filter === 'likes') return n.type === 'like';
            if (filter === 'sales') return n.type === 'purchase';
            return true;
        });

    const unreadCount = notifications.filter(n => !n.read).length;

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'follow': return <UserPlus className="w-5 h-5 text-cyan-400" />;
            case 'like': return <Heart className="w-5 h-5 text-red-400" />;
            case 'comment': return <MessageCircle className="w-5 h-5 text-blue-400" />;
            case 'purchase': return <DollarSign className="w-5 h-5 text-green-400" />;
            default: return <Bell className="w-5 h-5 text-white/60" />;
        }
    };

    const formatTime = (timestamp) => {
        const now = new Date();
        const time = new Date(timestamp);
        const diff = Math.floor((now - time) / 1000); // seconds

        if (diff < 60) return 'just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
        return time.toLocaleDateString();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <NavigationBar
                currentUser={currentUser}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                onLogout={onLogout}
            />

            <div className="max-w-4xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <Bell className="w-10 h-10 text-cyan-400" />
                            <div>
                                <h1 className="text-4xl font-bold text-white">Notifications</h1>
                                <p className="text-white/60">
                                    {unreadCount > 0
                                        ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
                                        : 'All caught up!'
                                    }
                                </p>
                            </div>
                        </div>
                        {notifications.length > 0 && (
                            <button
                                onClick={onMarkAllAsRead}
                                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition-all"
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex items-center gap-2 overflow-x-auto">
                        {[
                            { id: 'all', label: 'All', icon: '📬' },
                            { id: 'follows', label: 'Follows', icon: '👥' },
                            { id: 'likes', label: 'Likes', icon: '❤️' },
                            { id: 'sales', label: 'Sales', icon: '💰' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setFilter(tab.id)}
                                className={`px-4 py-2 rounded-xl font-semibold transition-all whitespace-nowrap ${filter === tab.id
                                        ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
                                        : 'bg-white/10 text-white/60 hover:bg-white/20'
                                    }`}
                            >
                                {tab.icon} {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Notifications List */}
                <div className="space-y-3">
                    {filteredNotifications.length === 0 ? (
                        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-12 border border-white/20 text-center">
                            <div className="text-6xl mb-4">🔔</div>
                            <h3 className="text-2xl font-bold text-white mb-2">
                                {filter === 'all' ? 'No notifications yet' : `No ${filter} notifications`}
                            </h3>
                            <p className="text-white/60">
                                {filter === 'all'
                                    ? "You'll see notifications here when something happens!"
                                    : `No ${filter} activity to show`
                                }
                            </p>
                        </div>
                    ) : (
                        filteredNotifications.map(notification => {
                            const notifUser = users?.find(u => u.id === notification.from);

                            return (
                                <div
                                    key={notification.id}
                                    className={`bg-white/10 backdrop-blur-lg rounded-2xl p-6 border transition-all hover:border-white/30 ${notification.read
                                            ? 'border-white/20'
                                            : 'border-cyan-500/50 bg-cyan-500/5'
                                        }`}
                                >
                                    <div className="flex items-start gap-4">
                                        {/* Avatar */}
                                        <div className="text-4xl flex-shrink-0">
                                            {notification.fromAvatar || notifUser?.avatar || '👤'}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-3 mb-2">
                                                <div className="flex items-center gap-2">
                                                    {getNotificationIcon(notification.type)}
                                                    <p className="text-white font-medium">
                                                        <span className="font-bold">{notification.fromUsername}</span>
                                                        {' '}
                                                        {notification.type === 'follow' && 'started following you!'}
                                                        {notification.type === 'like' && 'liked your post'}
                                                        {notification.type === 'comment' && 'commented on your post'}
                                                        {notification.type === 'purchase' && 'bought your content'}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => onClearNotification(notification.id)}
                                                    className="p-1 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
                                                >
                                                    <X className="w-4 h-4 text-white/60" />
                                                </button>
                                            </div>

                                            {/* Message */}
                                            {notification.message && (
                                                <p className="text-white/80 text-sm mb-2">{notification.message}</p>
                                            )}

                                            {/* Timestamp */}
                                            <div className="flex items-center gap-2 text-xs text-white/60">
                                                <span>{formatTime(notification.timestamp)}</span>
                                                {!notification.read && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="text-cyan-400 font-semibold">New</span>
                                                    </>
                                                )}
                                            </div>

                                            {/* Action Buttons */}
                                            {notification.type === 'follow' && notifUser && (
                                                <div className="mt-3">
                                                    <button
                                                        onClick={() => setCurrentPage('profile')}
                                                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold transition-all text-sm"
                                                    >
                                                        View Profile
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Empty State for Filtered View */}
                {notifications.length > 0 && filteredNotifications.length === 0 && filter !== 'all' && (
                    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-12 border border-white/20 text-center mt-8">
                        <div className="text-6xl mb-4">
                            {filter === 'follows' && '👥'}
                            {filter === 'likes' && '❤️'}
                            {filter === 'sales' && '💰'}
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">No {filter} notifications</h3>
                        <p className="text-white/60">You'll see {filter} activity here when it happens</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default NotificationsPage;