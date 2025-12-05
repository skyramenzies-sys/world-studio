// backend/scripts/fixGhostStream.js
// World-Studio.live - Fix Ghost Streams Script
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

// Helper to check if string is valid ObjectId
const isValidObjectId = (str) => {
    return mongoose.Types.ObjectId.isValid(str) &&
        new mongoose.Types.ObjectId(str).toString() === str;
};

async function fixStreamById(db, streamId) {
    console.log(`\n🎯 FIXING STREAM BY ID: ${streamId}\n`);

    const collections = ["streams", "livestreams"];
    let found = false;

    for (const collName of collections) {
        try {
            const collection = db.collection(collName);

            const stream = await collection.findOne({
                _id: new mongoose.Types.ObjectId(streamId)
            });

            if (stream) {
                found = true;
                console.log(`Found in ${collName}:`);
                console.log(`  Title: "${stream.title || "Untitled"}"`);
                console.log(`  Streamer: ${stream.username || stream.streamerName || "Unknown"}`);
                console.log(`  isLive: ${stream.isLive}`);
                console.log(`  status: ${stream.status || "(not set)"}`);
                console.log(`  Created: ${stream.createdAt}`);

                if (stream.isLive) {
                    if (!DRY_RUN) {
                        const result = await collection.updateOne(
                            { _id: new mongoose.Types.ObjectId(streamId) },
                            {
                                $set: {
                                    isLive: false,
                                    status: "ended",
                                    endedAt: new Date(),
                                    endReason: "manual_fix"
                                }
                            }
                        );
                        console.log(`\n✅ Fixed! Modified: ${result.modifiedCount}`);
                    } else {
                        console.log(`\n⚠️  Would fix this stream (dry run)`);
                    }

                    // Also reset user status
                    const streamerId = stream.streamerId || stream.host || stream.userId;
                    if (streamerId && !DRY_RUN) {
                        await db.collection("users").updateOne(
                            { _id: streamerId },
                            {
                                $set: {
                                    isLive: false,
                                    currentStreamId: null
                                }
                            }
                        );
                        console.log(`✅ Reset user status`);
                    }
                } else {
                    console.log(`\n✅ Stream is already ended`);
                }

                return 1;
            }
        } catch (e) {
            // Collection doesn't exist or error
        }
    }

    if (!found) {
        console.log(`❌ Stream not found with ID: ${streamId}`);
    }

    return 0;
}

async function fixStreamsByUsername(db, username) {
    console.log(`\n🎯 FIXING STREAMS BY USERNAME: ${username}\n`);

    const usersCollection = db.collection("users");
    const user = await usersCollection.findOne({
        username: { $regex: new RegExp(`^${username}$`, "i") }
    });

    if (!user) {
        console.log(`❌ User "${username}" not found`);
        return 0;
    }

    console.log(`Found user: @${user.username} (${user._id})`);
    console.log(`  isLive: ${user.isLive}`);
    console.log(`  currentStreamId: ${user.currentStreamId || "(none)"}`);

    const collections = ["streams", "livestreams"];
    let totalFixed = 0;

    for (const collName of collections) {
        try {
            const collection = db.collection(collName);

            const userStreams = await collection.find({
                $or: [
                    { streamerId: user._id },
                    { host: user._id },
                    { userId: user._id },
                    { username: user.username }
                ],
                isLive: true
            }).toArray();

            if (userStreams.length > 0) {
                console.log(`\nFound ${userStreams.length} live streams in ${collName}:`);

                for (const stream of userStreams) {
                    console.log(`  - "${stream.title || "Untitled"}" (${stream._id})`);
                }

                if (!DRY_RUN) {
                    const result = await collection.updateMany(
                        {
                            $or: [
                                { streamerId: user._id },
                                { host: user._id },
                                { userId: user._id },
                                { username: user.username }
                            ],
                            isLive: true
                        },
                        {
                            $set: {
                                isLive: false,
                                status: "ended",
                                endedAt: new Date(),
                                endReason: "manual_fix"
                            }
                        }
                    );
                    totalFixed += result.modifiedCount;
                    console.log(`✅ Fixed ${result.modifiedCount} streams`);
                } else {
                    totalFixed += userStreams.length;
                    console.log(`⚠️  Would fix ${userStreams.length} streams (dry run)`);
                }
            }
        } catch (e) {
            // Collection doesn't exist
        }
    }

    // Reset user status
    if (user.isLive && !DRY_RUN) {
        await usersCollection.updateOne(
            { _id: user._id },
            {
                $set: {
                    isLive: false,
                    currentStreamId: null
                }
            }
        );
        console.log(`\n✅ Reset user live status`);
    }

    return totalFixed;
}

async function fixAllGhostStreams(db) {
    console.log(`\n🧹 FIXING ALL GHOST STREAMS\n`);

    const collections = ["streams", "livestreams"];
    let totalFixed = 0;
    const fixedUsers = new Set();

    for (const collName of collections) {
        try {
            const collection = db.collection(collName);

            // Find all live streams
            const liveStreams = await collection.find({ isLive: true }).toArray();

            if (liveStreams.length > 0) {
                console.log(`Found ${liveStreams.length} live streams in ${collName}:`);

                for (const stream of liveStreams) {
                    const streamerId = stream.streamerId || stream.host || stream.userId;
                    console.log(`  🟢 "${stream.title || "Untitled"}" by ${stream.username || "Unknown"}`);

                    if (streamerId) {
                        fixedUsers.add(streamerId.toString());
                    }
                }

                if (!DRY_RUN) {
                    const result = await collection.updateMany(
                        { isLive: true },
                        {
                            $set: {
                                isLive: false,
                                status: "ended",
                                endedAt: new Date(),
                                endReason: "ghost_fix"
                            }
                        }
                    );
                    totalFixed += result.modifiedCount;
                    console.log(`\n✅ Fixed ${result.modifiedCount} streams in ${collName}`);
                } else {
                    totalFixed += liveStreams.length;
                    console.log(`\n⚠️  Would fix ${liveStreams.length} streams in ${collName} (dry run)`);
                }
            } else {
                console.log(`No live streams in ${collName}`);
            }
        } catch (e) {
            if (!e.message.includes("ns not found")) {
                console.log(`Error with ${collName}: ${e.message}`);
            }
        }
    }

    // Reset all affected user statuses
    if (fixedUsers.size > 0 && !DRY_RUN) {
        const usersCollection = db.collection("users");

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
            } catch (e) { }
        }
        console.log(`\n✅ Reset ${fixedUsers.size} user statuses`);
    }

    // Also fix any users still marked as live
    if (!DRY_RUN) {
        const usersCollection = db.collection("users");
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
            console.log(`✅ Fixed ${stuckUsers.modifiedCount} additional stuck user statuses`);
        }
    }

    // Verify
    let remaining = 0;
    for (const collName of collections) {
        try {
            remaining += await db.collection(collName).countDocuments({ isLive: true });
        } catch (e) { }
    }

    console.log(`\n📊 Streams still live: ${remaining}`);

    if (remaining === 0) {
        console.log("🎉 All ghost streams fixed!");
    }

    return totalFixed;
}

async function main() {
    const args = process.argv.slice(2).filter(a => !a.startsWith("--"));
    const target = args[0];

    console.log("╔════════════════════════════════════════╗");
    console.log("║  🔧 FIX GHOST STREAMS                  ║");
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
            // Fix all
            fixed = await fixAllGhostStreams(db);
        }

        console.log(`\n📊 Total fixed: ${fixed} stream(s)`);

        if (DRY_RUN && fixed > 0) {
            console.log(`\n⚠️  Run without --dry-run to apply changes`);
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