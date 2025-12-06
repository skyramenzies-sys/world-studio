// backend/scripts/checkWallet.js
// World-Studio.live - Check User Wallet Script (UNIVERSE EDITION 🚀)
// Run: node scripts/checkWallet.js [username | email | userId]

require("dotenv").config();
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const COIN_RATE = parseInt(process.env.COIN_RATE, 10) || 100; // 100 coins = €1

if (!MONGO_URI) {
    console.error("❌ No MONGO_URI / MONGODB_URI found in .env");
    process.exit(1);
}

const typeIconMap = {
    purchase: "💳",
    gift_sent: "🎁→",
    gift_received: "🎁←",
    transfer_sent: "💸→",
    transfer_received: "💸←",
    withdrawal: "🏧",
    withdrawal_refund: "↩️",
    content_purchase: "📦",
    content_sale: "💰",
    admin_add: "👑+",
    admin_deduct: "👑-",
    bonus: "🎉",
    referral: "👥",
};

const coinsToEur = (coins) => (coins / COIN_RATE).toFixed(2);

async function checkWallet() {
    const search = process.argv[2] || "MyHood";

    console.log("========================================");
    console.log("  🔍 World-Studio.live - Wallet Checker");
    console.log("========================================\n");
    console.log(`Searching for user: "${search}"`);
    console.log(`COIN_RATE: ${COIN_RATE} coins = €1\n`);

    try {
        await mongoose.connect(MONGO_URI);
        console.log("✅ Connected to MongoDB\n");

        const db = mongoose.connection.db;
        const usersCollection = db.collection("users");

        // Build search query: username (regex), email (exact), _id (if valid)
        const orConditions = [
            { username: { $regex: new RegExp(search, "i") } },
            { email: search.toLowerCase() },
        ];

        if (mongoose.Types.ObjectId.isValid(search)) {
            orConditions.push({ _id: new mongoose.Types.ObjectId(search) });
        }

        const user = await usersCollection.findOne({
            $or: orConditions,
        });

        if (!user) {
            console.log("❌ User not found!");
            return;
        }

        // -------- Basic user info --------
        console.log("👤 USER");
        console.log("--------");
        console.log(`Username : ${user.username}`);
        console.log(`Email    : ${user.email || "N/A"}`);
        console.log(`ID       : ${user._id}`);
        console.log(`Verified : ${user.isVerified ? "✅ Yes" : "❌ No"}`);
        console.log(`Live     : ${user.isLive ? "🔴 Live" : "⚫ Offline"}`);
        console.log(
            `Joined   : ${user.createdAt
                ? new Date(user.createdAt).toLocaleString()
                : "N/A"
            }`
        );

        // -------- Wallet info --------
        const wallet = user.wallet || {};
        const balance = wallet.balance || 0;
        const totalReceived = wallet.totalReceived || 0;
        const totalSpent = wallet.totalSpent || 0;
        const totalEarned = wallet.totalEarned || 0;
        const totalWithdrawn = wallet.totalWithdrawn || 0;

        console.log("\n💰 WALLET");
        console.log("---------");
        console.log(`Balance        : ${balance} coins (≈ €${coinsToEur(balance)})`);
        console.log(
            `Total Received : ${totalReceived} coins (≈ €${coinsToEur(
                totalReceived
            )})`
        );
        console.log(
            `Total Spent    : ${totalSpent} coins (≈ €${coinsToEur(
                totalSpent
            )})`
        );
        console.log(
            `Total Earned   : ${totalEarned} coins (≈ €${coinsToEur(
                totalEarned
            )})`
        );
        console.log(
            `Total Withdrawn: ${totalWithdrawn} coins (≈ €${coinsToEur(
                totalWithdrawn
            )})`
        );

        // -------- Transactions --------
        const txList = wallet.transactions || [];
        console.log(
            `\n📜 TRANSACTIONS (${txList.length || 0} total, showing latest 20):`
        );

        if (txList.length > 0) {
            const transactions = [...txList]
                .sort(
                    (a, b) =>
                        new Date(b.createdAt || 0) -
                        new Date(a.createdAt || 0)
                )
                .slice(0, 20);

            transactions.forEach((tx, i) => {
                const date = tx.createdAt
                    ? new Date(tx.createdAt).toLocaleString()
                    : "N/A";
                const sign = tx.amount > 0 ? "+" : "";
                const icon =
                    typeIconMap[tx.type] ||
                    "📝";

                console.log(
                    `\n   ${String(i + 1).padStart(2, " ")}. ${icon} ${tx.type?.toUpperCase() || "UNKNOWN"
                    }`
                );
                console.log(
                    `       Amount      : ${sign}${tx.amount} coins (≈ €${coinsToEur(
                        tx.amount
                    )})`
                );
                console.log(
                    `       Description : ${tx.description || "N/A"}`
                );
                console.log(
                    `       Status      : ${tx.status || "completed"}`
                );
                console.log(`       Date        : ${date}`);

                if (tx.method) {
                    console.log(
                        `       Method      : ${tx.method.toUpperCase()}`
                    );
                }

                if (tx.relatedUserId) {
                    console.log(
                        `       RelatedUser : ${tx.relatedUserId}`
                    );
                }
                if (tx.relatedUsername) {
                    console.log(
                        `       Related @   : @${tx.relatedUsername}`
                    );
                }
                if (tx.stripeSessionId) {
                    console.log(
                        `       Stripe      : ${String(
                            tx.stripeSessionId
                        ).slice(0, 30)}...`
                    );
                }
            });

            if (txList.length > 20) {
                console.log(
                    `\n   ... and ${txList.length - 20
                    } more transactions`
                );
            }
        } else {
            console.log("   ❌ No transactions found!");
        }

        // -------- Pending withdrawals --------
        const pendingWithdrawals =
            txList.filter(
                (t) =>
                    t.type === "withdrawal" &&
                    t.status === "pending"
            ) || [];

        if (pendingWithdrawals.length > 0) {
            console.log(
                `\n⏳ PENDING WITHDRAWALS (${pendingWithdrawals.length}):`
            );
            pendingWithdrawals.forEach((w, i) => {
                const coins = Math.abs(w.amount || 0);
                console.log(
                    `   ${i + 1}. ${coins} coins (≈ €${coinsToEur(
                        coins
                    )}) via ${w.method || "N/A"} - ${w.createdAt
                        ? new Date(
                            w.createdAt
                        ).toLocaleString()
                        : "N/A"
                    }`
                );
            });
        } else {
            console.log("\n⏳ PENDING WITHDRAWALS: none");
        }

        // -------- Social --------
        console.log("\n👥 SOCIAL");
        console.log("---------");
        console.log(
            `Followers : ${Array.isArray(user.followers) ? user.followers.length : 0}`
        );
        console.log(
            `Following : ${Array.isArray(user.following) ? user.following.length : 0}`
        );

        // -------- Notifications --------
        const notifications = user.notifications || [];
        const unreadNotifications =
            notifications.filter((n) => !n.read).length || 0;

        console.log("\n🔔 NOTIFICATIONS");
        console.log("----------------");
        console.log(`Total  : ${notifications.length || 0}`);
        console.log(`Unread : ${unreadNotifications}`);

        console.log("\n✅ Done.");
    } catch (error) {
        console.error("❌ Error:", error.message);
    } finally {
        await mongoose.disconnect().catch(() => { });
        console.log("\n👋 MongoDB disconnected. Bye!");
        process.exit(0);
    }
}

checkWallet();
