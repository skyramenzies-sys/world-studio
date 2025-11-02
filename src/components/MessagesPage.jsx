import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Search, ArrowLeft, MoreVertical, Smile, Check, CheckCheck, X, Image as ImageIcon } from 'lucide-react';
import NavigationBar from './NavigationBar';

function MessagesPage({ currentUser, currentPage, setCurrentPage, users, messages, onSendMessage, onDeleteMessage, onMarkAsRead, onLogout }) {
    const [selectedChat, setSelectedChat] = useState(null);
    const [messageText, setMessageText] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const messagesEndRef = useRef(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, selectedChat]);

    // Get all conversations for current user
    const getConversations = () => {
        const conversationMap = new Map();

        messages.forEach(msg => {
            // Only include messages involving current user
            if (msg.senderId !== currentUser.id && msg.receiverId !== currentUser.id) return;

            // Determine the other person in conversation
            const otherUserId = msg.senderId === currentUser.id ? msg.receiverId : msg.senderId;

            if (!conversationMap.has(otherUserId)) {
                conversationMap.set(otherUserId, {
                    userId: otherUserId,
                    lastMessage: msg,
                    unreadCount: 0,
                    messages: []
                });
            }

            const conversation = conversationMap.get(otherUserId);
            conversation.messages.push(msg);

            // Update last message if this one is newer
            if (new Date(msg.timestamp) > new Date(conversation.lastMessage.timestamp)) {
                conversation.lastMessage = msg;
            }

            // Count unread messages (messages sent TO current user that aren't read)
            if (msg.receiverId === currentUser.id && !msg.read) {
                conversation.unreadCount++;
            }
        });

        // Convert to array and sort by last message time
        return Array.from(conversationMap.values())
            .sort((a, b) => new Date(b.lastMessage.timestamp) - new Date(a.lastMessage.timestamp));
    };

    const conversations = getConversations();

    // Filter conversations by search
    const filteredConversations = conversations.filter(conv => {
        const otherUser = users.find(u => u.id === conv.userId);
        return otherUser?.username.toLowerCase().includes(searchQuery.toLowerCase());
    });

    // Get messages for selected chat
    const getChatMessages = () => {
        if (!selectedChat) return [];

        return messages
            .filter(msg =>
                (msg.senderId === currentUser.id && msg.receiverId === selectedChat.userId) ||
                (msg.senderId === selectedChat.userId && msg.receiverId === currentUser.id)
            )
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    };

    const chatMessages = getChatMessages();

    // Mark messages as read when chat is opened
    useEffect(() => {
        if (selectedChat) {
            const unreadMessages = messages.filter(msg =>
                msg.senderId === selectedChat.userId &&
                msg.receiverId === currentUser.id &&
                !msg.read
            );
            unreadMessages.forEach(msg => onMarkAsRead(msg.id));
        }
    }, [selectedChat]);

    const handleSendMessage = () => {
        if (!messageText.trim() || !selectedChat) return;

        onSendMessage({
            senderId: currentUser.id,
            receiverId: selectedChat.userId,
            text: messageText,
            timestamp: new Date().toISOString(),
            read: false
        });

        setMessageText('');
        setShowEmojiPicker(false);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'just now';
        if (minutes < 60) return `${minutes} min`;
        if (hours < 24) return `${hours}h`;
        if (days < 7) return `${days}d`;
        return date.toLocaleDateString();
    };

    const formatMessageTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    const emojis = ['😊', '😂', '❤️', '🔥', '👍', '🎉', '😎', '🙏', '💯', '✨', '💙', '🎨'];

    const getTotalUnreadCount = () => {
        return conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <NavigationBar
                currentUser={currentUser}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                onLogout={onLogout}
            />

            <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 overflow-hidden" style={{ height: 'calc(100vh - 180px)' }}>
                    <div className="flex h-full">
                        {/* LEFT SIDEBAR - CONVERSATIONS LIST */}
                        <div className={`${selectedChat ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-96 border-r border-white/20`}>
                            {/* Header */}
                            <div className="p-6 border-b border-white/10">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <MessageCircle className="w-8 h-8 text-cyan-400" />
                                        <div>
                                            <h1 className="text-2xl font-bold text-white">Messages</h1>
                                            {getTotalUnreadCount() > 0 && (
                                                <p className="text-sm text-cyan-400">
                                                    {getTotalUnreadCount()} unread
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Search */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search conversations..."
                                        className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                                    />
                                </div>
                            </div>

                            {/* Conversations List */}
                            <div className="flex-1 overflow-y-auto">
                                {filteredConversations.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                                        <MessageCircle className="w-16 h-16 text-white/20 mb-4" />
                                        <h3 className="text-xl font-bold text-white mb-2">
                                            {searchQuery ? 'No conversations found' : 'No messages yet'}
                                        </h3>
                                        <p className="text-white/60">
                                            {searchQuery
                                                ? 'Try a different search term'
                                                : 'Start a conversation by messaging a creator!'
                                            }
                                        </p>
                                    </div>
                                ) : (
                                    filteredConversations.map(conv => {
                                        const otherUser = users.find(u => u.id === conv.userId);
                                        if (!otherUser) return null;

                                        const isSelected = selectedChat?.userId === conv.userId;
                                        const lastMsg = conv.lastMessage;
                                        const isMyMessage = lastMsg.senderId === currentUser.id;

                                        return (
                                            <div
                                                key={conv.userId}
                                                onClick={() => setSelectedChat(conv)}
                                                className={`flex items-start gap-3 p-4 cursor-pointer transition-all border-b border-white/5 ${isSelected
                                                        ? 'bg-cyan-500/20 border-l-4 border-l-cyan-500'
                                                        : 'hover:bg-white/5'
                                                    }`}
                                            >
                                                <div className="text-4xl flex-shrink-0">{otherUser.avatar || '👤'}</div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <h3 className="font-bold text-white truncate">{otherUser.username}</h3>
                                                        <span className="text-xs text-white/60 flex-shrink-0 ml-2">
                                                            {formatTime(lastMsg.timestamp)}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <p className={`text-sm truncate ${conv.unreadCount > 0 ? 'text-white font-semibold' : 'text-white/60'}`}>
                                                            {isMyMessage && (
                                                                <span className="mr-1">
                                                                    {lastMsg.read ? <CheckCheck className="w-4 h-4 inline text-cyan-400" /> : <Check className="w-4 h-4 inline text-white/60" />}
                                                                </span>
                                                            )}
                                                            {lastMsg.text}
                                                        </p>
                                                        {conv.unreadCount > 0 && (
                                                            <span className="ml-2 px-2 py-0.5 bg-gradient-to-r from-cyan-500 to-purple-500 text-white text-xs font-bold rounded-full flex-shrink-0">
                                                                {conv.unreadCount}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* RIGHT SIDE - CHAT WINDOW */}
                        <div className={`${selectedChat ? 'flex' : 'hidden md:flex'} flex-col flex-1`}>
                            {selectedChat ? (
                                <>
                                    {/* Chat Header */}
                                    {(() => {
                                        const otherUser = users.find(u => u.id === selectedChat.userId);
                                        return (
                                            <div className="p-4 border-b border-white/10 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => setSelectedChat(null)}
                                                        className="md:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
                                                    >
                                                        <ArrowLeft className="w-5 h-5 text-white" />
                                                    </button>
                                                    <div className="text-3xl">{otherUser?.avatar || '👤'}</div>
                                                    <div>
                                                        <h2 className="font-bold text-white">{otherUser?.username}</h2>
                                                        <p className="text-sm text-white/60">
                                                            {(otherUser?.followers || []).length} followers
                                                        </p>
                                                    </div>
                                                </div>
                                                <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                                                    <MoreVertical className="w-5 h-5 text-white/60" />
                                                </button>
                                            </div>
                                        );
                                    })()}

                                    {/* Messages */}
                                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                        {chatMessages.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-full text-center">
                                                <MessageCircle className="w-16 h-16 text-white/20 mb-4" />
                                                <h3 className="text-xl font-bold text-white mb-2">Start the conversation!</h3>
                                                <p className="text-white/60">Send a message to begin chatting</p>
                                            </div>
                                        ) : (
                                            <>
                                                {chatMessages.map(msg => {
                                                    const isMyMessage = msg.senderId === currentUser.id;
                                                    return (
                                                        <div
                                                            key={msg.id}
                                                            className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}
                                                        >
                                                            <div className={`max-w-md ${isMyMessage ? 'order-2' : 'order-1'}`}>
                                                                <div className={`px-4 py-2 rounded-2xl ${isMyMessage
                                                                        ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
                                                                        : 'bg-white/10 text-white'
                                                                    }`}>
                                                                    <p className="break-words">{msg.text}</p>
                                                                </div>
                                                                <div className={`flex items-center gap-1 mt-1 text-xs text-white/60 ${isMyMessage ? 'justify-end' : 'justify-start'}`}>
                                                                    <span>{formatMessageTime(msg.timestamp)}</span>
                                                                    {isMyMessage && (
                                                                        <span>
                                                                            {msg.read
                                                                                ? <CheckCheck className="w-3 h-3 text-cyan-400" />
                                                                                : <Check className="w-3 h-3" />
                                                                            }
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                <div ref={messagesEndRef} />
                                            </>
                                        )}
                                    </div>

                                    {/* Message Input */}
                                    <div className="p-4 border-t border-white/10">
                                        {showEmojiPicker && (
                                            <div className="mb-4 p-3 bg-white/5 rounded-xl flex flex-wrap gap-2">
                                                {emojis.map(emoji => (
                                                    <button
                                                        key={emoji}
                                                        onClick={() => {
                                                            setMessageText(messageText + emoji);
                                                            setShowEmojiPicker(false);
                                                        }}
                                                        className="text-2xl hover:scale-125 transition-transform"
                                                    >
                                                        {emoji}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        <div className="flex items-end gap-2">
                                            <button
                                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                                className="p-2 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
                                            >
                                                <Smile className="w-6 h-6 text-white/60" />
                                            </button>
                                            <textarea
                                                value={messageText}
                                                onChange={(e) => setMessageText(e.target.value)}
                                                onKeyPress={handleKeyPress}
                                                placeholder="Type a message..."
                                                rows="1"
                                                className="flex-1 px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none"
                                                style={{ minHeight: '48px', maxHeight: '120px' }}
                                            />
                                            <button
                                                onClick={handleSendMessage}
                                                disabled={!messageText.trim()}
                                                className="p-3 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all flex-shrink-0"
                                            >
                                                <Send className="w-6 h-6 text-white" />
                                            </button>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                                    <MessageCircle className="w-24 h-24 text-white/20 mb-6" />
                                    <h2 className="text-3xl font-bold text-white mb-2">Your Messages</h2>
                                    <p className="text-white/60 mb-6">Select a conversation to start chatting</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default MessagesPage;