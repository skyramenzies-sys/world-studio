import React, { useState, useEffect } from 'react';
import { X, Send, Eye, ChevronLeft, ChevronRight, Plus, Image as ImageIcon } from 'lucide-react';

// Story Viewer Component
function StoryViewer({ story, stories, currentIndex, onClose, onNext, onPrevious, onReply, currentUser, users }) {
    const [progress, setProgress] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [replyText, setReplyText] = useState('');
    const STORY_DURATION = 5000; // 5 seconds per story

    const storyCreator = users?.find(u => u.id === story.userId);

    useEffect(() => {
        if (isPaused) return;

        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    onNext();
                    return 0;
                }
                return prev + (100 / (STORY_DURATION / 100));
            });
        }, 100);

        return () => clearInterval(interval);
    }, [isPaused, onNext]);

    const handleReply = () => {
        if (!replyText.trim()) return;
        onReply(story.userId, replyText);
        setReplyText('');
    };

    const formatTime = (timestamp) => {
        const now = new Date();
        const time = new Date(timestamp);
        const diff = Math.floor((now - time) / 1000);

        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    };

    return (
        <div
            className="fixed inset-0 bg-black z-50 flex items-center justify-center"
            onMouseDown={() => setIsPaused(true)}
            onMouseUp={() => setIsPaused(false)}
            onMouseLeave={() => setIsPaused(false)}
        >
            {/* Progress Bars */}
            <div className="absolute top-4 left-4 right-4 flex gap-1 z-10">
                {stories.map((_, index) => (
                    <div key={index} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-white transition-all"
                            style={{
                                width: index === currentIndex ? `${progress}%` : index < currentIndex ? '100%' : '0%'
                            }}
                        />
                    </div>
                ))}
            </div>

            {/* Header */}
            <div className="absolute top-8 left-4 right-4 flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                    <div className="text-3xl">{storyCreator?.avatar || '👤'}</div>
                    <div>
                        <p className="font-bold text-white">{storyCreator?.username}</p>
                        <p className="text-sm text-white/80">{formatTime(story.timestamp)}</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                    <X className="w-6 h-6 text-white" />
                </button>
            </div>

            {/* Navigation Arrows */}
            {currentIndex > 0 && (
                <button
                    onClick={onPrevious}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 rounded-full transition-colors z-10"
                >
                    <ChevronLeft className="w-6 h-6 text-white" />
                </button>
            )}
            {currentIndex < stories.length - 1 && (
                <button
                    onClick={onNext}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 rounded-full transition-colors z-10"
                >
                    <ChevronRight className="w-6 h-6 text-white" />
                </button>
            )}

            {/* Story Content */}
            <div className="w-full max-w-md h-full flex items-center justify-center p-4">
                <div className="relative w-full">
                    {story.type === 'image' ? (
                        <img
                            src={story.mediaUrl}
                            alt="Story"
                            className="w-full h-auto max-h-[70vh] object-contain rounded-2xl"
                        />
                    ) : story.type === 'text' ? (
                        <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl p-12 min-h-[400px] flex items-center justify-center">
                            <p className="text-white text-3xl font-bold text-center break-words">
                                {story.text}
                            </p>
                        </div>
                    ) : null}

                    {story.caption && (
                        <p className="text-white text-center mt-4 px-4">{story.caption}</p>
                    )}
                </div>
            </div>

            {/* Footer - Views & Reply */}
            <div className="absolute bottom-4 left-4 right-4 z-10">
                <div className="mb-4 flex items-center justify-center gap-2 text-white/80">
                    <Eye className="w-5 h-5" />
                    <span>{story.views?.length || 0} views</span>
                </div>

                {story.userId !== currentUser?.id && (
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleReply()}
                            placeholder="Reply to story..."
                            className="flex-1 px-4 py-3 bg-white/20 backdrop-blur-lg border border-white/30 rounded-full text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
                        />
                        <button
                            onClick={handleReply}
                            className="p-3 bg-white hover:bg-white/90 rounded-full transition-colors"
                        >
                            <Send className="w-5 h-5 text-purple-600" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// Story Ring Component (for avatar)
function StoryRing({ user, hasUnseenStories, onClick, isCurrentUser }) {
    return (
        <button
            onClick={onClick}
            className="flex flex-col items-center gap-2 flex-shrink-0"
        >
            <div className={`relative ${hasUnseenStories ? 'p-1 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600' : ''}`}>
                <div className={`text-5xl bg-slate-900 rounded-full ${hasUnseenStories ? 'p-1' : ''} flex items-center justify-center`}>
                    {isCurrentUser ? (
                        <div className="relative">
                            {user.avatar || '👤'}
                            {isCurrentUser && (
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full flex items-center justify-center border-2 border-slate-900">
                                    <Plus className="w-3 h-3 text-white" />
                                </div>
                            )}
                        </div>
                    ) : (
                        user.avatar || '👤'
                    )}
                </div>
            </div>
            <span className={`text-xs ${hasUnseenStories ? 'font-semibold text-white' : 'text-white/60'} max-w-[70px] truncate`}>
                {isCurrentUser ? 'Your Story' : user.username}
            </span>
        </button>
    );
}

// Story Upload Modal
function StoryUploadModal({ isOpen, onClose, onUpload, currentUser }) {
    const [storyType, setStoryType] = useState('text');
    const [text, setText] = useState('');
    const [caption, setCaption] = useState('');
    const [imageUrl, setImageUrl] = useState('');

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => setImageUrl(e.target.result);
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = () => {
        if (storyType === 'text' && !text.trim()) {
            alert('Please enter some text');
            return;
        }
        if (storyType === 'image' && !imageUrl) {
            alert('Please select an image');
            return;
        }

        onUpload({
            type: storyType,
            text: storyType === 'text' ? text : '',
            mediaUrl: storyType === 'image' ? imageUrl : '',
            caption: caption,
            timestamp: new Date().toISOString()
        });

        setText('');
        setCaption('');
        setImageUrl('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-6">
            <div className="bg-slate-900 rounded-2xl border border-white/20 p-8 max-w-md w-full">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-white">Create Story</h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <X className="w-6 h-6 text-white" />
                    </button>
                </div>

                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => setStoryType('text')}
                        className={`flex-1 py-3 rounded-xl font-semibold transition-all ${storyType === 'text'
                                ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
                                : 'bg-white/10 text-white/60 hover:bg-white/20'
                            }`}
                    >
                        📝 Text Story
                    </button>
                    <button
                        onClick={() => setStoryType('image')}
                        className={`flex-1 py-3 rounded-xl font-semibold transition-all ${storyType === 'image'
                                ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
                                : 'bg-white/10 text-white/60 hover:bg-white/20'
                            }`}
                    >
                        📷 Photo Story
                    </button>
                </div>

                {storyType === 'text' ? (
                    <div className="mb-4">
                        <label className="block text-white font-semibold mb-2">Your Message</label>
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="What's on your mind?"
                            rows="4"
                            maxLength="200"
                            className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none"
                        />
                        <p className="text-sm text-white/60 mt-1">{text.length}/200 characters</p>
                    </div>
                ) : (
                    <div className="mb-4">
                        <label className="block text-white font-semibold mb-2">Upload Photo</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileSelect}
                            className="hidden"
                            id="story-image-upload"
                        />
                        <label
                            htmlFor="story-image-upload"
                            className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-white/40 transition-colors"
                        >
                            {imageUrl ? (
                                <img src={imageUrl} alt="Preview" className="w-full h-full object-cover rounded-xl" />
                            ) : (
                                <>
                                    <ImageIcon className="w-12 h-12 text-white/40 mb-2" />
                                    <p className="text-white/60">Click to upload image</p>
                                </>
                            )}
                        </label>
                    </div>
                )}

                <div className="mb-6">
                    <label className="block text-white font-semibold mb-2">Caption (optional)</label>
                    <input
                        type="text"
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        placeholder="Add a caption..."
                        maxLength="100"
                        className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    />
                </div>

                <div className="mb-6 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
                    <p className="text-sm text-cyan-400">
                        ⏰ Your story will be visible for 24 hours
                    </p>
                </div>

                <button
                    onClick={handleSubmit}
                    className="w-full py-4 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white rounded-xl font-bold text-lg transition-all shadow-lg"
                >
                    Share Story
                </button>
            </div>
        </div>
    );
}

// Main Stories Component
function Stories({ currentUser, users, stories, onAddStory, onViewStory, onReplyToStory }) {
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [viewingStories, setViewingStories] = useState(null);
    const [currentStoryIndex, setCurrentStoryIndex] = useState(0);

    const getStoriesByUser = () => {
        const grouped = new Map();
        stories.forEach(story => {
            if (!grouped.has(story.userId)) {
                grouped.set(story.userId, []);
            }
            grouped.get(story.userId).push(story);
        });
        grouped.forEach((userStories) => {
            userStories.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        });
        return grouped;
    };

    const storiesByUser = getStoriesByUser();

    const hasUnseenStories = (userId) => {
        const userStories = storiesByUser.get(userId) || [];
        return userStories.some(story =>
            !(story.views || []).includes(currentUser?.id) &&
            story.userId !== currentUser?.id
        );
    };

    const handleStoryClick = (userId) => {
        if (userId === currentUser?.id && (storiesByUser.get(userId)?.length || 0) === 0) {
            setShowUploadModal(true);
            return;
        }

        const userStories = storiesByUser.get(userId) || [];
        if (userStories.length > 0) {
            setViewingStories(userStories);
            setCurrentStoryIndex(0);
            if (!userStories[0].views?.includes(currentUser?.id)) {
                onViewStory(userStories[0].id);
            }
        }
    };

    const handleNext = () => {
        if (currentStoryIndex < viewingStories.length - 1) {
            const nextIndex = currentStoryIndex + 1;
            setCurrentStoryIndex(nextIndex);
            const nextStory = viewingStories[nextIndex];
            if (!nextStory.views?.includes(currentUser?.id)) {
                onViewStory(nextStory.id);
            }
        } else {
            setViewingStories(null);
            setCurrentStoryIndex(0);
        }
    };

    const handlePrevious = () => {
        if (currentStoryIndex > 0) {
            setCurrentStoryIndex(currentStoryIndex - 1);
        }
    };

    const usersWithStories = [
        currentUser,
        ...users.filter(u => u.id !== currentUser?.id && storiesByUser.has(u.id))
    ].filter(Boolean);

    return (
        <>
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 mb-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <span>📖</span>
                    <span>Stories</span>
                </h2>

                <div className="flex gap-4 overflow-x-auto pb-2">
                    {usersWithStories.map(user => (
                        <StoryRing
                            key={user.id}
                            user={user}
                            hasUnseenStories={hasUnseenStories(user.id)}
                            onClick={() => handleStoryClick(user.id)}
                            isCurrentUser={user.id === currentUser?.id}
                        />
                    ))}

                    {usersWithStories.length === 0 && (
                        <div className="text-center py-8 w-full">
                            <p className="text-white/60">No stories yet. Be the first to share!</p>
                            <button
                                onClick={() => setShowUploadModal(true)}
                                className="mt-4 px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                            >
                                Create Story
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <StoryUploadModal
                isOpen={showUploadModal}
                onClose={() => setShowUploadModal(false)}
                onUpload={onAddStory}
                currentUser={currentUser}
            />

            {viewingStories && (
                <StoryViewer
                    story={viewingStories[currentStoryIndex]}
                    stories={viewingStories}
                    currentIndex={currentStoryIndex}
                    onClose={() => {
                        setViewingStories(null);
                        setCurrentStoryIndex(0);
                    }}
                    onNext={handleNext}
                    onPrevious={handlePrevious}
                    onReply={onReplyToStory}
                    currentUser={currentUser}
                    users={users}
                />
            )}
        </>
    );
}

export default Stories;