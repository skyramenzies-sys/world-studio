// backend/scripts/debugStreams.js
// World-Studio.live - Stream Debug Utility
// Run: node scripts/debugStreams.js [collection]
//
// Examples:
//   node scripts/debugStreams.js           # Check all stream collections
//   node scripts/debugStreams.js streams   # Check streams collection only
//   node scripts/debugStreams.js users     # Check user live statuses

require("dotenv").config();
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

// Helper functions
const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleString();
};

const formatDuration = (startedAt, endedAt = null) => {
    if (!startedAt) return "unknown";
    const end = endedAt ? new Date(endedAt) : new Date();
    const seconds = Math.floor((end - new Date(startedAt)) / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
};

async function debugStreamsCollection(db, collectionName) {
    console.log(`\n📺 DEBUGGING ${collectionName.toUpperCase()} COLLECTION\n`);

    try {
        const collection = db.collection(collectionName);

        // Total counts
        const totalCount = await collection.countDocuments();
        const liveCount = await collection.countDocuments({ isLive: true });
        const endedCount = await collection.countDocuments({ isLive: false });

        console.log(`Total documents: ${totalCount}`);
        console.log(`Live streams: ${liveCount}`);
        console.log(`Ended streams: ${endedCount}`);

        // Check for various "live" indicators
        const statusLive = await collection.countDocuments({ status: "live" });
        const statusActive = await collection.countDocuments({ status: "active" });
        const liveTrue = await collection.countDocuments({ live: true });
        const streamingTrue = await collection.countDocuments({ streaming: true });

        console.log(`\n📌 Live Indicators:`);
        console.log(`   isLive: true = ${liveCount}`);
        console.log(`   status: "live" = ${statusLive}`);
        console.log(`   status: "active" = ${statusActive}`);
        console.log(`   live: true = ${liveTrue}`);
        console.log(`   streaming: true = ${streamingTrue}`);

        // Get last 20 streams
        const recentStreams = await collection
            .find({})
            .sort({ createdAt: -1 })
            .limit(20)
            .toArray();

        console.log(`\n📜 Last 20 Streams:\n`);

        for (const stream of recentStreams) {
            const status = stream.isLive ? "🟢 LIVE" : "⚫ ENDED";
            const duration = stream.isLive
                ? formatDuration(stream.startedAt || stream.createdAt)
                : formatDuration(stream.startedAt || stream.createdAt, stream.endedAt);

            console.log(`${status} "${stream.title || "Untitled"}"`);
            console.log(`    ID: ${stream._id}`);
            console.log(`    Streamer: ${stream.username || stream.streamerName || "Unknown"}`);
            console.log(`    isLive: ${stream.isLive}`);
            console.log(`    status: ${stream.status || "(not set)"}`);
            console.log(`    Duration: ${duration}`);
            console.log(`    Viewers: ${stream.viewersCount || stream.viewers?.length || 0}`);
            console.log(`    Created: ${formatDate(stream.createdAt)}`);
            console.log(`    Started: ${formatDate(stream.startedAt)}`);
            console.log(`    Ended: ${formatDate(stream.endedAt)}`);
            console.log("");
        }

        // Find potential ghost streams
        const ghostStreams = await collection.find({
            $or: [
                { isLive: true },
                { status: "live" },
                { status: "active" },
                { live: true },
                { streaming: true }
            ]
        }).toArray();

        if (ghostStreams.length > 0) {
            console.log(`\n🎯 POTENTIAL GHOST STREAMS (${ghostStreams.length}):\n`);

            for (const s of ghostStreams) {
                const age = formatDuration(s.startedAt || s.createdAt);
                console.log(`  ⚠️  "${s.title || "Untitled"}" - ${age} old`);
                console.log(`      ID: ${s._id}`);
                console.log(`      isLive=${s.isLive}, status=${s.status}, live=${s.live}, streaming=${s.streaming}`);
                console.log(`      Streamer: ${s.username || s.streamerName || "Unknown"}`);
                console.log("");
            }
        } else {
            console.log(`\n✅ No ghost streams found in ${collectionName}`);
        }

        // Check for orphaned streams (streamer doesn't exist)
        const usersCollection = db.collection("users");
        let orphanedCount = 0;

        for (const stream of recentStreams.slice(0, 10)) {
            const streamerId = stream.streamerId || stream.host || stream.userId;
            if (streamerId) {
                const userExists = await usersCollection.findOne({ _id: streamerId });
                if (!userExists) {
                    orphanedCount++;
                    console.log(`  🔍 Orphaned stream: "${stream.title}" (user ${streamerId} not found)`);
                }
            }
        }

        if (orphanedCount > 0) {
            console.log(`\n⚠️  Found ${orphanedCount} orphaned streams (user deleted)`);
        }

        return {
            total: totalCount,
            live: liveCount,
            ghosts: ghostStreams.length
        };

    } catch (e) {
        if (e.message.includes("ns not found")) {
            console.log(`Collection "${collectionName}" does not exist`);
        } else {
            console.log(`Error: ${e.message}`);
        }
        return { total: 0, live: 0, ghosts: 0 };
    }
}

async function debugUserStatuses(db) {
    console.log(`\n👤 DEBUGGING USER LIVE STATUSES\n`);

    const usersCollection = db.collection("users");

    // Users marked as live
    const liveUsers = await usersCollection.find({ isLive: true }).toArray();
    console.log(`Users marked as live: ${liveUsers.length}`);

    if (liveUsers.length > 0) {
        console.log(`\n🟢 Live Users:`);

        for (const user of liveUsers) {
            const lastActive = user.lastActive
                ? formatDuration(user.lastActive) + " ago"
                : "unknown";

            console.log(`  @${user.username}`);
            console.log(`    ID: ${user._id}`);
            console.log(`    isLive: ${user.isLive}`);
            console.log(`    currentStreamId: ${user.currentStreamId || "(not set)"}`);
            console.log(`    Last Active: ${lastActive}`);

            // Check if their stream actually exists
            if (user.currentStreamId) {
                const streamsCollection = db.collection("streams");
                const stream = await streamsCollection.findOne({ _id: user.currentStreamId });

                if (stream) {
                    console.log(`    Stream Status: ${stream.isLive ? "🟢 LIVE" : "⚫ ENDED"}`);
                } else {
                    console.log(`    Stream Status: ⚠️ STREAM NOT FOUND`);
                }
            }
            console.log("");
        }

        // Check for mismatches
        console.log(`\n🔍 CHECKING MISMATCHES...\n`);

        for (const user of liveUsers) {
            let hasActiveStream = false;

            for (const collName of ["streams", "livestreams"]) {
                try {
                    const collection = db.collection(collName);
                    const activeStream = await collection.findOne({
                        $or: [
                            { streamerId: user._id },
                            { host: user._id },
                            { userId: user._id }
                        ],
                        isLive: true
                    });

                    if (activeStream) {
                        hasActiveStream = true;
                        break;
                    }
                } catch (e) { }
            }

            if (!hasActiveStream) {
                console.log(`  ⚠️  @${user.username} is marked LIVE but has NO active stream!`);
            }
        }
    }

    // Users with currentStreamId but not live
    const inconsistentUsers = await usersCollection.find({
        isLive: false,
        currentStreamId: { $ne: null, $exists: true }
    }).toArray();

    if (inconsistentUsers.length > 0) {
        console.log(`\n⚠️  INCONSISTENT USERS (not live but has currentStreamId):`);
        for (const user of inconsistentUsers) {
            console.log(`  @${user.username} - currentStreamId: ${user.currentStreamId}`);
        }
    }

    return liveUsers.length;
}

async function debugSchemaFields(db) {
    console.log(`\n📋 STREAM SCHEMA ANALYSIS\n`);

    const collections = ["streams", "livestreams"];

    for (const collName of collections) {
        try {
            const collection = db.collection(collName);
            const sample = await collection.findOne({});

            if (sample) {
                console.log(`${collName} fields:`);
                const fields = Object.keys(sample).sort();

                for (const field of fields) {
                    const type = typeof sample[field];
                    const value = type === "object"
                        ? (Array.isArray(sample[field]) ? "Array" : "Object")
                        : type;
                    console.log(`  - ${field}: ${value}`);
                }
                console.log("");
            }
        } catch (e) { }
    }
}

async function main() {
    const args = process.argv.slice(2);
    const mode = args[0] || "all";

    console.log("╔════════════════════════════════════════╗");
    console.log("║  🔍 STREAM DEBUG UTILITY               ║");
    console.log("╚════════════════════════════════════════╝\n");

    if (!MONGO_URI) {
        console.error("❌ No MONGO_URI found in .env");
        process.exit(1);
    }

    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(MONGO_URI);
        console.log("✅ Connected!\n");

        const db = mongoose.connection.db;

        const results = {
            streams: { total: 0, live: 0, ghosts: 0 },
            livestreams: { total: 0, live: 0, ghosts: 0 },
            liveUsers: 0
        };

        switch (mode.toLowerCase()) {
            case "streams":
                results.streams = await debugStreamsCollection(db, "streams");
                break;
            case "livestreams":
                results.livestreams = await debugStreamsCollection(db, "livestreams");
                break;
            case "users":
                results.liveUsers = await debugUserStatuses(db);
                break;
            case "schema":
                await debugSchemaFields(db);
                break;
            case "all":
            default:
                results.streams = await debugStreamsCollection(db, "streams");
                results.livestreams = await debugStreamsCollection(db, "livestreams");
                results.liveUsers = await debugUserStatuses(db);
                break;
        }

        // Summary
        console.log("\n╔════════════════════════════════════════╗");
        console.log("║  📊 DEBUG SUMMARY                      ║");
        console.log("╠════════════════════════════════════════╣");
        console.log(`║  streams:     ${String(results.streams.total).padStart(5)} total, ${String(results.streams.live).padStart(3)} live  ║`);
        console.log(`║  livestreams: ${String(results.livestreams.total).padStart(5)} total, ${String(results.livestreams.live).padStart(3)} live  ║`);
        console.log(`║  Ghost streams: ${String(results.streams.ghosts + results.livestreams.ghosts).padStart(5)}             ║`);
        console.log(`║  Live users: ${String(results.liveUsers).padStart(8)}             ║`);
        console.log("╚════════════════════════════════════════╝");

        const totalGhosts = results.streams.ghosts + results.livestreams.ghosts;
        if (totalGhosts > 0) {
            console.log(`\n⚠️  Found ${totalGhosts} potential ghost streams!`);
            console.log("Run: node scripts/cleanupStreams.js to clean them up");
        }

    } catch (error) {
        console.error("❌ Error:", error.message);
    } finally {
        await mongoose.disconnect();
        console.log("\n👋 Done!");
        process.exit(0);
    }
}

main();