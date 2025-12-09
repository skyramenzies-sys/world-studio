/* ============================================================
   FUTURISTIC GIFTS + LOOTBOXES + MULTIPLIERS + SKYRA MEGA GIFTS
   ============================================================ */
const GIFTS = [
    /* ===========================
       COMMON
    =========================== */
    {
        id: 1,
        name: "Neon Spark",
        icon: "✨",
        price: 5,
        tier: "common",
        description: "Tiny flash of energy",
    },
    {
        id: 2,
        name: "Pixel Heart",
        icon: "💟",
        price: 10,
        tier: "common",
        description: "Retro digital love",
    },
    {
        id: 3,
        name: "Hologram Rose",
        icon: "🌹",
        price: 15,
        tier: "common",
        description: "Glowing virtual rose",
    },
    {
        id: 4,
        name: "Glow Stick",
        icon: "🧪",
        price: 20,
        tier: "common",
        description: "Party lab vibes",
    },
    {
        id: 5,
        name: "Energy Coffee",
        icon: "☕",
        price: 25,
        tier: "common",
        description: "Wake up the streamer",
    },
    {
        id: 6,
        name: "Chill Pizza Slice",
        icon: "🍕",
        price: 30,
        tier: "common",
        description: "Late night stream snack",
    },
    {
        id: 7,
        name: "Headphone Vibes",
        icon: "🎧",
        price: 35,
        tier: "common",
        description: "Boost the music mood",
    },
    {
        id: 8,
        name: "Selfie Flash",
        icon: "📸",
        price: 40,
        tier: "common",
        description: "Flash moment for the clip",
    },

    /* ===========================
       RARE
    =========================== */
    {
        id: 10,
        name: "Crystal Chip",
        icon: "💠",
        price: 100,
        tier: "rare",
        description: "Energy-coded crystal",
    },
    {
        id: 11,
        name: "Laser Wave",
        icon: "📡",
        price: 150,
        tier: "rare",
        description: "Send a shockwave",
    },
    {
        id: 12,
        name: "Neon Wings",
        icon: "🪽",
        price: 180,
        tier: "rare",
        description: "Glow wings behind the avatar",
    },
    {
        id: 13,
        name: "Lucky Chip",
        icon: "🧿",
        price: 220,
        tier: "rare",
        description: "Little luck charm in stream",
    },
    {
        id: 14,
        name: "Digital Drink",
        icon: "🥤",
        price: 260,
        tier: "rare",
        description: "Refresh the host energy",
    },

    /* ===========================
       EPIC
    =========================== */
    {
        id: 20,
        name: "Cyber Panther",
        icon: "🐆",
        price: 300,
        tier: "epic",
        description: "Silent neon guardian",
    },
    {
        id: 21,
        name: "Teleport Gate",
        icon: "🌀",
        price: 750,
        tier: "epic",
        description: "Warp into the stream",
    },
    {
        id: 22,
        name: "Lightning Stage",
        icon: "⚡",
        price: 1000,
        tier: "epic",
        description: "Turn the stream into a show",
    },
    {
        id: 23,
        name: "Epic Throne",
        icon: "🪑",
        price: 1500,
        tier: "epic",
        description: "Seat the host like a king",
    },
    {
        id: 24,
        name: "Hologram Crowd",
        icon: "👥",
        price: 1800,
        tier: "epic",
        description: "Virtual crowd goes wild",
    },

    /* ===========================
       LEGENDARY
    =========================== */
    {
        id: 30,
        name: "Aurora Horizon",
        icon: "🌈",
        price: 2500,
        tier: "legendary",
        description: "Sky lights explosion",
    },
    {
        id: 31,
        name: "Digital Palace",
        icon: "🏰",
        price: 4000,
        tier: "legendary",
        description: "Royal digital fortress",
    },
    {
        id: 32,
        name: "Golden Shower",
        icon: "💰",
        price: 5000,
        tier: "legendary",
        description: "Gold rain over the screen",
    },
    {
        id: 33,
        name: "Legendary Crown Drop",
        icon: "👑",
        price: 6500,
        tier: "legendary",
        description: "Crown the streamer live",
    },
    {
        id: 34,
        name: "VIP Entrance",
        icon: "🎟️",
        price: 8000,
        tier: "legendary",
        description: "VIP moment shout-out",
    },

    /* ===========================
       MYTHIC
    =========================== */
    {
        id: 40,
        name: "Phoenix Reboot",
        icon: "🐦‍🔥",
        price: 6000,
        tier: "mythic",
        description: "Revives the energy",
    },
    {
        id: 41,
        name: "Dragon Core",
        icon: "🐉",
        price: 8000,
        tier: "mythic",
        description: "Unleash dragon power",
    },
    {
        id: 42,
        name: "Mythic Portal",
        icon: "🌀",
        price: 10000,
        tier: "mythic",
        description: "Open a portal moment",
    },
    {
        id: 43,
        name: "Spirit Wolf",
        icon: "🐺",
        price: 12000,
        tier: "mythic",
        description: "Guardian spirit howls",
    },
    {
        id: 44,
        name: "Time Warp",
        icon: "⏱️",
        price: 14000,
        tier: "mythic",
        description: "Freeze the moment in time",
    },

    /* ===========================
       CYBER
    =========================== */
    {
        id: 50,
        name: "AI Core",
        icon: "🤖",
        price: 3000,
        tier: "cyber",
        description: "Summon an AI companion",
    },
    {
        id: 51,
        name: "Neon Chip Rain",
        icon: "💾",
        price: 6500,
        tier: "cyber",
        description: "Matrix chip rain",
    },
    {
        id: 52,
        name: "Glitch Storm",
        icon: "🧬",
        price: 7500,
        tier: "cyber",
        description: "Glitch effects all over",
    },
    {
        id: 53,
        name: "Firewall Shield",
        icon: "🛡️",
        price: 9000,
        tier: "cyber",
        description: "Protect the stream energy",
    },
    {
        id: 54,
        name: "Binary Rain",
        icon: "💻",
        price: 11000,
        tier: "cyber",
        description: "Code rain like the Matrix",
    },

    /* ===========================
       COSMIC
    =========================== */
    {
        id: 60,
        name: "Galaxy Orb",
        icon: "🌌",
        price: 15000,
        tier: "cosmic",
        description: "Mini galaxy spinning",
    },
    {
        id: 61,
        name: "Planet Drop",
        icon: "🪐",
        price: 30000,
        tier: "cosmic",
        description: "Drop an entire planet",
    },
    {
        id: 62,
        name: "Star Shower",
        icon: "🌠",
        price: 20000,
        tier: "cosmic",
        description: "Stars fall across the screen",
    },
    {
        id: 63,
        name: "Black Hole",
        icon: "🕳️",
        price: 35000,
        tier: "cosmic",
        description: "Swallow the whole chat",
    },
    {
        id: 64,
        name: "Cosmic Wave",
        icon: "💫",
        price: 42000,
        tier: "cosmic",
        description: "Energy wave through stream",
    },

    /* ===========================
       SKYRA ULTRA GIFTS
    =========================== */
    {
        id: 70,
        name: "SKYRA Jetpack",
        icon: "🧥",
        price: 50000,
        tier: "skyra",
        description: "Equip with SKYRA gear",
    },
    {
        id: 71,
        name: "AIRPATH Beam",
        icon: "🛰️",
        price: 65000,
        tier: "skyra",
        description: "Satellite beam effect",
    },
    {
        id: 72,
        name: "Commander Badge",
        icon: "🎖️",
        price: 80000,
        tier: "skyra",
        description: "Crown Commander status",
    },
    {
        id: 73,
        name: "SKYRA Universe",
        icon: "✨",
        price: 100000,
        tier: "skyra",
        description: "Immersive full-universe event",
    },
    {
        id: 74,
        name: "Skyra Landing Pad",
        icon: "🛬",
        price: 120000,
        tier: "skyra",
        description: "Spawn a floating landing pad",
    },
    {
        id: 75,
        name: "Commander Entrance",
        icon: "🚀",
        price: 150000,
        tier: "skyra",
        description: "Cinematic commander intro",
    },
    {
        id: 76,
        name: "Miracle Star",
        icon: "⭐",
        price: 180000,
        tier: "skyra",
        description: "Dedicate a star moment",
    },
    {
        id: 77,
        name: "SKYRA World Studio Takeover",
        icon: "🌍",
        price: 250000,
        tier: "skyra",
        description: "Full-screen takeover event",
    },

    /* ============================================================
       MULTIPLIER GIFTS (GAMBLE STYLE)
       ============================================================ */
    {
        id: 100,
        name: "x2 Multiplier",
        icon: "✖️2",
        price: 2000,
        tier: "cyber",
        description: "Double your gift power",
        multiplier: 2,
    },
    {
        id: 101,
        name: "x5 Multiplier",
        icon: "✖️5",
        price: 5000,
        tier: "epic",
        description: "Fivefold impact",
        multiplier: 5,
    },
    {
        id: 102,
        name: "x10 Multiplier",
        icon: "✖️10",
        price: 12000,
        tier: "mythic",
        description: "Ten times explosion",
        multiplier: 10,
    },
    {
        id: 103,
        name: "x25 Multiplier",
        icon: "✖️25",
        price: 30000,
        tier: "legendary",
        description: "Twenty-five power surge",
        multiplier: 25,
    },
    {
        id: 104,
        name: "x100 SKYRA Multiplier",
        icon: "💯",
        price: 80000,
        tier: "skyra",
        description: "Insane 100x gift multiplier",
        multiplier: 100,
    },

    /* ============================================================
       LOOTBOXES (GAMBLE / RANDOM GIFTS)
       ============================================================ */
    {
        id: 200,
        name: "Bronze Loot Box",
        icon: "📦",
        price: 500,
        tier: "common",
        lootbox: true,
    },
    {
        id: 201,
        name: "Silver Loot Box",
        icon: "📦",
        price: 2000,
        tier: "rare",
        lootbox: true,
    },
    {
        id: 202,
        name: "Gold Loot Box",
        icon: "📦",
        price: 5000,
        tier: "epic",
        lootbox: true,
    },
    {
        id: 203,
        name: "Diamond Loot Box",
        icon: "💎",
        price: 15000,
        tier: "legendary",
        lootbox: true,
    },
    {
        id: 204,
        name: "SKYRA Quantum Box",
        icon: "⚡",
        price: 75000,
        tier: "skyra",
        lootbox: true,
        quantum: true,
    },
];
export default GIFTS;
