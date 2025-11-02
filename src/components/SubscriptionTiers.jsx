import React, { useState } from 'react';
import { Crown, Lock, Check, Star, MessageCircle, Video, Sparkles, TrendingUp } from 'lucide-react';

// Subscription Tier Definitions
export const SUBSCRIPTION_TIERS = {
    bronze: {
        id: 'bronze',
        name: 'Bronze Tier',
        emoji: '🥉',
        price: 5,
        color: 'from-amber-700 to-amber-500',
        borderColor: 'border-amber-500',
        perks: [
            'Exclusive posts',
            'Subscriber badge',
            'Early access to content',
            'Support the creator'
        ]
    },
    silver: {
        id: 'silver',
        name: 'Silver Tier',
        emoji: '🥈',
        price: 10,
        color: 'from-gray-400 to-gray-200',
        borderColor: 'border-gray-400',
        perks: [
            'All Bronze perks',
            'Direct messages',
            'Behind the scenes content',
            'Monthly Q&A sessions',
            'Exclusive community access'
        ]
    },
    gold: {
        id: 'gold',
        name: 'Gold Tier',
        emoji: '🥇',
        price: 20,
        color: 'from-yellow-500 to-yellow-300',
        borderColor: 'border-yellow-500',
        perks: [
            'All Silver perks',
            'Custom content requests',
            '1-on-1 video calls',
            'Priority support',
            'Your name in credits',
            'Exclusive merchandise'
        ]
    }
};

