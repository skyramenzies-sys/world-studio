// backend/scripts/cleanupFollowers.js
// World-Studio.live - Followers Cleanup Script
// Run: node scripts/cleanupFollowers.js [mode]
//
// Modes:
//   validate  - Check and remove invalid references (default, safe)
//   reset     - Reset ALL followers/following to empty (destructive!)
//   sync      - Sync follower counts with actual array lengths
//   orphans   - Remove orphaned follow references only
//   duplicates - Remove duplicate follows only
//   --dry-run - Preview changes without applying

require("dotenv").config();
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const DRY_RUN = process.argv.includes("--dry-run");

async function validateFollowers(db) {
    console.log("\n🔍 VALIDATING FOLLOWERS...\n");

    const usersCollection = db.collection("users");
    let fixedCount = 0;
    let orphanedCount = 0;
    let duplicatesRemoved = 0;

    const users = await usersCollection.find({}).toArray();
    console.log(`Checking ${users.length} users...\n`);

    for (const user of users) {
        const validFollowers = [];
        const validFollowing = [];
        const seenFollowers = new Set();
        const seenFollowing = new Set();
        let changed = false;

        // Validate and dedupe followers
        if (user.followers?.length > 0) {
            for (const followerId of user.followers) {
                const idStr = followerId.toString();

                // Skip duplicates
                if (seenFollowers.has(idStr)) {
                    duplicatesRemoved++;
                    changed = true;
                    continue;
                }
                seenFollowers.add(idStr);

                // Check if user exists
                const exists = await usersCollection.findOne({ _id: followerId });
                if (exists) {
                    validFollowers.push(followerId);
                } else {
                    orphanedCount++;
                    changed = true;
                }
            }
        }

        // Validate and dedupe following
        if (user.following?.length > 0) {
            for (const followingId of user.following) {
                const idStr = followingId.toString();

                if (seenFollowing.has(idStr)) {
                    duplicatesRemoved++;
                    changed = true;
                    continue;
                }
                seenFollowing.add(idStr);

                const exists = await usersCollection.findOne({ _id: followingId });
                if (exists) {
                    validFollowing.push(followingId);
                } else {
                    orphanedCount++;
                    changed = true;
                }
            }
        }

        // Update if changed
        if (changed) {
            fixedCount++;
            console.log(`  📝 ${user.username}: ${user.followers?.length || 0} → ${validFollowers.length} followers, ${user.following?.length || 0} → ${validFollowing.length} following`);

            if (!DRY_RUN) {
                await usersCollection.updateOne(
                    { _id: user._id },
                    {
                        $set: {
                            followers: validFollowers,
                            following: validFollowing,
                            followersCount: validFollowers.length,
                            followingCount: validFollowing.length
                        }
                    }
                );
            }
        }
    }

    console.log(`\n✅ Validation complete:`);
    console.log(`   Users fixed: ${fixedCount}`);
    console.log(`   Orphaned refs removed: ${orphanedCount}`);
    console.log(`   Duplicates removed: ${duplicatesRemoved}`);

    return fixedCount;
}

async function resetAllFollowers(db) {
    console.log("\n⚠️  RESETTING ALL FOLLOWERS...\n");
    console.log("This will remove ALL follow relationships!\n");

    if (DRY_RUN) {
        const count = await db.collection("users").countDocuments({
            $or: [
                { followers: { $exists: true, $ne: [] } },
                { following: { $exists: true, $ne: [] } }
            ]
        });
        console.log(`Would reset followers for ${count} users`);
        return count;
    }

    // Ask for confirmation
    const readline = require("readline");
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question("Type 'RESET' to confirm: ", async (answer) => {
            rl.close();

            if (answer !== "RESET") {
                console.log("❌ Cancelled");
                resolve(0);
                return;
            }

            const result = await db.collection("users").updateMany(
                {},
                {
                    $set: {
                        followers: [],
                        following: [],
                        followersCount: 0,
                        followingCount: 0
                    }
                }
            );

            console.log(`✅ Reset ${result.modifiedCount} users`);
            resolve(result.modifiedCount);
        });
    });
}

async function syncFollowerCounts(db) {
    console.log("\n🔄 SYNCING FOLLOWER COUNTS...\n");

    const usersCollection = db.collection("users");
    let syncedCount = 0;

    const users = await usersCollection.find({}).toArray();

    for (const user of users) {
        const actualFollowers = user.followers?.length || 0;
        const actualFollowing = user.following?.length || 0;
        const storedFollowers = user.followersCount || 0;
        const storedFollowing = user.followingCount || 0;

        if (actualFollowers !== storedFollowers || actualFollowing !== storedFollowing) {
            syncedCount++;
            console.log(`  📝 ${user.username}: followers ${storedFollowers} → ${actualFollowers}, following ${storedFollowing} → ${actualFollowing}`);

            if (!DRY_RUN) {
                await usersCollection.updateOne(
                    { _id: user._id },
                    {
                        $set: {
                            followersCount: actualFollowers,
                            followingCount: actualFollowing
                        }
                    }
                );
            }
        }
    }

    console.log(`\n✅ Synced ${syncedCount} users`);
    return syncedCount;
}

