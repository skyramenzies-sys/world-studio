// backend/scripts/cleanup.js
// World-Studio.live - Master Cleanup Utility (UNIVERSE EDITION 🚀)
// Run: node scripts/cleanup.js [type]
//
// Examples:
//   node scripts/cleanup.js                   # Run all cleanups
//   node scripts/cleanup.js streams           # Clean streams only
//   node scripts/cleanup.js followers         # Clean followers only
//   node scripts/cleanup.js notifications     # Clean notifications
//   node scripts/cleanup.js users             # Clean inactive users / trim wallets
//   node scripts/cleanup.js posts             # Clean deleted/orphaned posts
//   node scripts/cleanup.js gifts             # Clean orphaned gifts
//   node scripts/cleanup.js sessions          # Clean expired sessions
//   node scripts/cleanup.js --dry-run         # Show what would be cleaned

require("dotenv").config();
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const DRY_RUN = process.argv.includes("--dry-run");

// Wallet maintenance
const MAX_WALLET_TX = 500;

// ===========================================
// HELPER FUNCTIONS
// ===========================================

const log = (msg) => console.log(msg);
const warn = (msg) => console.log(`⚠️  ${msg}`);
const success = (msg) => console.log(`✅ ${msg}`);
const error = (msg) => console.error(`❌ ${msg}`);

const daysAgo = (days) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
};

const hoursAgo = (hours) => {
    return new Date(Date.now() - hours * 60 * 60 * 1000);
};

// ===========================================
// CLEANUP FUNCTIONS
// ===========================================

/**
 * Clean up stale and ended streams
 */
async function cleanupStreams(db) {
    log("\n📺 CLEANING UP STREAMS...\n");

    const streamsCollection = db.collection("streams");
    const livestreamsCollection = db.collection("livestreams");
    const usersCollection = db.collection("users");

    let totalCleaned = 0;

    // Check both collections
    for (const collection of [streamsCollection, livestreamsCollection]) {
        try {
            const collName = collection.collectionName;

            // Find live streams
            const liveStreams = await collection.find({ isLive: true }).toArray();
            log(`Found ${liveStreams.length} live streams in ${collName}`);

            if (liveStreams.length > 0) {
                for (const stream of liveStreams.slice(0, 10)) {
                    const age = stream.startedAt
                        ? Math.round((Date.now() - new Date(stream.startedAt)) / 3600000)
                        : "?";
                    log(
                        `  - "${stream.title || "Untitled"}" by ${stream.username || "Unknown"
                        } (${age}h old)`
                    );
                }
                if (liveStreams.length > 10) {
                    log(`  ... and ${liveStreams.length - 10} more`);
                }
            }

            if (!DRY_RUN) {
                const now = new Date();
                const twelveHours = hoursAgo(12);
                const twoHours = hoursAgo(2);

                // End stale streams (12+ hours old)
                const staleResult = await collection.updateMany(
                    {
                        isLive: true,
                        startedAt: { $lt: twelveHours },
                    },
                    {
                        $set: {
                            isLive: false,
                            status: "ended",
                            endedAt: now,
                            endReason: "cleanup_stale",
                        },
                    }
                );

                // End inactive streams (2+ hours no update)
                const inactiveResult = await collection.updateMany(
                    {
                        isLive: true,
                        updatedAt: { $lt: twoHours },
                    },
                    {
                        $set: {
                            isLive: false,
                            status: "ended",
                            endedAt: now,
                            endReason: "cleanup_inactive",
                        },
                    }
                );

                totalCleaned +=
                    staleResult.modifiedCount + inactiveResult.modifiedCount;
                log(
                    `  Ended ${staleResult.modifiedCount} stale, ${inactiveResult.modifiedCount} inactive in ${collName}`
                );

                // Delete very old ended streams (60+ days)
                const deleteResult = await collection.deleteMany({
                    isLive: false,
                    endedAt: { $lt: daysAgo(60) },
                });

                if (deleteResult.deletedCount > 0) {
                    log(
                        `  Deleted ${deleteResult.deletedCount} old ended streams`
                    );
                    totalCleaned += deleteResult.deletedCount;
                }
            }
        } catch (e) {
            if (!e.message.includes("ns not found")) {
                warn(`Error with collection: ${e.message}`);
            }
        }
    }

    // Reset stuck user statuses
    if (!DRY_RUN) {
        const stuckUsers = await usersCollection.updateMany(
            {
                isLive: true,
                lastActive: { $lt: hoursAgo(2) },
            },
            {
                $set: {
                    isLive: false,
                    currentStreamId: null,
                },
            }
        );

        if (stuckUsers.modifiedCount > 0) {
            log(`  Reset ${stuckUsers.modifiedCount} stuck user statuses`);
            totalCleaned += stuckUsers.modifiedCount;
        }
    }

    success(`Cleaned ${totalCleaned} stream-related records`);
    return totalCleaned;
}