// Subscription Tiers Component
function SubscriptionTiers({ creator, currentUser, onSubscribe, onUnsubscribe }) {
    const [selectedTier, setSelectedTier] = useState(null);

    // Get current subscription status
    const currentSubscription = currentUser?.subscriptions?.find(
        sub => sub.creatorId === creator.id
    );

    const handleSubscribe = (tierId) => {
        const tier = SUBSCRIPTION_TIERS[tierId];
        if (currentUser.earnings < tier.price) {
            alert(`❌ Insufficient balance! You need $${tier.price} to subscribe.`);
            return;
        }

        onSubscribe(creator.id, tierId, tier.price);
        setSelectedTier(null);
    };

    const handleUnsubscribe = () => {
        if (window.confirm('Are you sure you want to unsubscribe?')) {
            onUnsubscribe(creator.id);
        }
    };

    // Calculate total subscribers and monthly revenue
    const subscribers = creator.subscribers || [];
    const totalSubscribers = subscribers.length;
    const monthlyRevenue = subscribers.reduce((sum, sub) => {
        return sum + SUBSCRIPTION_TIERS[sub.tier].price;
    }, 0);

    return (
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Crown className="w-7 h-7 text-yellow-400" />
                    Support {creator.username}
                </h2>
                {currentSubscription && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/50 rounded-full">
                        <Check className="w-4 h-4 text-green-400" />
                        <span className="text-sm font-semibold text-green-400">
                            {SUBSCRIPTION_TIERS[currentSubscription.tier].name}
                        </span>
                    </div>
                )}
            </div>

            {/* Tier Cards */}
            <div className="grid gap-4 mb-6">
                {Object.values(SUBSCRIPTION_TIERS).map((tier) => {
                    const isCurrentTier = currentSubscription?.tier === tier.id;
                    const isHigherTier = currentSubscription &&
                        SUBSCRIPTION_TIERS[currentSubscription.tier].price >= tier.price;

                    return (
                        <div
                            key={tier.id}
                            className={`relative p-6 rounded-xl border-2 ${isCurrentTier
                                    ? 'border-green-500 bg-green-500/10'
                                    : `${tier.borderColor} bg-white/5`
                                } transition-all hover:bg-white/10`}
                        >
                            {/* Tier Header */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <span className="text-4xl">{tier.emoji}</span>
                                    <div>
                                        <h3 className="text-xl font-bold text-white">{tier.name}</h3>
                                        <p className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                                            ${tier.price}/month
                                        </p>
                                    </div>
                                </div>
                                {isCurrentTier && (
                                    <div className="px-3 py-1 bg-green-500 text-white text-sm font-bold rounded-full">
                                        ACTIVE
                                    </div>
                                )}
                            </div>

                            {/* Perks List */}
                            <div className="space-y-2 mb-6">
                                {tier.perks.map((perk, index) => (
                                    <div key={index} className="flex items-start gap-2">
                                        <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                                        <span className="text-white/80 text-sm">{perk}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Action Button */}
                            {creator.id === currentUser?.id ? (
                                <button
                                    disabled
                                    className="w-full py-3 bg-white/10 text-white/60 rounded-xl font-semibold cursor-not-allowed"
                                >
                                    Your Tier
                                </button>
                            ) : isCurrentTier ? (
                                <button
                                    onClick={handleUnsubscribe}
                                    className="w-full py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/50 rounded-xl font-semibold transition-all"
                                >
                                    Unsubscribe
                                </button>
                            ) : isHigherTier ? (
                                <button
                                    onClick={() => handleSubscribe(tier.id)}
                                    className="w-full py-3 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl font-semibold transition-all"
                                >
                                    Switch to {tier.name}
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleSubscribe(tier.id)}
                                    className={`w-full py-3 bg-gradient-to-r ${tier.color} text-white rounded-xl font-semibold hover:shadow-lg transition-all`}
                                >
                                    Subscribe Now
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Stats (visible to creator) */}
            {creator.id === currentUser?.id && (
                <div className="p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-green-400">
                            <TrendingUp className="w-5 h-5" />
                            <span className="font-semibold">
                                {totalSubscribers} subscriber{totalSubscribers !== 1 ? 's' : ''}
                            </span>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-bold text-white">
                                ${monthlyRevenue.toFixed(2)}/mo
                            </p>
                            <p className="text-sm text-white/60">Recurring revenue</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Info for viewers */}
            {creator.id !== currentUser?.id && !currentSubscription && (
                <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
                    <p className="text-sm text-cyan-400">
                        💡 Subscribe to unlock exclusive content and support {creator.username}!
                    </p>
                </div>
            )}
        </div>
    );
}

// Subscriber Badge Component
export function SubscriberBadge({ tier }) {
    if (!tier) return null;

    const tierInfo = SUBSCRIPTION_TIERS[tier];
    return (
        <span className="text-lg" title={tierInfo.name}>
            {tierInfo.emoji}
        </span>
    );
}

// Locked Content Component
function LockedContent({ requiredTier, creator, currentUser, onSubscribe }) {
    const tier = SUBSCRIPTION_TIERS[requiredTier];
    const userSubscription = currentUser?.subscriptions?.find(
        sub => sub.creatorId === creator.id
    );

    const hasAccess = userSubscription &&
        SUBSCRIPTION_TIERS[userSubscription.tier].price >= tier.price;

    if (hasAccess) return null;

    return (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md rounded-2xl flex items-center justify-center z-10">
            <div className="text-center p-8">
                <Lock className="w-16 h-16 text-white/40 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white mb-2">
                    {tier.emoji} {tier.name} Exclusive
                </h3>
                <p className="text-white/80 mb-6">
                    Subscribe to {tier.name} or higher to unlock this content
                </p>
                <button
                    onClick={() => onSubscribe(creator.id, requiredTier, tier.price)}
                    className={`px-8 py-3 bg-gradient-to-r ${tier.color} text-white rounded-xl font-bold hover:shadow-lg transition-all`}
                >
                    Subscribe for ${tier.price}/month
                </button>
            </div>
        </div>
    );
}

// Subscriber List Component (for creators)
function SubscriberList({ subscribers, users }) {
    const [filter, setFilter] = useState('all'); // 'all', 'bronze', 'silver', 'gold'

    const filteredSubscribers = filter === 'all'
        ? subscribers
        : subscribers.filter(sub => sub.tier === filter);

    return (
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Star className="w-7 h-7 text-yellow-400" />
                    Your Subscribers
                </h2>
                <div className="text-right">
                    <p className="text-3xl font-bold text-white">{subscribers.length}</p>
                    <p className="text-sm text-white/60">Total subscribers</p>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-all ${filter === 'all'
                            ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
                            : 'bg-white/10 text-white/60 hover:bg-white/20'
                        }`}
                >
                    All ({subscribers.length})
                </button>
                {Object.values(SUBSCRIPTION_TIERS).map((tier) => {
                    const count = subscribers.filter(sub => sub.tier === tier.id).length;
                    return (
                        <button
                            key={tier.id}
                            onClick={() => setFilter(tier.id)}
                            className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-all ${filter === tier.id
                                    ? `bg-gradient-to-r ${tier.color} text-white`
                                    : 'bg-white/10 text-white/60 hover:bg-white/20'
                                }`}
                        >
                            {tier.emoji} {tier.name} ({count})
                        </button>
                    );
                })}
            </div>

            {/* Subscriber List */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredSubscribers.length === 0 ? (
                    <div className="text-center py-12">
                        <Star className="w-16 h-16 text-white/20 mx-auto mb-4" />
                        <p className="text-white/60">No subscribers in this tier yet</p>
                    </div>
                ) : (
                    filteredSubscribers.map((sub) => {
                        const user = users.find(u => u.id === sub.userId);
                        if (!user) return null;

                        const tier = SUBSCRIPTION_TIERS[sub.tier];
                        const subscribedDate = new Date(sub.subscribedAt);
                        const daysSubscribed = Math.floor(
                            (new Date() - subscribedDate) / (1000 * 60 * 60 * 24)
                        );

                        return (
                            <div
                                key={sub.userId}
                                className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="text-3xl">{user.avatar || '👤'}</div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-white">{user.username}</p>
                                            <span className="text-lg">{tier.emoji}</span>
                                        </div>
                                        <p className="text-sm text-white/60">
                                            Subscribed {daysSubscribed} day{daysSubscribed !== 1 ? 's' : ''} ago
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-white">${tier.price}/mo</p>
                                    <p className="text-xs text-white/60">{tier.name}</p>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Revenue Summary */}
            {filteredSubscribers.length > 0 && (
                <div className="mt-6 p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl">
                    <div className="flex items-center justify-between">
                        <span className="text-white/80">
                            {filter === 'all' ? 'Total' : SUBSCRIPTION_TIERS[filter].name} Revenue:
                        </span>
                        <span className="text-2xl font-bold text-white">
                            ${filteredSubscribers.reduce((sum, sub) =>
                                sum + SUBSCRIPTION_TIERS[sub.tier].price, 0
                            ).toFixed(2)}/month
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}

// Export components
export { SubscriptionTiers, LockedContent, SubscriberList };
export default SubscriptionTiers;