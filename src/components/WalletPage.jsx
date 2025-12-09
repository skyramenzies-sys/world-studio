// src/components/WalletPage.jsx
// World-Studio.live - Wallet (Universe Edition)
// Engineered for Commander Sandro Menzies by AIRPATH

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../api/api"; // ✅ centrale API instance

// ===========================================
// ICONS (Inline SVG)
// ===========================================
const Icons = {
    Wallet: ({ className }) => (
        <svg
            className={className}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
            />
        </svg>
    ),
    CreditCard: ({ className }) => (
        <svg
            className={className}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
            />
        </svg>
    ),
    Building: ({ className }) => (
        <svg
            className={className}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
        </svg>
    ),
    Coins: ({ className }) => (
        <svg
            className={className}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
        </svg>
    ),
    ArrowDown: ({ className }) => (
        <svg
            className={className}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
        </svg>
    ),
    ArrowUp: ({ className }) => (
        <svg
            className={className}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 10l7-7m0 0l7 7m-7-7v18"
            />
        </svg>
    ),
    Sparkles: ({ className }) => (
        <svg
            className={className}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
            />
        </svg>
    ),
    Refresh: ({ className }) => (
        <svg
            className={className}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
        </svg>
    ),
    History: ({ className }) => (
        <svg
            className={className}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
        </svg>
    ),
};

// ===========================================
// COIN PACKAGES
// ===========================================
const COIN_PACKAGES = [
    { id: "starter", coins: 100, bonus: 0, price: 4.99, popular: false, emoji: "🪙" },
    { id: "popular", coins: 500, bonus: 50, price: 19.99, popular: true, emoji: "💰" },
    { id: "value", coins: 1000, bonus: 150, price: 34.99, popular: false, emoji: "💎" },
    { id: "premium", coins: 2500, bonus: 500, price: 79.99, popular: false, emoji: "👑" },
    { id: "ultimate", coins: 5000, bonus: 1500, price: 149.99, popular: false, emoji: "🚀" },
];