/**
 * Clean up invalid follow records
 */
async function cleanupFollowers(db) {
    log("\n👥 CLEANING UP FOLLOWERS...\n");

    const usersCollection = db.collection("users");
    let removedCount = 0;

    // Get all users with followers/following
    const users = await usersCollection
        .find({
            $or: [
                { followers: { $exists: true, $ne: [] } },
                { following: { $exists: true, $ne: [] } },
            ],
        })
        .toArray();

    log(`Checking ${users.length} users with follow data...`);

    for (const user of users) {
        const validFollowers = [];
        const validFollowing = [];
        let changed = false;

        // Validate followers
        if (user.followers?.length > 0) {
            for (const followerId of user.followers) {
                const exists = await usersCollection.findOne({
                    _id: followerId,
                });
                if (exists) {
                    validFollowers.push(followerId);
                } else {
                    changed = true;
                    removedCount++;
                }
            }
        }

        // Validate following
        if (user.following?.length > 0) {
            for (const followingId of user.following) {
                const exists = await usersCollection.findOne({
                    _id: followingId,
                });
                if (exists) {
                    validFollowing.push(followingId);
                } else {
                    changed = true;
                    removedCount++;
                }
            }
        }

        // Update if changed
        if (changed && !DRY_RUN) {
            await usersCollection.updateOne(
                { _id: user._id },
                {
                    $set: {
                        followers: validFollowers,
                        following: validFollowing,
                        followersCount: validFollowers.length,
                        followingCount: validFollowing.length,
                    },
                }
            );
        }
    }

    // Check separate follows collection if exists
    try {
        const followsCollection = db.collection("follows");
        const followCount = await followsCollection.countDocuments({});

        if (followCount > 0) {
            log(
                `Found separate follows collection with ${followCount} records`
            );

            // Remove orphaned follows
            const allFollows = await followsCollection.find({}).toArray();

            for (const follow of allFollows) {
                const follower = await usersCollection.findOne({
                    _id: follow.follower,
                });
                const following = await usersCollection.findOne({
                    _id: follow.following,
                });

                if (!follower || !following) {
                    if (!DRY_RUN) {
                        await followsCollection.deleteOne({ _id: follow._id });
                    }
                    removedCount++;
                }
            }

            // Remove duplicates
            const pipeline = [
                {
                    $group: {
                        _id: { follower: "$follower", following: "$following" },
                        count: { $sum: 1 },
                        ids: { $push: "$_id" },
                    },
                },
                { $match: { count: { $gt: 1 } } },
            ];

            const duplicates = await followsCollection.aggregate(pipeline).toArray();

            for (const dup of duplicates) {
                const idsToRemove = dup.ids.slice(1);
                if (!DRY_RUN) {
                    await followsCollection.deleteMany({
                        _id: { $in: idsToRemove },
                    });
                }
                removedCount += idsToRemove.length;
            }
        }
    } catch (e) {
        // Collection doesn't exist, that's fine
    }

    success(`Cleaned ${removedCount} invalid follow records`);
    return removedCount;
}

/**
 * Clean up old notifications
 */
async function cleanupNotifications(db) {
    log("\n🔔 CLEANING UP NOTIFICATIONS...\n");

    const usersCollection = db.collection("users");
    let totalRemoved = 0;

    // Get users with notifications
    const users = await usersCollection
        .find({
            notifications: { $exists: true, $ne: [] },
        })
        .toArray();

    log(`Checking notifications for ${users.length} users...`);

    const thirtyDaysAgo = daysAgo(30);

    for (const user of users) {
        if (!user.notifications?.length) continue;


        // Keep unread and recent notifications
        const keepNotifications = user.notifications.filter((n) => {
            if (!n) return false;
            if (!n.createdAt) return !n.read; // keep unread even if no date
            const created = new Date(n.createdAt);
            if (Number.isNaN(created.getTime())) return !n.read;
            return !n.read || created > thirtyDaysAgo;
        });

        // Also limit to 100 max
        const finalNotifications = keepNotifications.slice(0, 100);
        const removed = user.notifications.length - finalNotifications.length;

        if (removed > 0 && !DRY_RUN) {
            await usersCollection.updateOne(
                { _id: user._id },
                { $set: { notifications: finalNotifications } }
            );
            totalRemoved += removed;
        }
    }

    // Check separate notifications collection
    try {
        const notificationsCollection = db.collection("notifications");
        const count = await notificationsCollection.countDocuments({});

        if (count > 0) {
            log(
                `Found separate notifications collection with ${count} records`
            );

            if (!DRY_RUN) {
                const result = await notificationsCollection.deleteMany({
                    createdAt: { $lt: daysAgo(30) },
                    read: true,
                });
                totalRemoved += result.deletedCount;
            }
        }
    } catch (e) {
        // Collection doesn't exist
    }

    success(`Removed ${totalRemoved} old notifications`);
    return totalRemoved;
}

