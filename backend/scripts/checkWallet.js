// backend/scripts/checkWallet.js
// World-Studio.live - Check User Wallet Script
// Run: node scripts/checkWallet.js [username or email]

require("dotenv").config();
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function checkWallet() {
    const search = process.argv[2] || "MyHood";

    console.log(`🔍 Checking wallet for: ${search}\n`);

    try {
        await mongoose.connect(MONGO_URI);
        console.log("✅ Connected to MongoDB\n");

        const db = mongoose.connection.db;
        const usersCollection = db.collection("users");

        // Find user
        const user = await usersCollection.findOne({
            $or: [
                { username: { $regex: new RegExp(search, "i") } },
                { email: search.toLowerCase() }
            ]
        });

        if (!user) {
            console.log("❌ User not found!");
            return;
        }

        console.log(`👤 User: ${user.username}`);
        console.log(`📧 Email: ${user.email}`);
        console.log(`🆔 ID: ${user._id}`);
        console.log(`✅ Verified: ${user.isVerified ? "Yes" : "No"}`);
        console.log(`🔴 Live: ${user.isLive ? "Yes" : "No"}`);
        console.log(`📅 Joined: ${new Date(user.createdAt).toLocaleDateString()}`);

        console.log(`\n💰 WALLET:`);
        console.log(`   Balance: ${user.wallet?.balance || 0} coins`);
        console.log(`   Balance EUR: €${((user.wallet?.balance || 0) / 100).toFixed(2)}`);
        console.log(`   Total Received: ${user.wallet?.totalReceived || 0}`);
        console.log(`   Total Spent: ${user.wallet?.totalSpent || 0}`);
        console.log(`   Total Earned: ${user.wallet?.totalEarned || 0}`);
        console.log(`   Total Withdrawn: ${user.wallet?.totalWithdrawn || 0}`);

        console.log(`\n📜 TRANSACTIONS (${user.wallet?.transactions?.length || 0}):`);

        if (user.wallet?.transactions?.length > 0) {
            // Sort by date descending
            const transactions = [...user.wallet.transactions]
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 20); // Show last 20

            transactions.forEach((tx, i) => {
                const date = new Date(tx.createdAt).toLocaleString();
                const sign = tx.amount > 0 ? "+" : "";
                const typeIcon = {
                    purchase: "💳",
                    gift_sent: "🎁→",
                    gift_received: "🎁←",
                    transfer_sent: "💸→",
                    transfer_received: "💸←",
                    withdrawal: "🏧",
                    content_purchase: "📦",
                    content_sale: "💰",
                    admin_add: "👑+",
                    admin_deduct: "👑-",
                    bonus: "🎉",
                    referral: "👥"
                }[tx.type] || "📝";

                console.log(`\n   ${i + 1}. ${typeIcon} ${tx.type?.toUpperCase() || "UNKNOWN"}`);
                console.log(`      Amount: ${sign}${tx.amount} coins`);
                console.log(`      Description: ${tx.description || "N/A"}`);
                console.log(`      Status: ${tx.status || "completed"}`);
                console.log(`      Date: ${date}`);

                if (tx.stripeSessionId) {
                    console.log(`      Stripe: ${tx.stripeSessionId.slice(0, 30)}...`);
                }
                if (tx.relatedUsername) {
                    console.log(`      Related User: @${tx.relatedUsername}`);
                }
            });

            if (user.wallet.transactions.length > 20) {
                console.log(`\n   ... and ${user.wallet.transactions.length - 20} more transactions`);
            }
        } else {
            console.log("   ❌ No transactions found!");
        }

        // Show pending withdrawals
        const pendingWithdrawals = user.wallet?.transactions?.filter(
            t => t.type === "withdrawal" && t.status === "pending"
        ) || [];

        if (pendingWithdrawals.length > 0) {
            console.log(`\n⏳ PENDING WITHDRAWALS (${pendingWithdrawals.length}):`);
            pendingWithdrawals.forEach((w, i) => {
                console.log(`   ${i + 1}. €${Math.abs(w.amount) / 100} via ${w.method} - ${new Date(w.createdAt).toLocaleDateString()}`);
            });
        }

        // Show followers/following
        console.log(`\n👥 SOCIAL:`);
        console.log(`   Followers: ${user.followers?.length || 0}`);
        console.log(`   Following: ${user.following?.length || 0}`);

        // Show notifications count
        const unreadNotifications = user.notifications?.filter(n => !n.read).length || 0;
        console.log(`\n🔔 NOTIFICATIONS:`);
        console.log(`   Total: ${user.notifications?.length || 0}`);
        console.log(`   Unread: ${unreadNotifications}`);

    } catch (error) {
        console.error("❌ Error:", error.message);
    } finally {
        await mongoose.disconnect();
        console.log("\n👋 Done!");
        process.exit(0);
    }
}

checkWallet();