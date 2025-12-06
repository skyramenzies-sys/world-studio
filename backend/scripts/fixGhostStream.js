// backend/scripts/fixGhostStream.js
// World-Studio.live - Fix Ghost Streams Script (UNIVERSE EDITION 🚀)
// Run: node scripts/fixGhostStream.js [streamId or username]
//
// Examples:
//   node scripts/fixGhostStream.js                           # Fix all ghost streams
//   node scripts/fixGhostStream.js 692d7dc07fb279f92c1cefb7  # Fix specific stream ID
//   node scripts/fixGhostStream.js MyHood                    # Fix all streams by username
//   node scripts/fixGhostStream.js --dry-run                 # Preview changes

require("dotenv").config();
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const DRY_RUN = process.argv.includes("--dry-run");
const STREAM_COLLECTIONS = ["streams", "livestreams"];

// ===========================================
// HELPERS
// ===========================================


const isValidObjectId = (str) => {
    if (!str) return false;
    if (!mongoose.Types.ObjectId.isValid(str)) return false;
    return new mongoose.Types.ObjectId(str).toString() === str;
};

const safeGetCollection = (db, name) => {
    try {
        return db.collection(name);
    } catch {
        return null;
    }
};

const formatDate = (d) => (d ? new Date(d).toLocaleString() : "N/A");

// ===========================================
// FIX BY STREAM ID
// ===========================================
async function fixStreamById(db, streamId) {
    console.log(`\n🎯 FIXING STREAM BY ID: ${streamId}\n`);


    let found = false;
    let fixed = 0;

    for (const collName of STREAM_COLLECTIONS) {
        const collection = safeGetCollection(db, collName);
        if (!collection) continue;


        try {
            const _id = new mongoose.Types.ObjectId(streamId);
            const stream = await collection.findOne({ _id });

            if (!stream) continue;

            found = true;
            console.log(`Found in ${collName}:`);
            console.log(`  Title:    "${stream.title || "Untitled"}"`);
            console.log(`  Streamer: ${stream.username || stream.streamerName || "Unknown"}`);
            console.log(`  isLive:   ${stream.isLive}`);
            console.log(`  status:   ${stream.status || "(not set)"}`);
            console.log(`  Created:  ${formatDate(stream.createdAt)}`);

            if (!stream.isLive) {
                console.log(`\n✅ Stream is already ended\n`);
                return 0;
            }

            if (!DRY_RUN) {
                const result = await collection.updateOne(
                    { _id },
                    {
                        $set: {
                            isLive: false,
                            status: "ended",
                            endedAt: new Date(),
                            endReason: "manual_fix_by_id"
                        }
                    }
                );
                console.log(`\n✅ Fixed stream in ${collName}. Modified: ${result.modifiedCount}`);
                fixed += result.modifiedCount;
            } else {
                console.log(`\n⚠️  DRY RUN → Would mark this stream as ended in ${collName}`);
                fixed += 1;
            }

            // Also reset user status
            const streamerId = stream.streamerId || stream.host || stream.userId;
            if (streamerId) {
                const usersCollection = safeGetCollection(db, "users");
                if (usersCollection && !DRY_RUN) {
                    const userResult = await usersCollection.updateOne(
                        { _id: streamerId },
                        {
                            $set: {
                                isLive: false,
                                currentStreamId: null
                            }
                        }
                    );
                    if (userResult.modifiedCount > 0) {
                        console.log(`✅ Reset user live status for streamer (${streamerId})`);
                    }
                } else if (DRY_RUN) {
                    console.log(`⚠️  DRY RUN → Would reset user live status for ${streamerId}`);
                }


            }

            return fixed;
        } catch (e) {
            console.log(`⚠️  Error checking ${collName}: ${e.message}`);
        }
    }

    if (!found) {
        console.log(`❌ Stream not found with ID: ${streamId}`);
    }

    return fixed;
}