async function removeOrphans(db) {
    console.log("\n🗑️  REMOVING ORPHANED REFERENCES...\n");

    const usersCollection = db.collection("users");
    let orphanedCount = 0;

    // Get all valid user IDs
    const allUsers = await usersCollection.find({}).project({ _id: 1 }).toArray();
    const validIds = new Set(allUsers.map(u => u._id.toString()));

    console.log(`Found ${validIds.size} valid users\n`);

    const usersWithFollows = await usersCollection.find({
        $or: [
            { followers: { $exists: true, $ne: [] } },
            { following: { $exists: true, $ne: [] } }
        ]
    }).toArray();

    for (const user of usersWithFollows) {
        const validFollowers = (user.followers || []).filter(id => validIds.has(id.toString()));
        const validFollowing = (user.following || []).filter(id => validIds.has(id.toString()));

        const removedFollowers = (user.followers?.length || 0) - validFollowers.length;
        const removedFollowing = (user.following?.length || 0) - validFollowing.length;

        if (removedFollowers > 0 || removedFollowing > 0) {
            orphanedCount += removedFollowers + removedFollowing;
            console.log(`  📝 ${user.username}: removed ${removedFollowers} invalid followers, ${removedFollowing} invalid following`);

            if (!DRY_RUN) {
                await usersCollection.updateOne(
                    { _id: user._id },
                    {
                        $set: {
                            followers: validFollowers,
                            following: validFollowing,
                            followersCount: validFollowers.length,
                            followingCount: validFollowing.length
                        }
                    }
                );
            }
        }
    }

    console.log(`\n✅ Removed ${orphanedCount} orphaned references`);
    return orphanedCount;
}

async function removeDuplicates(db) {
    console.log("\n🔄 REMOVING DUPLICATE FOLLOWS...\n");

    const usersCollection = db.collection("users");
    let duplicatesRemoved = 0;

    const users = await usersCollection.find({
        $or: [
            { followers: { $exists: true, $ne: [] } },
            { following: { $exists: true, $ne: [] } }
        ]
    }).toArray();

    for (const user of users) {
        const seenFollowers = new Set();
        const seenFollowing = new Set();
        const uniqueFollowers = [];
        const uniqueFollowing = [];
        let hadDuplicates = false;

        for (const followerId of (user.followers || [])) {
            const idStr = followerId.toString();
            if (!seenFollowers.has(idStr)) {
                seenFollowers.add(idStr);
                uniqueFollowers.push(followerId);
            } else {
                duplicatesRemoved++;
                hadDuplicates = true;
            }
        }

        for (const followingId of (user.following || [])) {
            const idStr = followingId.toString();
            if (!seenFollowing.has(idStr)) {
                seenFollowing.add(idStr);
                uniqueFollowing.push(followingId);
            } else {
                duplicatesRemoved++;
                hadDuplicates = true;
            }
        }

        if (hadDuplicates) {
            console.log(`  📝 ${user.username}: removed duplicates`);

            if (!DRY_RUN) {
                await usersCollection.updateOne(
                    { _id: user._id },
                    {
                        $set: {
                            followers: uniqueFollowers,
                            following: uniqueFollowing,
                            followersCount: uniqueFollowers.length,
                            followingCount: uniqueFollowing.length
                        }
                    }
                );
            }
        }
    }

    console.log(`\n✅ Removed ${duplicatesRemoved} duplicates`);
    return duplicatesRemoved;
}

async function showStats(db) {
    console.log("\n📊 FOLLOWER STATISTICS\n");

    const usersCollection = db.collection("users");

    const stats = await usersCollection.aggregate([
        {
            $project: {
                username: 1,
                followersCount: { $size: { $ifNull: ["$followers", []] } },
                followingCount: { $size: { $ifNull: ["$following", []] } }
            }
        },
        {
            $group: {
                _id: null,
                totalUsers: { $sum: 1 },
                totalFollowers: { $sum: "$followersCount" },
                totalFollowing: { $sum: "$followingCount" },
                maxFollowers: { $max: "$followersCount" },
                maxFollowing: { $max: "$followingCount" },
                avgFollowers: { $avg: "$followersCount" },
                avgFollowing: { $avg: "$followingCount" }
            }
        }
    ]).toArray();

    if (stats.length > 0) {
        const s = stats[0];
        console.log(`   Total users: ${s.totalUsers}`);
        console.log(`   Total follow relationships: ${s.totalFollowers}`);
        console.log(`   Max followers: ${s.maxFollowers}`);
        console.log(`   Max following: ${s.maxFollowing}`);
        console.log(`   Avg followers: ${s.avgFollowers?.toFixed(1)}`);
        console.log(`   Avg following: ${s.avgFollowing?.toFixed(1)}`);
    }

    // Top 5 by followers
    const topUsers = await usersCollection.find({})
        .project({ username: 1, followers: 1 })
        .toArray();

    const sorted = topUsers
        .map(u => ({ username: u.username, count: u.followers?.length || 0 }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    if (sorted.length > 0 && sorted[0].count > 0) {
        console.log("\n   Top 5 by followers:");
        sorted.forEach((u, i) => {
            console.log(`   ${i + 1}. @${u.username}: ${u.count}`);
        });
    }
}

async function main() {
    const args = process.argv.slice(2).filter(a => !a.startsWith("--"));
    const mode = args[0] || "validate";

    console.log("╔════════════════════════════════════════╗");
    console.log("║  👥 FOLLOWERS CLEANUP UTILITY          ║");
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

        // Show stats first
        await showStats(db);

        let result = 0;

        switch (mode.toLowerCase()) {
            case "validate":
                result = await validateFollowers(db);
                break;
            case "reset":
                result = await resetAllFollowers(db);
                break;
            case "sync":
                result = await syncFollowerCounts(db);
                break;
            case "orphans":
                result = await removeOrphans(db);
                break;
            case "duplicates":
                result = await removeDuplicates(db);
                break;
            default:
                console.log("Unknown mode. Available: validate, reset, sync, orphans, duplicates");
                break;
        }

        if (DRY_RUN && result > 0) {
            console.log(`\n⚠️  Would affect ${result} records. Run without --dry-run to apply.`);
        }

    } catch (err) {
        console.error("❌ Error:", err.message);
    } finally {
        await mongoose.disconnect();
        console.log("\n👋 Done!");
        process.exit(0);
    }
}

main();