/**
 * Clean up deleted and orphaned posts
 */
async function cleanupPosts(db) {
    log("\n📝 CLEANING UP POSTS...\n");

    const postsCollection = db.collection("posts");
    const usersCollection = db.collection("users");
    let totalCleaned = 0;

    // Permanently delete soft-deleted posts older than 30 days
    if (!DRY_RUN) {
        const deletedResult = await postsCollection.deleteMany({
            status: "deleted",
            deletedAt: { $lt: daysAgo(30) },
        });

        if (deletedResult.deletedCount > 0) {
            log(
                `  Permanently deleted ${deletedResult.deletedCount} soft-deleted posts`
            );
            totalCleaned += deletedResult.deletedCount;
        }
    }

    // Find orphaned posts (user doesn't exist)
    const posts = await postsCollection.find({}).project({ userId: 1 }).toArray();
    let orphanedCount = 0;

    for (const post of posts) {
        if (post.userId) {
            const userExists = await usersCollection.findOne({
                _id: post.userId,
            });
            if (!userExists) {
                if (!DRY_RUN) {
                    await postsCollection.deleteOne({ _id: post._id });
                }
                orphanedCount++;
            }
        }
    }

    if (orphanedCount > 0) {
        log(`  Removed ${orphanedCount} orphaned posts`);
        totalCleaned += orphanedCount;
    }

    success(`Cleaned ${totalCleaned} posts`);
    return totalCleaned;
}

/**
 * Clean up orphaned gifts
 */
async function cleanupGifts(db) {
    log("\n🎁 CLEANING UP GIFTS...\n");

    let totalCleaned = 0;

    try {
        const giftsCollection = db.collection("gifts");
        const usersCollection = db.collection("users");

        const gifts = await giftsCollection.find({}).toArray();
        log(`Found ${gifts.length} gift records`);

        let orphaned = 0;

        for (const gift of gifts) {
            const senderExists = gift.senderId
                ? await usersCollection.findOne({ _id: gift.senderId })
                : true;
            const recipientExists = gift.recipientId
                ? await usersCollection.findOne({ _id: gift.recipientId })
                : true;

            if (!senderExists || !recipientExists) {
                if (!DRY_RUN) {
                    await giftsCollection.deleteOne({ _id: gift._id });
                }
                orphaned++;
            }
        }

        if (orphaned > 0) {
            log(`  Removed ${orphaned} orphaned gifts`);
            totalCleaned += orphaned;
        }

        // Delete very old gifts (1 year+)
        if (!DRY_RUN) {
            const oldResult = await giftsCollection.deleteMany({
                createdAt: { $lt: daysAgo(365) },
            });

            if (oldResult.deletedCount > 0) {
                log(
                    `  Deleted ${oldResult.deletedCount} gifts older than 1 year`
                );
                totalCleaned += oldResult.deletedCount;
            }
        }
    } catch (e) {
        if (!e.message.includes("ns not found")) {
            warn(`Gifts cleanup error: ${e.message}`);
        }
    }

    success(`Cleaned ${totalCleaned} gift records`);
    return totalCleaned;
}

/**
 * Clean up expired sessions
 */
async function cleanupSessions(db) {
    log("\n🔑 CLEANING UP SESSIONS...\n");

    let totalCleaned = 0;

    try {
        const sessionsCollection = db.collection("sessions");
        const count = await sessionsCollection.countDocuments({});

        if (count > 0) {
            log(`Found ${count} session records`);

            if (!DRY_RUN) {
                // Delete expired sessions
                const result = await sessionsCollection.deleteMany({
                    expires: { $lt: new Date() },
                });

                totalCleaned = result.deletedCount;
            }
        }
    } catch (e) {
        if (!e.message.includes("ns not found")) {
            warn(`Sessions cleanup error: ${e.message}`);
        }
    }

    success(`Cleaned ${totalCleaned} expired sessions`);
    return totalCleaned;
}

/**
 * Clean up inactive/unverified users (no deletion – only maintenance)
 */