// ===========================================
// FIX BY USERNAME
// ===========================================
async function fixStreamsByUsername(db, username) {
    console.log(`\n🎯 FIXING STREAMS BY USERNAME: ${username}\n`);

    const usersCollection = safeGetCollection(db, "users");
    if (!usersCollection) {
        console.log("❌ Users collection not found");
        return 0;
    }

    const user = await usersCollection.findOne({
        username: { $regex: new RegExp(`^${username}$`, "i") }
    });

    if (!user) {
        console.log(`❌ User "@${username}" not found`);
        return 0;
    }

    console.log(`Found user: @${user.username} (${user._id})`);
    console.log(`  isLive:          ${user.isLive}`);
    console.log(`  currentStreamId: ${user.currentStreamId || "(none)"}\n`);



    let totalFixed = 0;

    for (const collName of STREAM_COLLECTIONS) {
        const collection = safeGetCollection(db, collName);
        if (!collection) continue;

        try {
            const userStreams = await collection
                .find({
                    isLive: true,
                    $or: [
                        { streamerId: user._id },
                        { host: user._id },
                        { userId: user._id },
                        { username: user.username }
                    ]
                })
                .toArray();

            if (userStreams.length === 0) {
                console.log(`No live streams for @${user.username} in ${collName}`);
                continue;
            }

            console.log(`Found ${userStreams.length} live streams in ${collName}:`);
            for (const stream of userStreams) {
                console.log(`  - "${stream.title || "Untitled"}" (${stream._id})`);
            }

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
                            endReason: "manual_fix_by_username"
                        }
                    }
                );
                totalFixed += result.modifiedCount;
                console.log(`✅ Fixed ${result.modifiedCount} streams in ${collName}`);
            } else {
                totalFixed += userStreams.length;
                console.log(`⚠️  DRY RUN → Would fix ${userStreams.length} streams in ${collName}`);
            }
        } catch (e) {
            console.log(`⚠️  Error with ${collName}: ${e.message}`);
        }
    }

    // Reset user status
    if (!DRY_RUN) {
        const result = await usersCollection.updateOne(
            { _id: user._id },
            {
                $set: {
                    isLive: false,
                    currentStreamId: null
                }
            }
        );
        if (result.modifiedCount > 0) {
            console.log(`\n✅ Reset user live status for @${user.username}`);
        }
    } else {
        console.log(`\n⚠️  DRY RUN → Would reset user live status for @${user.username}`);
    }

    return totalFixed;
}

