import React, { useState } from 'react';
import { X, Search } from 'lucide-react';

function EmojiSelector({ isOpen, onClose, onSelect, currentEmoji }) {
    const [searchQuery, setSearchQuery] = useState('');

    const emojiCategories = {
        'People': ['👤', '😀', '😎', '🤓', '😇', '🥳', '🤩', '😍', '🥰', '😘', '😋', '🤪', '🧐', '🤠', '👨', '👩', '🧑', '👶', '👧', '👦', '👨‍🎨', '👩‍🎨', '👨‍🎤', '👩‍🎤', '👨‍💻', '👩‍💻', '🧑‍🎨', '👨‍🚀', '👩‍🚀', '🦸', '🦹', '🧙', '🧚', '🧛'],
        'Animals': ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦗', '🦟', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🦬', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐈‍⬛', '🪶', '🐓', '🦃', '🦤', '🦚', '🦜', '🦢', '🦩', '🕊️', '🐇', '🦝', '🦨', '🦡', '🦦', '🦥', '🐁', '🐀', '🐿️', '🦔'],
        'Creative': ['🎨', '🎭', '🎪', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🪕', '🎻', '🎲', '♟️', '🎯', '🎳', '🎮', '🎰', '🧩', '🪀', '🪁', '🎏', '🎐', '🎀', '🎁', '🎊', '🎉', '🎈', '🏆', '🥇', '🥈', '🥉', '⚽', '⚾', '🥎', '🏀', '🏐', '🏈', '🏉', '🎾', '🥏', '🎳', '🏏', '🏑', '🏒', '🥍', '🏓', '🏸', '🥊', '🥋', '🥅', '⛳', '⛸️', '🎣', '🤿', '🎽', '🎿', '🛷', '🥌'],
        'Nature': ['🌸', '🌺', '🌻', '🌷', '🌹', '🥀', '🏵️', '💐', '🌱', '🌿', '🍀', '🍃', '🍂', '🍁', '🌾', '🌲', '🌳', '🌴', '🌵', '🌊', '🌬️', '🌀', '🌈', '🌂', '☂️', '☔', '⛱️', '⚡', '❄️', '☃️', '⛄', '☄️', '🔥', '💧', '🌊', '🎋', '🎍'],
        'Food': ['🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🫓', '🥪', '🥙', '🧆', '🌮', '🌯', '🫔', '🥗', '🥘', '🫕', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🥜', '🍯'],
        'Objects': ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '⛹️', '🤺', '🤾', '🏌️', '🏇', '🧘', '🏄', '🏊', '🤽', '🚣', '🧗', '🚵', '🚴', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🎗️', '🏵️', '🎫', '🎟️', '🎪', '🤹', '🎭', '🩰', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🪘', '🎷', '🎺', '🪗', '🎸', '🪕', '🎻', '🪈', '🎲', '♟️', '🎯', '🎳', '🎮', '🎰', '🧩'],
        'Tech': ['💻', '🖥️', '🖨️', '⌨️', '🖱️', '🖲️', '💽', '💾', '💿', '📀', '📱', '📲', '☎️', '📞', '📟', '📠', '📡', '🔌', '🔋', '🪫', '💡', '🔦', '🕯️', '🪔', '🧯', '🛢️', '💸', '💵', '💴', '💶', '💷', '💰', '💳', '💎', '⚖️', '🪜', '🧰', '🪛', '🔧', '🔨', '⚒️', '🛠️', '⛏️', '🪚', '🔩', '⚙️', '🪤', '🧱', '⛓️', '🧲', '🔫', '💣', '🧨', '🪓', '🔪', '🗡️', '⚔️', '🛡️', '🚬', '⚰️', '🪦', '⚱️', '🏺', '🔮', '📿', '🧿', '💈', '⚗️', '🔭', '🔬', '🕳️', '🩹', '🩺', '💊', '💉', '🩸', '🧬', '🦠', '🧫', '🧪', '🌡️', '🧹', '🪠', '🧺', '🧻', '🪣', '🧼', '🫧', '🪥', '🧽', '🧴', '🛎️', '🔑', '🗝️', '🚪', '🪑', '🛋️', '🛏️', '🛌', '🧸', '🪆', '🖼️', '🪞', '🪟', '🛍️', '🛒', '🎁', '🎈', '🎏', '🎀', '🪄', '🪅', '🎊', '🎉', '🎎', '🏮', '🎐', '🧧'],
        'Symbols': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭'],
        'Misc': ['🚀', '🛸', '🛰️', '💺', '🚁', '🛩️', '✈️', '🛫', '🛬', '🪂', '💴', '🎓', '🎩', '👑', '⚡', '🔥', '💫', '⭐', '🌟', '✨', '💥', '💢', '💦', '💨', '🕳️', '💬', '👁️‍🗨️', '🗨️', '🗯️', '💭', '💤', '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄', '💋']
    };

    const allEmojis = Object.values(emojiCategories).flat();
    const filteredEmojis = searchQuery
        ? allEmojis.filter(emoji => {
            // Simple search - you could add emoji names/descriptions for better search
            return true; // Show all for now
        })
        : allEmojis;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-6">
            <div className="bg-slate-900 rounded-2xl border border-white/20 max-w-2xl w-full max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-white/10">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold text-white">Choose Your Avatar</h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <X className="w-6 h-6 text-white" />
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search emojis..."
                            className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                        />
                    </div>

                    {/* Current Selection */}
                    <div className="mt-4 flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                        <span className="text-sm text-white/60">Current:</span>
                        <div className="text-4xl">{currentEmoji}</div>
                    </div>
                </div>

                {/* Emoji Grid */}
                <div className="flex-1 overflow-y-auto p-6">
                    {searchQuery ? (
                        // Search Results
                        <div className="grid grid-cols-8 gap-2">
                            {filteredEmojis.map((emoji, index) => (
                                <button
                                    key={index}
                                    onClick={() => {
                                        onSelect(emoji);
                                        onClose();
                                    }}
                                    className={`text-4xl p-3 rounded-xl hover:bg-white/10 transition-all transform hover:scale-110 ${emoji === currentEmoji ? 'bg-cyan-500/20 ring-2 ring-cyan-500' : ''
                                        }`}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    ) : (
                        // Categories
                        <div className="space-y-6">
                            {Object.entries(emojiCategories).map(([category, emojis]) => (
                                <div key={category}>
                                    <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                                        <span>{emojis[0]}</span>
                                        <span>{category}</span>
                                    </h3>
                                    <div className="grid grid-cols-8 gap-2">
                                        {emojis.map((emoji, index) => (
                                            <button
                                                key={index}
                                                onClick={() => {
                                                    onSelect(emoji);
                                                    onClose();
                                                }}
                                                className={`text-4xl p-3 rounded-xl hover:bg-white/10 transition-all transform hover:scale-110 ${emoji === currentEmoji ? 'bg-cyan-500/20 ring-2 ring-cyan-500' : ''
                                                    }`}
                                                title={emoji}
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10">
                    <div className="text-center text-sm text-white/60">
                        Click an emoji to select it as your profile picture
                    </div>
                </div>
            </div>
        </div>
    );
}

export default EmojiSelector;