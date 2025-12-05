// backend/scripts/cleanupStreams.js
// World-Studio.live - Stream Cleanup Script
// Run: node scripts/cleanupStreams.js [mode]
//
// Modes:
//   all       - End all live streams (default)
//   stale     - End streams older than 12 hours
//   inactive  - End streams with no activity for 2 hours
//   user      - End streams for a specific user
//   delete    - Delete old ended streams (60+ days)
//   --dry-run - Preview changes without applying

require("dotenv").config();
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const DRY_RUN = process.argv.includes("--dry-run");

// Helper functions
const hoursAgo = (hours) => new Date(Date.now() - hours * 60 * 60 * 1000);
const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

const formatDuration = (startedAt) => {
    if (!startedAt) return "unknown";
    const seconds = Math.floor((Date.now() - new Date(startedAt)) / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
};

async function showLiveStreams(db) {
    console.log("\n📺 CURRENT LIVE STREAMS\n");

    const collections = ["streams", "livestreams"];
    let totalLive = 0;

    for (const collName of collections) {
        try {
            const collection = db.collection(collName);
            const liveStreams = await collection.find({ isLive: true }).toArray();

            if (liveStreams.length > 0) {
                console.log(`${collName} collection (${liveStreams.length}):`);

                for (const stream of liveStreams) {
                    const duration = formatDuration(stream.startedAt || stream.createdAt);
                    const viewers = stream.viewersCount || stream.viewers?.length || 0;

                    console.log(`  🟢 "${stream.title || "Untitled"}"`);
                    console.log(`     Streamer: ${stream.username || stream.streamerName || "Unknown"}`);
                    console.log(`     Duration: ${duration}`);
                    console.log(`     Viewers: ${viewers}`);
                    console.log(`     ID: ${stream._id}`);
                    console.log("");
                }

                totalLive += liveStreams.length;
            }
        } catch (e) {
            // Collection doesn't exist
        }
    }

    if (totalLive === 0) {
        console.log("✅ No live streams found!\n");
    }

    return totalLive;
}

async function endAllStreams(db) {
    console.log("\n🧹 ENDING ALL LIVE STREAMS...\n");

    const collections = ["streams", "livestreams"];
    let totalEnded = 0;

    for (const collName of collections) {
        try {
            const collection = db.collection(collName);

            if (!DRY_RUN) {
                const result = await collection.updateMany(
                    { isLive: true },
                    {
                        $set: {
                            isLive: false,
                            status: "ended",
                            endedAt: new Date(),
                            endReason: "manual_cleanup"
                        }
                    }
                );

                if (result.modifiedCount > 0) {
                    console.log(`  ✅ Ended ${result.modifiedCount} streams in ${collName}`);
                    totalEnded += result.modifiedCount;
                }
            } else {
                const count = await collection.countDocuments({ isLive: true });
                if (count > 0) {
                    console.log(`  Would end ${count} streams in ${collName}`);
                    totalEnded += count;
                }
            }
        } catch (e) {
            // Collection doesn't exist
        }
    }

    // Reset user statuses
    try {
        const usersCollection = db.collection("users");

        if (!DRY_RUN) {
            const userResult = await usersCollection.updateMany(
                { isLive: true },
                {
                    $set: {
                        isLive: false,
                        currentStreamId: null
                    }
                }
            );

            if (userResult.modifiedCount > 0) {
                console.log(`  ✅ Reset ${userResult.modifiedCount} user statuses`);
            }
        } else {
            const count = await usersCollection.countDocuments({ isLive: true });
            if (count > 0) {
                console.log(`  Would reset ${count} user statuses`);
            }
        }
    } catch (e) {
        console.log(`  ⚠️ User reset skipped: ${e.message}`);
    }

    console.log(`\n✅ Total ended: ${totalEnded} streams`);
    return totalEnded;
}

async function endStaleStreams(db) {
    console.log("\n🧹 ENDING STALE STREAMS (12+ hours)...\n");

    const collections = ["streams", "livestreams"];
    let totalEnded = 0;
    const threshold = hoursAgo(12);

    for (const collName of collections) {
        try {
            const collection = db.collection(collName);

            // Find stale streams
            const staleStreams = await collection.find({
                isLive: true,
                $or: [
                    { startedAt: { $lt: threshold } },
                    { createdAt: { $lt: threshold } }
                ]
            }).toArray();

            if (staleStreams.length > 0) {
                console.log(`Found ${staleStreams.length} stale in ${collName}:`);

                for (const stream of staleStreams) {
                    const duration = formatDuration(stream.startedAt || stream.createdAt);
                    console.log(`  ⏰ "${stream.title || "Untitled"}" - ${duration} old`);
                }

                if (!DRY_RUN) {
                    const result = await collection.updateMany(
                        {
                            isLive: true,
                            $or: [
                                { startedAt: { $lt: threshold } },
                                { createdAt: { $lt: threshold } }
                            ]
                        },
                        {
                            $set: {
                                isLive: false,
                                status: "ended",
                                endedAt: new Date(),
                                endReason: "stale_cleanup"
                            }
                        }
                    );
                    totalEnded += result.modifiedCount;
                } else {
                    totalEnded += staleStreams.length;
                }
            }
        } catch (e) {
            // Collection doesn't exist
        }
    }

    console.log(`\n✅ Ended ${totalEnded} stale streams`);
    return totalEnded;
}

async function endInactiveStreams(db) {
    console.log("\n🧹 ENDING INACTIVE STREAMS (2+ hours no activity)...\n");

    const collections = ["streams", "livestreams"];
    let totalEnded = 0;
    const threshold = hoursAgo(2);

    for (const collName of collections) {
        try {
            const collection = db.collection(collName);

            const inactiveStreams = await collection.find({
                isLive: true,
                updatedAt: { $lt: threshold }
            }).toArray();

            if (inactiveStreams.length > 0) {
                console.log(`Found ${inactiveStreams.length} inactive in ${collName}:`);

                for (const stream of inactiveStreams) {
                    const lastUpdate = stream.updatedAt
                        ? new Date(stream.updatedAt).toLocaleString()
                        : "never";
                    console.log(`  💤 "${stream.title || "Untitled"}" - last active: ${lastUpdate}`);
                }

                if (!DRY_RUN) {
                    const result = await collection.updateMany(
                        {
                            isLive: true,
                            updatedAt: { $lt: threshold }
                        },
                        {
                            $set: {
                                isLive: false,
                                status: "ended",
                                endedAt: new Date(),
                                endReason: "inactive_cleanup"
                            }
                        }
                    );
                    totalEnded += result.modifiedCount;
                } else {
                    totalEnded += inactiveStreams.length;
                }
            }
        } catch (e) {
            // Collection doesn't exist
        }
    }

    console.log(`\n✅ Ended ${totalEnded} inactive streams`);
    return totalEnded;
}

async function endUserStreams(db, username) {
    console.log(`\n🧹 ENDING STREAMS FOR USER: ${username}...\n`);

    const collections = ["streams", "livestreams"];
    let totalEnded = 0;

    // Find user first
    const usersCollection = db.collection("users");
    const user = await usersCollection.findOne({
        username: { $regex: new RegExp(`^${username}$`, "i") }
    });

    if (!user) {
        console.log(`❌ User "${username}" not found`);
        return 0;
    }

    console.log(`Found user: ${user.username} (${user._id})`);

    for (const collName of collections) {
        try {
            const collection = db.collection(collName);

            const userStreams = await collection.find({
                isLive: true,
                $or: [
                    { streamerId: user._id },
                    { host: user._id },
                    { userId: user._id },
                    { username: user.username }
                ]
            }).toArray();

            if (userStreams.length > 0) {
                console.log(`Found ${userStreams.length} live streams for ${username} in ${collName}`);

                if (!DRY_RUN) {
                    const result = await collection.updateMany(
                        {
                            isLive: true,
                            $or: [
                                { streamerId: user._id },
                                { host: user._id },
                                { userId: user._id },
                                { username: user.username }
                            ]
                        },
                        {
                            $set: {
                                isLive: false,
                                status: "ended",
                                endedAt: new Date(),
                                endReason: "user_cleanup"
                            }
                        }
                    );
                    totalEnded += result.modifiedCount;
                } else {
                    totalEnded += userStreams.length;
                }
            }
        } catch (e) {
            // Collection doesn't exist
        }
    }

    // Reset user status
    if (!DRY_RUN) {
        await usersCollection.updateOne(
            { _id: user._id },
            {
                $set: {
                    isLive: false,
                    currentStreamId: null
                }
            }
        );
        console.log(`  ✅ Reset user status for ${username}`);
    }

    console.log(`\n✅ Ended ${totalEnded} streams for ${username}`);
    return totalEnded;
}

async function deleteOldStreams(db) {
    console.log("\n🗑️  DELETING OLD ENDED STREAMS (60+ days)...\n");

    const collections = ["streams", "livestreams"];
    let totalDeleted = 0;
    const threshold = daysAgo(60);

    for (const collName of collections) {
        try {
            const collection = db.collection(collName);

            const oldCount = await collection.countDocuments({
                isLive: false,
                endedAt: { $lt: threshold }
            });

            if (oldCount > 0) {
                console.log(`Found ${oldCount} old streams in ${collName}`);

                if (!DRY_RUN) {
                    const result = await collection.deleteMany({
                        isLive: false,
                        endedAt: { $lt: threshold }
                    });
                    totalDeleted += result.deletedCount;
                    console.log(`  ✅ Deleted ${result.deletedCount} from ${collName}`);
                } else {
                    totalDeleted += oldCount;
                }
            }
        } catch (e) {
            // Collection doesn't exist
        }
    }

    console.log(`\n✅ Deleted ${totalDeleted} old streams`);
    return totalDeleted;
}

async function showStats(db) {
    console.log("\n📊 STREAM STATISTICS\n");

    const collections = ["streams", "livestreams"];

    for (const collName of collections) {
        try {
            const collection = db.collection(collName);

            const total = await collection.countDocuments({});
            const live = await collection.countDocuments({ isLive: true });
            const ended = await collection.countDocuments({ isLive: false });

            if (total > 0) {
                console.log(`${collName}:`);
                console.log(`  Total: ${total}`);
                console.log(`  Live: ${live}`);
                console.log(`  Ended: ${ended}`);
                console.log("");
            }
        } catch (e) {
            // Collection doesn't exist
        }
    }

    // Users marked as live
    try {
        const liveUsers = await db.collection("users").countDocuments({ isLive: true });
        console.log(`Users marked live: ${liveUsers}`);
    } catch (e) { }
}

async function main() {
    const args = process.argv.slice(2).filter(a => !a.startsWith("--"));
    const mode = args[0] || "all";
    const username = args[1];

    console.log("╔════════════════════════════════════════╗");
    console.log("║  📺 STREAM CLEANUP UTILITY             ║");
    console.log("╚════════════════════════════════════════╝\n");

    if (DRY_RUN) {
        console.log("⚠️  DRY RUN MODE - No changes will be made\n");
    }

    if (!MONGO_URI) {
        console.error("❌ No MONGO_URI found in .env");
        process.exit(1);
    }

    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(MONGO_URI);
        console.log("✅ Connected!\n");

        const db = mongoose.connection.db;

        // Show stats
        await showStats(db);

        // Show live streams
        await showLiveStreams(db);

        let result = 0;

        switch (mode.toLowerCase()) {
            case "all":
                result = await endAllStreams(db);
                break;
            case "stale":
                result = await endStaleStreams(db);
                break;
            case "inactive":
                result = await endInactiveStreams(db);
                break;
            case "user":
                if (!username) {
                    console.log("Usage: node cleanupStreams.js user <username>");
                    break;
                }
                result = await endUserStreams(db, username);
                break;
            case "delete":
                result = await deleteOldStreams(db);
                break;
            default:
                console.log("Unknown mode. Available: all, stale, inactive, user, delete");
                break;
        }

        // Verify
        console.log("\n📊 After cleanup:");
        await showStats(db);

        if (DRY_RUN && result > 0) {
            console.log(`\n⚠️  Would affect ${result} records. Run without --dry-run to apply.`);
        }

        console.log("\n🔄 Refresh your LiveDiscover page to see changes!");

    } catch (error) {
        console.error("❌ Error:", error.message);
    } finally {
        await mongoose.disconnect();
        console.log("\n👋 Done!");
        process.exit(0);
    }
}

main();