// ===========================================
// FIX ALL GHOST STREAMS
// ===========================================
async function fixAllGhostStreams(db) {
    console.log(`\n🧹 FIXING ALL GHOST STREAMS\n`);


    let totalFixed = 0;
    const fixedUsers = new Set();

    for (const collName of STREAM_COLLECTIONS) {
        const collection = safeGetCollection(db, collName);
        if (!collection) continue;

        try {
            // Find all streams that think they are live
            const liveStreams = await collection
                .find({
                    $or: [
                        { isLive: true },
                        { status: "live" },
                        { status: "active" },
                        { live: true },
                        { streaming: true }
                    ]
                })
                .toArray();

            if (liveStreams.length === 0) {
                console.log(`No ghost/live streams in ${collName}`);
                continue;
            }

            console.log(`Found ${liveStreams.length} ghost/live streams in ${collName}:`);

            for (const stream of liveStreams.slice(0, 30)) {
                console.log(
                    `  🟢 "${stream.title || "Untitled"}" by ${stream.username || "Unknown"
                    } (isLive=${stream.isLive}, status=${stream.status || "n/a"})`
                );
                const streamerId = stream.streamerId || stream.host || stream.userId;
                if (streamerId) fixedUsers.add(streamerId.toString());
            }
            if (liveStreams.length > 30) {
                console.log(`  ... and ${liveStreams.length - 30} more\n`);
            }

            if (!DRY_RUN) {
                const result = await collection.updateMany(
                    {
                        $or: [
                            { isLive: true },
                            { status: "live" },
                            { status: "active" },
                            { live: true },
                            { streaming: true }
                        ]
                    },
                    {
                        $set: {
                            isLive: false,
                            live: false,
                            streaming: false,
                            status: "ended",
                            endedAt: new Date(),
                            endReason: "ghost_fix_all"
                        }
                    }
                );
                totalFixed += result.modifiedCount;
                console.log(`\n✅ Fixed ${result.modifiedCount} streams in ${collName}`);
            } else {
                totalFixed += liveStreams.length;
                console.log(
                    `\n⚠️  DRY RUN → Would fix ${liveStreams.length} streams in ${collName}`
                );
            }
        } catch (e) {
            if (!e.message.includes("ns not found")) {
                console.log(`Error with ${collName}: ${e.message}`);
            }
        }
    }

    const usersCollection = safeGetCollection(db, "users");

    // Reset all affected user statuses
    if (usersCollection && fixedUsers.size > 0) {
        if (!DRY_RUN) {
            for (const userIdStr of fixedUsers) {
                try {
                    await usersCollection.updateOne(
                        { _id: new mongoose.Types.ObjectId(userIdStr) },
                        {
                            $set: {
                                isLive: false,
                                currentStreamId: null
                            }
                        }
                    );
                } catch {
                    // ignore per user
                }
            }
            console.log(`\n✅ Reset ${fixedUsers.size} user statuses (from streams)`);
        } else {
            console.log(
                `\n⚠️  DRY RUN → Would reset ${fixedUsers.size} user statuses (from streams)`
            );
        }
    }

    // Also fix any remaining users still marked as live
    if (usersCollection) {
        if (!DRY_RUN) {
            const stuckUsers = await usersCollection.updateMany(
                { isLive: true },
                {
                    $set: {
                        isLive: false,
                        currentStreamId: null
                    }
                }
            );

            if (stuckUsers.modifiedCount > 0) {
                console.log(
                    `✅ Fixed ${stuckUsers.modifiedCount} additional stuck user statuses`
                );
            }
        } else {
            const stuckCount = await usersCollection.countDocuments({ isLive: true });
            if (stuckCount > 0) {
                console.log(
                    `⚠️  DRY RUN → Would reset ${stuckCount} additional stuck user statuses`
                );
            }
        }
    }

    // Verify: any streams still live?
    let remaining = 0;
    for (const collName of STREAM_COLLECTIONS) {
        const collection = safeGetCollection(db, collName);
        if (!collection) continue;
        try {
            remaining += await collection.countDocuments({
                $or: [
                    { isLive: true },
                    { status: "live" },
                    { status: "active" },
                    { live: true },
                    { streaming: true }
                ]
            });
        } catch {
            // ignore
        }
    }

    console.log(`\n📊 Streams still marked live/active: ${remaining}`);
    if (remaining === 0) {
        console.log("🎉 All ghost streams fixed (from DB perspective)!");
    }

    return totalFixed;
}

// ===========================================
// MAIN
// ===========================================
async function main() {
    const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
    const target = args[0];

    console.log("╔════════════════════════════════════════╗");
    console.log("║  🔧 FIX GHOST STREAMS (UNIVERSE ED.)   ║");
    console.log("╚════════════════════════════════════════╝\n");

    if (DRY_RUN) {
        console.log("⚠️  DRY RUN MODE - No changes will be made\n");
    }

    if (!MONGO_URI) {
        console.error("❌ No MONGO_URI / MONGODB_URI found in .env");
        process.exit(1);
    }

    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(MONGO_URI);
        console.log("✅ Connected!\n");

        const db = mongoose.connection.db;

        let fixed = 0;

        if (target) {
            if (isValidObjectId(target)) {
                // Fix by stream ID
                fixed = await fixStreamById(db, target);
            } else {
                // Fix by username
                fixed = await fixStreamsByUsername(db, target);
            }
        } else {
            // Fix all ghost streams
            fixed = await fixAllGhostStreams(db);
        }

        console.log(`\n📊 Total fixed (affected): ${fixed} stream(s)`);

        if (DRY_RUN && fixed > 0) {
            console.log(`\n⚠️  Run without --dry-run to apply these changes`);
        }

    } catch (error) {
        console.error("❌ Error:", error.message);
    } finally {
        await mongoose.disconnect();
        console.log("\n👋 Done! Refresh your LiveDiscover page.");
        process.exit(0);
    }
}

main();