export default function WalletPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const [currentUser, setCurrentUser] = useState(null);
    const [wallet, setWallet] = useState({
        balance: 0,
        totalReceived: 0,
        totalSpent: 0,
    });
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [checkoutLoading, setCheckoutLoading] = useState(null);
    const [activeTab, setActiveTab] = useState("buy");
    const [verifying, setVerifying] = useState(false);

    // Withdrawal form
    const [withdrawAmount, setWithdrawAmount] = useState("");
    const [withdrawMethod, setWithdrawMethod] = useState("paypal");
    const [accountDetails, setAccountDetails] = useState("");
    const [withdrawLoading, setWithdrawLoading] = useState(false);

    // ===========================================
    // LOAD CURRENT USER
    // ===========================================
    useEffect(() => {
        const storedUser =
            localStorage.getItem("ws_currentUser") ||
            localStorage.getItem("user");

        if (storedUser) {
            try {
                setCurrentUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Failed to parse ws_currentUser:", e);
                navigate("/login");
            }
        } else {
            navigate("/login");
        }
    }, [navigate]);

    // ===========================================
    // FETCH WALLET + TRANSACTIONS
    // ===========================================
    const fetchWallet = useCallback(async () => {
        try {
            const [walletRes, transactionsRes] = await Promise.all([
                api.get("/wallet"),
                api.get("/wallet/transactions").catch(() => ({ data: [] })),
            ]);

            // Wallet kan komen als {wallet} of direct object
            const wd = walletRes.data || {};
            const walletData = wd.wallet || wd || {
                balance: 0,
                totalReceived: 0,
                totalSpent: 0,
            };

            // Transactions kunnen komen als array of {transactions:[]}
            const td = transactionsRes.data;
            let txList = [];
            if (Array.isArray(td)) {
                txList = td;
            } else if (td && Array.isArray(td.transactions)) {
                txList = td.transactions;
            }

            setWallet(walletData);
            setTransactions(txList);

            // Update localStorage balance
            const storedUser = localStorage.getItem("ws_currentUser");
            if (storedUser) {
                try {
                    const user = JSON.parse(storedUser);
                    user.wallet = walletData;
                    localStorage.setItem("ws_currentUser", JSON.stringify(user));
                } catch (e) {
                    console.error("Failed to update user wallet in storage:", e);
                }
            }
        } catch (err) {
            console.error("Wallet fetch error:", err);
            toast.error("Failed to load wallet");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (currentUser) {
            fetchWallet();
        }
    }, [currentUser, fetchWallet]);

    // ===========================================
    // VERIFY PAYMENT AFTER STRIPE REDIRECT
    // ===========================================
    useEffect(() => {
        const verifyPayment = async () => {
            const success = searchParams.get("success");
            const sessionId = searchParams.get("session_id");
            const canceled = searchParams.get("canceled");


            if (canceled === "true") {
                toast.error("Payment was canceled");
                setSearchParams({});
                return;
            }


            if (success === "true" && sessionId) {
                setVerifying(true);

                const toastId = toast.loading("Verifying your payment...");

                try {
                    console.log("🔍 Verifying payment session:", sessionId);
                    const response = await api.post("/wallet/verify-payment", {
                        sessionId,
                    });

                    toast.dismiss(toastId);

                    const data = response.data || {};
                    if (data.success) {
                        const alreadyProcessed =
                            data.alreadyProcessed ||
                            data.status === "already_processed";

                        const coinsAdded =
                            data.coinsAdded ??
                            data.coins ??
                            0;

                        const newBalance =
                            data.balance ??
                            data.wallet?.balance ??
                            wallet.balance;

                        if (alreadyProcessed) {
                            toast.success("✅ Payment was already processed!", {
                                duration: 4000,
                            });
                        } else {
                            toast.success(
                                <div className="flex flex-col">
                                    <span className="font-bold text-lg">
                                        🎉 Payment Successful!
                                    </span>
                                    <span className="text-green-300">
                                        +{coinsAdded} coins added
                                    </span>
                                    <span className="text-sm opacity-80">
                                        New balance: {newBalance} coins
                                    </span>
                                </div>,
                                { duration: 6000 }
                            );
                        }


                        await fetchWallet();
                    }
                } catch (err) {
                    toast.dismiss(toastId);
                    console.error("Verify payment error:", err);

                    const errorMessage =
                        err.response?.data?.error || "Failed to verify payment";

                    if (errorMessage.toLowerCase().includes("already processed")) {
                        toast.success("✅ Payment was already processed!");
                        await fetchWallet();
                    } else {
                        toast.error(
                            <div className="flex flex-col">
                                <span className="font-bold">
                                    Payment verification failed
                                </span>
                                <span className="text-sm opacity-80">
                                    {errorMessage}
                                </span>
                                <span className="text-xs mt-1">
                                    Contact support if coins are missing
                                </span>
                            </div>,
                            { duration: 8000 }
                        );
                    }
                } finally {
                    setVerifying(false);
                }

                // Clean URL
                setSearchParams({});
            }
        };


        if (currentUser) {
            verifyPayment();
        }
    }, [searchParams, setSearchParams, currentUser, fetchWallet, wallet.balance]);

    // ===========================================
    // HANDLE PACKAGE PURCHASE
    // ===========================================
    const handlePurchase = async (packageId) => {
        setCheckoutLoading(packageId);

        try {
            const response = await api.post("/wallet/checkout", {
                packageId,
            });

            if (response.data?.url) {
                window.location.href = response.data.url;
            } else {
                toast.error("Failed to create checkout session");
            }
        } catch (err) {
            console.error("Checkout error:", err);
            toast.error(
                err.response?.data?.error || "Failed to start checkout"
            );
        } finally {
            setCheckoutLoading(null);
        }
    };

    // ===========================================
    // HANDLE WITHDRAWAL
    // ===========================================
    const handleWithdraw = async (e) => {
        e.preventDefault();

        const amount = parseInt(withdrawAmount, 10);
        if (!amount || amount < 1000) {
            toast.error("Minimum withdrawal is 1000 coins (€10)");
            return;
        }

        if (amount > (wallet.balance || 0)) {
            toast.error("Insufficient balance");
            return;
        }

        if (!accountDetails.trim()) {
            toast.error("Please enter your account details");
            return;
        }

        setWithdrawLoading(true);

        try {
            const response = await api.post("/wallet/withdraw", {
                amount,
                method: withdrawMethod,
                accountDetails: accountDetails.trim(),
            });

            const data = response.data || {};
            toast.success(data.message || "Withdrawal requested");

            const newBalance =
                data.newBalance ??
                data.wallet?.balance ??
                wallet.balance;

            setWallet((prev) => ({
                ...prev,
                balance: newBalance,
            }));
            setWithdrawAmount("");
            setAccountDetails("");


            await fetchWallet();
        } catch (err) {
            console.error("Withdrawal error:", err);
            toast.error(
                err.response?.data?.error || "Withdrawal failed"
            );
        } finally {
            setWithdrawLoading(false);
        }
    };

    // ===========================================
    // MANUAL REFRESH
    // ===========================================
    const handleRefreshWallet = async () => {
        setLoading(true);
        await fetchWallet();
        toast.success("Wallet refreshed!");
    };

    // ===========================================
    // RENDER STATES
    // ===========================================
    if (!currentUser) return null;

    if (loading && !verifying) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto" />
                    <p className="mt-4 text-white/70">Loading wallet...</p>
                </div>
            </div>
        );
    }


    if (verifying) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black flex items-center justify-center p-6">
                <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 p-8 rounded-2xl border border-green-500/30 text-center max-w-md">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-400 border-t-transparent mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-green-400 mb-2">
                        Verifying Payment...
                    </h2>
                    <p className="text-white/70">
                        Please wait while we confirm your purchase
                    </p>
                </div>
            </div>
        );
    }

    // ===========================================
    // MAIN UI
    // ===========================================
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black p-4 md:p-6">
            <div className="max-w-4xl mx-auto text-white">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-yellow-500/20 rounded-xl">
                            <Icons.Wallet className="w-8 h-8 text-yellow-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">My Wallet</h1>
                            <p className="text-white/50 text-sm">
                                Manage your WS-Coins
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleRefreshWallet}
                        disabled={loading}
                        className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition disabled:opacity-50"
                        title="Refresh wallet"
                    >
                        <Icons.Refresh
                            className={`w-5 h-5 ${loading ? "animate-spin" : ""}`}
                        />
                    </button>
                </div>

                {/* Balance Card */}
                <div className="bg-gradient-to-br from-yellow-500/20 via-amber-500/20 to-orange-500/20 p-6 rounded-2xl border border-yellow-500/30 mb-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <p className="text-yellow-400 font-semibold mb-1 flex items-center gap-2">
                                <span className="text-2xl">💰</span> Current Balance
                            </p>
                            <p className="text-4xl font-bold">
                                {(wallet.balance || 0).toLocaleString()}{" "}
                                <span className="text-xl text-yellow-400">
                                    WS-Coins
                                </span>
                            </p>
                            <p className="text-white/50 text-sm mt-1">
                                ≈ €{((wallet.balance || 0) / 100).toFixed(2)}
                            </p>
                        </div>

                        <div className="flex gap-6 text-sm">
                            <div className="text-center p-3 bg-green-500/10 rounded-xl">
                                <p className="text-green-400 font-bold text-xl">
                                    {(wallet.totalReceived || 0).toLocaleString()}
                                </p>
                                <p className="text-white/50">Received</p>
                            </div>
                            <div className="text-center p-3 bg-red-500/10 rounded-xl">
                                <p className="text-red-400 font-bold text-xl">
                                    {(wallet.totalSpent || 0).toLocaleString()}
                                </p>
                                <p className="text-white/50">Spent</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/10 mb-6 overflow-x-auto">
                    {[
                        { id: "buy", label: "Buy Coins", emoji: "🪙" },
                        { id: "withdraw", label: "Withdraw", emoji: "💸" },
                        { id: "history", label: "History", emoji: "📜" },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-3 font-semibold transition whitespace-nowrap ${activeTab === tab.id
                                    ? "text-cyan-400 border-b-2 border-cyan-400"
                                    : "text-white/50 hover:text-white/80"
                                }`}
                        >
                            <span>{tab.emoji}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Buy Coins Tab */}
                {activeTab === "buy" && (
                    <div>
                        <h2 className="text-xl font-semibold mb-4">
                            Choose a Package
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {COIN_PACKAGES.map((pkg) => (
                                <div
                                    key={pkg.id}
                                    className={`relative bg-white/5 border rounded-2xl p-5 transition hover:bg-white/10 hover:scale-[1.02] ${pkg.popular
                                            ? "border-cyan-500 ring-2 ring-cyan-500/50"
                                            : "border-white/10"
                                        }`}
                                >
                                    {pkg.popular && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                                            ⭐ MOST POPULAR
                                        </div>
                                    )}

                                    <div className="text-center mb-4">
                                        <span className="text-4xl">
                                            {pkg.emoji}
                                        </span>
                                        <p className="text-3xl font-bold text-yellow-400 mt-2">
                                            {pkg.coins.toLocaleString()}
                                        </p>
                                        <p className="text-white/50">
                                            WS-Coins
                                        </p>

                                        {pkg.bonus > 0 && (
                                            <div className="flex items-center justify-center gap-1 mt-2 text-green-400 text-sm bg-green-500/10 py-1 px-3 rounded-full mx-auto w-fit">
                                                <Icons.Sparkles className="w-4 h-4" />
                                                +{pkg.bonus} Bonus!
                                            </div>
                                        )}
                                    </div>

                                    <div className="text-center mb-4">
                                        <p className="text-2xl font-bold">
                                            €{pkg.price.toFixed(2)}
                                        </p>
                                        <p className="text-xs text-white/40">
                                            €
                                            {(
                                                (pkg.price /
                                                    (pkg.coins + pkg.bonus)) *
                                                100
                                            ).toFixed(2)}{" "}
                                            per 100 coins
                                        </p>
                                    </div>

                                    <button
                                        onClick={() => handlePurchase(pkg.id)}
                                        disabled={checkoutLoading === pkg.id}
                                        className={`w-full py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2 ${pkg.popular
                                                ? "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400"
                                                : "bg-white/10 hover:bg-white/20"
                                            }`}
                                    >
                                        {checkoutLoading === pkg.id ? (
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <Icons.CreditCard className="w-5 h-5" />
                                                Buy Now
                                            </>
                                        )}
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Payment Methods */}
                        <div className="mt-8 p-4 bg-white/5 rounded-xl border border-white/10">
                            <p className="text-white/50 text-sm mb-3">
                                🔒 Secure payments powered by Stripe
                            </p>
                            <div className="flex flex-wrap gap-4 items-center">
                                <div className="flex items-center gap-2 text-sm bg-white/5 px-3 py-2 rounded-lg">
                                    <Icons.CreditCard className="w-5 h-5 text-blue-400" />
                                    VISA / Mastercard
                                </div>
                                <div className="flex items-center gap-2 text-sm bg-white/5 px-3 py-2 rounded-lg">
                                    <Icons.Building className="w-5 h-5 text-orange-400" />
                                    iDEAL
                                </div>
                                <div className="flex items-center gap-2 text-sm bg-white/5 px-3 py-2 rounded-lg">
                                    <span className="text-lg">🍎</span>
                                    Apple Pay
                                </div>
                                <div className="flex items-center gap-2 text-sm bg-white/5 px-3 py-2 rounded-lg">
                                    <span className="text-lg">G</span>
                                    Google Pay
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Withdraw Tab */}
                {activeTab === "withdraw" && (
                    <div className="max-w-md">
                        <h2 className="text-xl font-semibold mb-4">
                            💸 Withdraw Earnings
                        </h2>

                        <div className="bg-white/5 p-4 rounded-xl border border-white/10 mb-6">
                            <p className="text-white/60 text-sm">
                                💡 Minimum withdrawal:{" "}
                                <span className="text-white font-semibold">
                                    1000 coins (€10)
                                </span>
                            </p>
                            <p className="text-white/60 text-sm mt-1">
                                Exchange rate:{" "}
                                <span className="text-white font-semibold">
                                    100 coins = €1
                                </span>
                            </p>
                        </div>

                        <form onSubmit={handleWithdraw} className="space-y-4">
                            {/* Amount */}
                            <div>
                                <label className="block text-white/70 text-sm mb-2">
                                    Amount (coins)
                                </label>
                                <input
                                    type="number"
                                    value={withdrawAmount}
                                    onChange={(e) =>
                                        setWithdrawAmount(e.target.value)
                                    }
                                    placeholder="1000"
                                    min="1000"
                                    max={wallet.balance || 0}
                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:border-cyan-400 outline-none transition"
                                />
                                {withdrawAmount && (
                                    <p className="text-white/50 text-sm mt-1">
                                        = €
                                        {(
                                            (parseInt(
                                                withdrawAmount,
                                                10
                                            ) || 0) / 100
                                        ).toFixed(2)}
                                    </p>
                                )}
                            </div>

                            {/* Method */}
                            <div>
                                <label className="block text-white/70 text-sm mb-2">
                                    Withdrawal Method
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { id: "paypal", label: "PayPal", icon: "💳" },
                                        { id: "bank", label: "Bank Transfer", icon: "🏦" },
                                    ].map((method) => (
                                        <button
                                            key={method.id}
                                            type="button"
                                            onClick={() =>
                                                setWithdrawMethod(method.id)
                                            }
                                            className={`p-4 rounded-xl border transition ${withdrawMethod === method.id
                                                    ? "border-cyan-500 bg-cyan-500/20"
                                                    : "border-white/20 bg-white/5 hover:bg-white/10"
                                                }`}
                                        >
                                            <span className="text-2xl">
                                                {method.icon}
                                            </span>
                                            <p className="text-sm mt-1 font-medium">
                                                {method.label}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Account Details */}
                            <div>
                                <label className="block text-white/70 text-sm mb-2">
                                    {withdrawMethod === "paypal"
                                        ? "PayPal Email"
                                        : "IBAN Number"}
                                </label>
                                <input
                                    type="text"
                                    value={accountDetails}
                                    onChange={(e) =>
                                        setAccountDetails(e.target.value)
                                    }
                                    placeholder={
                                        withdrawMethod === "paypal"
                                            ? "your@email.com"
                                            : "NL00 BANK 0000 0000 00"
                                    }
                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:border-cyan-400 outline-none transition"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={
                                    withdrawLoading ||
                                    !withdrawAmount ||
                                    parseInt(withdrawAmount, 10) < 1000
                                }
                                className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition"
                            >
                                {withdrawLoading ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Icons.ArrowDown className="w-5 h-5" />
                                        Request Withdrawal
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Withdrawal Info */}
                        <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                            <p className="text-yellow-400 text-sm font-medium mb-2">
                                ⏱️ Processing Time
                            </p>
                            <ul className="text-xs text-white/60 space-y-1">
                                <li>• PayPal: 1-2 business days</li>
                                <li>• Bank Transfer: 3-5 business days</li>
                            </ul>
                        </div>
                    </div>
                )}

                {/* History Tab */}
                {activeTab === "history" && (
                    <div>
                        <h2 className="text-xl font-semibold mb-4">
                            📜 Transaction History
                        </h2>

                        {transactions.length === 0 ? (
                            <div className="text-center py-12 bg-white/5 rounded-xl border border-white/10">
                                <span className="text-4xl">📭</span>
                                <p className="text-white/50 mt-4">
                                    No transactions yet
                                </p>
                                <p className="text-white/30 text-sm mt-1">
                                    Your transaction history will appear here
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {transactions.map((tx, i) => (
                                    <div
                                        key={tx._id || i}
                                        className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`p-2 rounded-full ${tx.amount > 0
                                                        ? "bg-green-500/20"
                                                        : "bg-red-500/20"
                                                    }`}
                                            >
                                                {tx.amount > 0 ? (
                                                    <Icons.ArrowUp className="w-5 h-5 text-green-400" />
                                                ) : (
                                                    <Icons.ArrowDown className="w-5 h-5 text-red-400" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-semibold">
                                                    {tx.description ||
                                                        (tx.amount > 0
                                                            ? "Coins added"
                                                            : "Coins spent")}
                                                </p>
                                                <p className="text-white/50 text-sm">
                                                    {tx.createdAt
                                                        ? new Date(
                                                            tx.createdAt
                                                        ).toLocaleDateString(
                                                            "en-US",
                                                            {
                                                                year: "numeric",
                                                                month: "short",
                                                                day: "numeric",
                                                                hour: "2-digit",
                                                                minute:
                                                                    "2-digit",
                                                            }
                                                        )
                                                        : ""}
                                                </p>
                                            </div>
                                        </div>
                                        <div
                                            className={`font-bold text-lg ${tx.amount > 0
                                                    ? "text-green-400"
                                                    : "text-red-400"
                                                }`}
                                        >
                                            {tx.amount > 0 ? "+" : ""}
                                            {Number(
                                                tx.amount || 0
                                            ).toLocaleString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Footer */}
                <div className="mt-8 text-center">
                    <p className="text-white/30 text-xs">
                        🌍 World-Studio.live • Secure Payments
                    </p>
                </div>
            </div>
        </div>
    );
}
