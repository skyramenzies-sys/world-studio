import React from 'react';
import { DollarSign, TrendingUp, ShoppingCart, Users, Crown, Award, BarChart3 } from 'lucide-react';

function PlatformRevenueDashboard({ platformRevenue, posts, users, transactions }) {
    // Calculate statistics
    const totalCreators = users.filter(u => u.role !== 'admin').length;
    const paidPosts = posts.filter(p => !p.isFree);
    const totalContentValue = paidPosts.reduce((sum, p) => sum + (p.price * (p.sales || 0)), 0);
    const creatorTotalEarnings = users.reduce((sum, u) => sum + (u.earnings || 0), 0);

    // Top selling posts
    const topPosts = [...posts]
        .filter(p => !p.isFree && p.sales > 0)
        .sort((a, b) => (b.sales || 0) - (a.sales || 0))
        .slice(0, 5);

    // Top earning creators
    const topCreators = [...users]
        .filter(u => u.role !== 'admin')
        .sort((a, b) => (b.earnings || 0) - (a.earnings || 0))
        .slice(0, 5);

    // Calculate average sale price
    const purchaseTransactions = transactions.filter(t => t.type === 'purchase');
    const avgSalePrice = purchaseTransactions.length > 0
        ? purchaseTransactions.reduce((sum, t) => sum + t.amount, 0) / purchaseTransactions.length
        : 0;

    const stats = [
        {
            label: 'Total Platform Revenue',
            value: `$${platformRevenue.total.toFixed(2)}`,
            subtitle: 'Your 10% commission',
            icon: DollarSign,
            color: 'from-green-500 to-emerald-500',
            emoji: '💰'
        },
        {
            label: 'Total Sales',
            value: platformRevenue.salesCount,
            subtitle: 'Content purchases',
            icon: ShoppingCart,
            color: 'from-blue-500 to-cyan-500',
            emoji: '🛒'
        },
        {
            label: 'Creator Earnings',
            value: `$${creatorTotalEarnings.toFixed(2)}`,
            subtitle: 'Total paid to creators',
            icon: Users,
            color: 'from-purple-500 to-pink-500',
            emoji: '👥'
        },
        {
            label: 'Avg Sale Price',
            value: `$${avgSalePrice.toFixed(2)}`,
            subtitle: 'Per transaction',
            icon: TrendingUp,
            color: 'from-orange-500 to-yellow-500',
            emoji: '📈'
        }
    ];

    // Million Dollar Dreams 🚀
    const currentMonthlyRevenue = platformRevenue.total; // This would be per month in production
    const creatorsNeeded = Math.ceil(1000000 / (avgSalePrice * 0.1 * 10)); // Rough estimate
    const salesNeeded = Math.ceil(1000000 / (avgSalePrice * 0.1));

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
                <div className="flex items-center justify-center gap-3 mb-2">
                    <Crown className="w-10 h-10 text-yellow-400" />
                    <h1 className="text-4xl font-bold text-white">Platform Revenue</h1>
                </div>
                <p className="text-white/60">Your 10% commission dashboard 💰</p>
            </div>

            {/* Main Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, index) => (
                    <div
                        key={index}
                        className={`bg-gradient-to-br ${stat.color} rounded-2xl p-6 text-white`}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className="text-4xl">{stat.emoji}</div>
                            <stat.icon className="w-8 h-8 opacity-70" />
                        </div>
                        <div className="text-3xl font-bold mb-1">{stat.value}</div>
                        <div className="text-sm opacity-90 font-semibold">{stat.label}</div>
                        <div className="text-xs opacity-70 mt-1">{stat.subtitle}</div>
                    </div>
                ))}
            </div>

            {/* Million Dollar Dream */}
            <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 backdrop-blur-lg rounded-2xl p-8 border-2 border-yellow-500/50">
                <div className="flex items-center gap-3 mb-4">
                    <div className="text-5xl">🚀</div>
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-1">Million Dollar Vision</h2>
                        <p className="text-white/60">Road to $1M platform revenue</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="bg-white/10 rounded-xl p-4">
                        <div className="text-white/60 text-sm mb-1">Current Progress</div>
                        <div className="text-2xl font-bold text-yellow-400">${platformRevenue.total.toFixed(0)}</div>
                        <div className="text-xs text-white/40 mt-1">of $1,000,000</div>
                        <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-yellow-400 to-orange-400"
                                style={{ width: `${Math.min((platformRevenue.total / 1000000) * 100, 100)}%` }}
                            ></div>
                        </div>
                    </div>

                    <div className="bg-white/10 rounded-xl p-4">
                        <div className="text-white/60 text-sm mb-1">Sales Needed</div>
                        <div className="text-2xl font-bold text-cyan-400">{salesNeeded.toLocaleString()}</div>
                        <div className="text-xs text-white/40 mt-1">more sales to reach goal</div>
                        <div className="text-xs text-green-400 mt-2">
                            {platformRevenue.salesCount} sales so far! 🎉
                        </div>
                    </div>

                    <div className="bg-white/10 rounded-xl p-4">
                        <div className="text-white/60 text-sm mb-1">If Avg Sale = $10</div>
                        <div className="text-2xl font-bold text-purple-400">{(100000).toLocaleString()}</div>
                        <div className="text-xs text-white/40 mt-1">sales needed (10% = $100k)</div>
                        <div className="text-xs text-purple-400 mt-2">
                            At 10 sales/day = 27 years... or 100/day = 3 years! 📈
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl p-4">
                    <div className="text-white font-semibold mb-2">💡 Quick Math:</div>
                    <div className="text-white/80 text-sm space-y-1">
                        <div>• If 1,000 creators each make 10 sales/month at $10 = <span className="text-green-400 font-bold">$10,000/month</span> for you!</div>
                        <div>• If 10,000 creators each make 10 sales/month at $10 = <span className="text-green-400 font-bold">$100,000/month</span> for you! 🚀</div>
                        <div>• If 100,000 creators each make 10 sales/month at $10 = <span className="text-yellow-400 font-bold">$1,000,000/month</span> - YOU'RE A MILLIONAIRE! 💎</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Selling Posts */}
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                    <div className="flex items-center gap-2 mb-4">
                        <Award className="w-6 h-6 text-yellow-400" />
                        <h3 className="text-xl font-bold text-white">Top Selling Content</h3>
                    </div>
                    <div className="space-y-3">
                        {topPosts.length > 0 ? (
                            topPosts.map((post, index) => {
                                const creatorEarnings = (post.revenue || 0);
                                const platformEarnings = (post.price * (post.sales || 0)) - creatorEarnings;
                                return (
                                    <div key={post.id} className="bg-white/5 rounded-xl p-4">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-2xl">#{index + 1}</span>
                                                    <span className="text-lg font-bold text-white line-clamp-1">{post.title}</span>
                                                </div>
                                                <div className="text-sm text-white/60">by {post.username}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-yellow-400 font-bold">${post.price}</div>
                                                <div className="text-xs text-white/60">{post.sales} sales</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between text-sm pt-2 border-t border-white/10">
                                            <div className="text-white/60">
                                                Creator earned: <span className="text-green-400 font-semibold">${creatorEarnings.toFixed(2)}</span>
                                            </div>
                                            <div className="text-white/60">
                                                You earned: <span className="text-yellow-400 font-semibold">${platformEarnings.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-center py-8 text-white/40">
                                No sales yet. Time to promote! 📢
                            </div>
                        )}
                    </div>
                </div>

                {/* Top Earning Creators */}
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                    <div className="flex items-center gap-2 mb-4">
                        <Users className="w-6 h-6 text-purple-400" />
                        <h3 className="text-xl font-bold text-white">Top Earning Creators</h3>
                    </div>
                    <div className="space-y-3">
                        {topCreators.length > 0 ? (
                            topCreators.map((creator, index) => {
                                const creatorPosts = posts.filter(p => p.userId === creator.id && !p.isFree);
                                const totalSales = creatorPosts.reduce((sum, p) => sum + (p.sales || 0), 0);
                                const yourCutFromCreator = creatorPosts.reduce((sum, p) => {
                                    const revenue = p.price * (p.sales || 0);
                                    return sum + (revenue * 0.1);
                                }, 0);

                                return (
                                    <div key={creator.id} className="bg-white/5 rounded-xl p-4 flex items-center gap-3">
                                        <div className="text-3xl">{index < 3 ? ['🥇', '🥈', '🥉'][index] : '🏆'}</div>
                                        <div className="text-2xl">{creator.avatar}</div>
                                        <div className="flex-1">
                                            <div className="font-bold text-white">{creator.username}</div>
                                            <div className="text-sm text-white/60">{totalSales} sales</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-green-400 font-bold">${(creator.earnings || 0).toFixed(2)}</div>
                                            <div className="text-xs text-yellow-400">You: ${yourCutFromCreator.toFixed(2)}</div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-center py-8 text-white/40">
                                No creators with earnings yet
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="w-6 h-6 text-cyan-400" />
                    <h3 className="text-xl font-bold text-white">Recent Sales</h3>
                </div>
                <div className="space-y-2">
                    {purchaseTransactions.slice(-10).reverse().map(txn => (
                        <div key={txn.id} className="bg-white/5 rounded-xl p-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="text-xl">💳</div>
                                <div>
                                    <div className="text-white text-sm font-semibold">{txn.fromUsername}</div>
                                    <div className="text-white/60 text-xs">
                                        {new Date(txn.timestamp).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-white font-bold">${txn.amount.toFixed(2)}</div>
                                <div className="text-yellow-400 text-xs">+${txn.platformFee.toFixed(2)}</div>
                            </div>
                        </div>
                    ))}
                    {purchaseTransactions.length === 0 && (
                        <div className="text-center py-8 text-white/40">
                            No transactions yet
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default PlatformRevenueDashboard;