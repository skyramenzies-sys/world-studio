import React, { useState } from 'react';
import { X, Copy, Check, Share2 } from 'lucide-react';

function ShareModal({ isOpen, onClose, post, currentUser }) {
    const [copied, setCopied] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    if (!isOpen || !post) return null;

    // Genereer de share URL (in productie zou dit je echte domain zijn)
    const shareUrl = `${window.location.origin}/post/${post.id}`;
    const shareText = `Check out "${post.title}" by ${post.username} on World-Studio! 🌍`;

    // Social Media Share Functions
    const shareToFacebook = () => {
        // Facebook Share Dialog
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
        window.open(facebookUrl, '_blank', 'width=600,height=400');
        showSuccessMessage('Opening Facebook...');
    };

    const shareToTwitter = () => {
        // Twitter/X Share
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
        window.open(twitterUrl, '_blank', 'width=600,height=400');
        showSuccessMessage('Opening Twitter...');
    };

    const shareToWhatsApp = () => {
        // WhatsApp Share
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`;
        window.open(whatsappUrl, '_blank');
        showSuccessMessage('Opening WhatsApp...');
    };

    const shareToTelegram = () => {
        // Telegram Share
        const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
        window.open(telegramUrl, '_blank');
        showSuccessMessage('Opening Telegram...');
    };

    const shareToLinkedIn = () => {
        // LinkedIn Share
        const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
        window.open(linkedinUrl, '_blank', 'width=600,height=400');
        showSuccessMessage('Opening LinkedIn...');
    };

    const shareToReddit = () => {
        // Reddit Share
        const redditUrl = `https://reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(post.title)}`;
        window.open(redditUrl, '_blank', 'width=800,height=600');
        showSuccessMessage('Opening Reddit...');
    };

    const shareToEmail = () => {
        // Email Share
        const emailSubject = `Check out "${post.title}" on World-Studio`;
        const emailBody = `${shareText}\n\n${shareUrl}`;
        const emailUrl = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
        window.location.href = emailUrl;
        showSuccessMessage('Opening Email...');
    };

    const shareToSnapchat = () => {
        // Snapchat Share (mobiel only, desktop opent QR code)
        const snapchatUrl = `https://www.snapchat.com/scan?attachmentUrl=${encodeURIComponent(shareUrl)}`;
        window.open(snapchatUrl, '_blank');
        showSuccessMessage('Opening Snapchat...');
    };

    const shareToMessenger = () => {
        // Facebook Messenger Share
        const messengerUrl = `fb-messenger://share?link=${encodeURIComponent(shareUrl)}`;
        // Fallback naar web versie
        const messengerWebUrl = `https://www.facebook.com/dialog/send?link=${encodeURIComponent(shareUrl)}&app_id=YOUR_APP_ID&redirect_uri=${encodeURIComponent(shareUrl)}`;

        // Probeer eerst de app, dan web fallback
        const a = document.createElement('a');
        a.href = messengerUrl;
        a.click();

        // Als app niet opent, gebruik web versie na 1 seconde
        setTimeout(() => {
            window.open(messengerWebUrl, '_blank');
        }, 1000);

        showSuccessMessage('Opening Messenger...');
    };

    const shareViaPinterest = () => {
        // Pinterest Share (werkt alleen met images)
        if (post.type === 'image' && post.fileUrl) {
            const pinterestUrl = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(shareUrl)}&media=${encodeURIComponent(shareUrl)}&description=${encodeURIComponent(post.title)}`;
            window.open(pinterestUrl, '_blank', 'width=750,height=550');
            showSuccessMessage('Opening Pinterest...');
        } else {
            alert('Pinterest sharing only works with images!');
        }
    };

    const shareViaTumblr = () => {
        // Tumblr Share
        const tumblrUrl = `https://www.tumblr.com/widgets/share/tool?canonicalUrl=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(post.title)}&caption=${encodeURIComponent(post.description || shareText)}`;
        window.open(tumblrUrl, '_blank', 'width=600,height=400');
        showSuccessMessage('Opening Tumblr...');
    };

    // Native Web Share API (voor mobiele devices)
    const shareViaWebShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: post.title,
                    text: shareText,
                    url: shareUrl
                });
                showSuccessMessage('Shared successfully!');
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error('Error sharing:', error);
                }
            }
        } else {
            alert('Web Share API not supported on this device');
        }
    };

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            showSuccessMessage('Link copied to clipboard!');
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            // Fallback voor oude browsers
            const textArea = document.createElement('textarea');
            textArea.value = shareUrl;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopied(true);
            showSuccessMessage('Link copied to clipboard!');
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const showSuccessMessage = (message) => {
        setShowSuccess(message);
        setTimeout(() => setShowSuccess(false), 2000);
    };

    const socialPlatforms = [
        { name: 'Facebook', icon: '📘', color: 'from-blue-600 to-blue-700', action: shareToFacebook },
        { name: 'Twitter/X', icon: '🐦', color: 'from-sky-500 to-sky-600', action: shareToTwitter },
        { name: 'WhatsApp', icon: '💬', color: 'from-green-500 to-green-600', action: shareToWhatsApp },
        {
            name: 'Instagram', icon: '📷', color: 'from-pink-500 to-purple-600', action: () => {
                alert('📱 Instagram sharing works best on mobile!\n\n1. Copy the link\n2. Open Instagram\n3. Create a story/post\n4. Add the link to your bio or story');
                copyToClipboard();
            }
        },
        { name: 'Snapchat', icon: '👻', color: 'from-yellow-400 to-yellow-500', action: shareToSnapchat },
        { name: 'Telegram', icon: '✈️', color: 'from-blue-400 to-blue-500', action: shareToTelegram },
        { name: 'LinkedIn', icon: '💼', color: 'from-blue-700 to-blue-800', action: shareToLinkedIn },
        { name: 'Messenger', icon: '💬', color: 'from-blue-500 to-purple-500', action: shareToMessenger },
        { name: 'Pinterest', icon: '📌', color: 'from-red-600 to-red-700', action: shareViaPinterest },
        { name: 'Reddit', icon: '🤖', color: 'from-orange-500 to-orange-600', action: shareToReddit },
        { name: 'Tumblr', icon: '📝', color: 'from-indigo-500 to-indigo-600', action: shareViaTumblr },
        { name: 'Email', icon: '📧', color: 'from-gray-600 to-gray-700', action: shareToEmail },
    ];

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-fadeIn">
            <div className="bg-slate-900 rounded-2xl border border-white/20 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-slate-900 p-6 border-b border-white/10 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            <Share2 className="w-6 h-6" />
                            Share Content
                        </h2>
                        <p className="text-white/60 text-sm mt-1">Share "{post.title}" with your friends</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X className="w-6 h-6 text-white" />
                    </button>
                </div>

                {/* Content Preview */}
                <div className="p-6 border-b border-white/10">
                    <div className="bg-white/5 rounded-xl p-4 flex gap-4">
                        {post.type === 'image' && post.fileUrl && (
                            <img
                                src={post.fileUrl}
                                alt={post.title}
                                className="w-20 h-20 object-cover rounded-lg"
                            />
                        )}
                        {!post.fileUrl && (
                            <div className="w-20 h-20 bg-white/10 rounded-lg flex items-center justify-center text-3xl">
                                {post.thumbnail || '📦'}
                            </div>
                        )}
                        <div className="flex-1">
                            <h3 className="font-bold text-white mb-1">{post.title}</h3>
                            <p className="text-white/60 text-sm line-clamp-2">{post.description || 'No description'}</p>
                            <p className="text-white/40 text-xs mt-1">by {post.username}</p>
                        </div>
                    </div>
                </div>

                {/* Copy Link Section */}
                <div className="p-6 border-b border-white/10">
                    <label className="block text-white font-semibold mb-3">Copy Link</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={shareUrl}
                            readOnly
                            className="flex-1 px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                        />
                        <button
                            onClick={copyToClipboard}
                            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center gap-2"
                        >
                            {copied ? (
                                <>
                                    <Check className="w-5 h-5" />
                                    Copied!
                                </>
                            ) : (
                                <>
                                    <Copy className="w-5 h-5" />
                                    Copy
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Native Share (Mobile Only) */}
                {navigator.share && (
                    <div className="p-6 border-b border-white/10">
                        <button
                            onClick={shareViaWebShare}
                            className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
                        >
                            <Share2 className="w-5 h-5" />
                            Share via Device
                        </button>
                    </div>
                )}

                {/* Social Platforms Grid */}
                <div className="p-6">
                    <label className="block text-white font-semibold mb-4">Share to Social Media</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {socialPlatforms.map((platform) => (
                            <button
                                key={platform.name}
                                onClick={platform.action}
                                className={`p-4 bg-gradient-to-br ${platform.color} rounded-xl text-white font-semibold hover:shadow-lg transition-all transform hover:scale-105 active:scale-95 flex flex-col items-center gap-2`}
                            >
                                <span className="text-3xl">{platform.icon}</span>
                                <span className="text-sm">{platform.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Instagram Instructions */}
                <div className="p-6 bg-gradient-to-r from-pink-500/10 to-purple-500/10 border-t border-white/10">
                    <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                        📷 Sharing to Instagram
                    </h3>
                    <p className="text-white/60 text-sm mb-3">
                        Instagram doesn't allow direct web sharing. Here's how to share:
                    </p>
                    <ol className="text-white/80 text-sm space-y-1 list-decimal list-inside">
                        <li>Copy the link using the button above</li>
                        <li>Open Instagram app on your phone</li>
                        <li>Create a Story or Post</li>
                        <li>Add the link in your bio or story link sticker</li>
                    </ol>
                </div>
            </div>

            {/* Success Toast */}
            {showSuccess && (
                <div className="fixed bottom-6 right-6 bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg animate-slideUp flex items-center gap-2">
                    <Check className="w-5 h-5" />
                    {showSuccess}
                </div>
            )}
        </div>
    );
}

export default ShareModal;