async function cleanupUsers(db) {
    log("\n👤 CLEANING UP USERS...\n");

    const usersCollection = db.collection("users");
    let totalCleaned = 0;

    // Only report unverified users who never logged in and are 30+ days old
    const unverifiedCount = await usersCollection.countDocuments({
        emailVerified: false,
        lastActive: { $exists: false },
        createdAt: { $lt: daysAgo(30) },
    });

    log(
        `Found ${unverifiedCount} unverified users (30+ days, never active)`
    );
    warn("User deletion is DISABLED for safety. Manual review recommended.");

    // Clean up user wallet transactions (keep last MAX_WALLET_TX)
    const users = await usersCollection
        .find({
            [`wallet.transactions.${MAX_WALLET_TX}`]: { $exists: true },
        })
        .toArray();

    for (const user of users) {
        if (user.wallet?.transactions?.length > MAX_WALLET_TX) {
            if (!DRY_RUN) {
                await usersCollection.updateOne(
                    { _id: user._id },
                    {
                        $set: {
                            "wallet.transactions":
                                user.wallet.transactions.slice(
                                    0,
                                    MAX_WALLET_TX
                                ),
                        },
                    }
                );
            }
            totalCleaned++;
            log(
                `  Trimmed transactions for ${user.username} → ${MAX_WALLET_TX} max`
            );
        }
    }

    success(`Cleaned ${totalCleaned} user records (wallet trims only)`);
    return totalCleaned;
}

/**
 * Show database statistics
 */
async function showStats(db) {
    log("\n📊 DATABASE STATISTICS\n");

    const collections = [
        "users",
        "posts",
        "streams",
        "livestreams",
        "gifts",
        "notifications",
        "follows",
        "sessions",
        "pks",
        "predictions",
    ];

    for (const name of collections) {
        try {
            const collection = db.collection(name);
            const count = await collection.countDocuments({});
            log(`  ${name}: ${count.toLocaleString()} documents`);
        } catch (e) {
            // Collection doesn't exist
        }
    }
}

// ===========================================
// MAIN
// ===========================================

async function main() {
    const args = process.argv
        .slice(2)
        .filter((a) => !a.startsWith("--"));
    const type = args[0] || "all";

    console.log("╔════════════════════════════════════════╗");
    console.log("║  🧹 WORLD-STUDIO CLEANUP UTILITY       ║");
    console.log("╚════════════════════════════════════════╝\n");

    if (DRY_RUN) {
        warn("DRY RUN MODE - No changes will be made\n");
    }

    if (!MONGO_URI) {
        error("No MONGO_URI / MONGODB_URI found in .env");
        process.exit(1);
    }

    try {
        await mongoose.connect(MONGO_URI);
        success("Connected to MongoDB\n");

        const db = mongoose.connection.db;

        // Show stats first
        await showStats(db);

        const results = {
            streams: 0,
            followers: 0,
            notifications: 0,
            posts: 0,
            gifts: 0,
            sessions: 0,
            users: 0,
        };

        switch (type.toLowerCase()) {
            case "streams":
                results.streams = await cleanupStreams(db);
                break;
            case "followers":
                results.followers = await cleanupFollowers(db);
                break;
            case "notifications":
                results.notifications = await cleanupNotifications(db);
                break;
            case "posts":
                results.posts = await cleanupPosts(db);
                break;
            case "gifts":
                results.gifts = await cleanupGifts(db);
                break;
            case "sessions":
                results.sessions = await cleanupSessions(db);
                break;
            case "users":
                results.users = await cleanupUsers(db);
                break;
            case "all":
            default:
                results.streams = await cleanupStreams(db);
                results.followers = await cleanupFollowers(db);
                results.notifications = await cleanupNotifications(db);
                results.posts = await cleanupPosts(db);
                results.gifts = await cleanupGifts(db);
                results.sessions = await cleanupSessions(db);
                results.users = await cleanupUsers(db);
                break;
        }

        console.log("\n╔════════════════════════════════════════╗");
        console.log("║  📊 CLEANUP SUMMARY                    ║");
        console.log("╠════════════════════════════════════════╣");
        console.log(
            `║  Streams:       ${String(results.streams).padStart(
                6
            )}              ║`
        );
        console.log(
            `║  Followers:     ${String(results.followers).padStart(
                6
            )}              ║`
        );
        console.log(
            `║  Notifications: ${String(results.notifications).padStart(
                6
            )}              ║`
        );
        console.log(
            `║  Posts:         ${String(results.posts).padStart(
                6
            )}              ║`
        );
        console.log(
            `║  Gifts:         ${String(results.gifts).padStart(
                6
            )}              ║`
        );
        console.log(
            `║  Sessions:      ${String(results.sessions).padStart(
                6
            )}              ║`
        );
        console.log(
            `║  Users:         ${String(results.users).padStart(
                6
            )}              ║`
        );
        console.log("╚════════════════════════════════════════╝\n");

        const total = Object.values(results).reduce((a, b) => a + b, 0);

        if (DRY_RUN) {
            warn(
                `Would clean ${total} records. Run without --dry-run to apply.`
            );
        } else {
            success(`Total cleaned: ${total} records`);
        }

    } catch (err) {
        error(`Error: ${err.message}`);
    } finally {
        await mongoose.disconnect().catch(() => { });
        log("\n👋 Done!");
        process.exit(0);
    }
}

main();
