import React from 'react';
import NavigationBar from './NavigationBar';
import { DollarSign, TrendingUp, Download, CreditCard } from 'lucide-react';

function EarningsPage({ currentUser, currentPage, setCurrentPage, transactions, users, onLogout }) {
    const totalEarnings = currentUser.earnings || 0;
    const thisMonthEarnings = transactions
        .filter(t => {
            const txDate = new Date(t.timestamp);
            const now = new Date();
            return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
        })
        .reduce((sum, t) => sum + t.amount, 0);

    const lastMonthEarnings = transactions
        .filter(t => {
            const txDate = new Date(t.timestamp);
            const now = new Date();
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
            return txDate.getMonth() === lastMonth.getMonth() && txDate.getFullYear() === lastMonth.getFullYear();
        })
        .reduce((sum, t) => sum + t.amount, 0);

    const growthRate = lastMonthEarnings > 0
        ? ((thisMonthEarnings - lastMonthEarnings) / lastMonthEarnings * 100).toFixed(1)
        : 0;

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

                <div className="max-w-6xl mx-auto p-6">
                    <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                        Earnings Dashboard
                    </h1>

                    {/* Earnings Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-lg rounded-3xl p-8 border border-green-500/30">
                            <DollarSign className="w-12 h-12 text-green-400 mb-4" />
                            <div className="text-sm text-gray-300 mb-2">Total Earnings</div>
                            <div className="text-5xl font-bold">${totalEarnings.toFixed(2)}</div>
                        </div>

                        <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 backdrop-blur-lg rounded-3xl p-8 border border-cyan-500/30">
                            <TrendingUp className="w-12 h-12 text-cyan-400 mb-4" />
                            <div className="text-sm text-gray-300 mb-2">This Month</div>
                            <div className="text-5xl font-bold">${thisMonthEarnings.toFixed(2)}</div>
                            <div className={`text-sm mt-2 ${growthRate >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {growthRate >= 0 ? '+' : ''}{growthRate}% from last month
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-lg rounded-3xl p-8 border border-purple-500/30">
                            <CreditCard className="w-12 h-12 text-purple-400 mb-4" />
                            <div className="text-sm text-gray-300 mb-2">Supporters</div>
                            <div className="text-5xl font-bold">{transactions.length}</div>
                        </div>
                    </div>

                    {/* Withdrawal Section */}
                    <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 mb-8">
                        <h2 className="text-2xl font-bold mb-6">Withdraw Earnings</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm mb-2">Amount to Withdraw</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">$</span>
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:outline-none focus:border-cyan-400 text-white text-lg"
                                    />
                                </div>
                                <p className="text-sm text-gray-400 mt-2">Available: ${totalEarnings.toFixed(2)}</p>
                            </div>

                            <div>
                                <label className="block text-sm mb-2">Payment Method</label>
                                <select className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:outline-none focus:border-cyan-400 text-white">
                                    <option>PayPal</option>
                                    <option>Bank Transfer</option>
                                    <option>Stripe</option>
                                    <option>Cryptocurrency</option>
                                </select>
                            </div>
                        </div>

                        <button className="mt-6 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl font-semibold text-lg hover:opacity-90 transition-opacity flex items-center gap-2">
                            <Download className="w-5 h-5" />
                            Withdraw Funds
                        </button>
                    </div>

                    {/* Transaction History */}
                    <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20">
                        <h2 className="text-2xl font-bold mb-6">Transaction History</h2>

                        {transactions.length === 0 ? (
                            <div className="text-center py-12 text-gray-400">
                                <DollarSign className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                <p>No transactions yet</p>
                                <p className="text-sm mt-2">Start creating content to earn money!</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {transactions.map(tx => (
                                    <div key={tx.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-full flex items-center justify-center border border-green-500/30">
                                                <DollarSign className="w-6 h-6 text-green-400" />
                                            </div>
                                            <div>
                                                <div className="font-semibold">Support from {tx.fromUsername}</div>
                                                <div className="text-sm text-gray-400">
                                                    {new Date(tx.timestamp).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-bold text-green-400">+${tx.amount}</div>
                                            <div className="text-xs text-gray-400">Completed</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default EarningsPage;

