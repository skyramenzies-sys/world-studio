// backend/models/index.js
// World-Studio.live - Model Index (UNIVERSE EDITION 🌌)
// Centralized export of all Mongoose models

"use strict";

const mongoose = require("mongoose");

// ===========================================
// SAFE MODEL LOADER
// ===========================================

/**
 * Safely load a model - returns null if not found
 * @param {string} modelName - Name of the model file (without .js)
 * @returns {Model|null} - Mongoose model or null
 */
function safeLoad(modelName) {
    try {
        return require(`./${modelName}`);
    } catch (e) {
        if (e.code === "MODULE_NOT_FOUND") {
            console.log(`⚠️ Optional model '${modelName}' not found`);
        } else {
            console.error(`❌ Error loading model '${modelName}':`, e.message);
        }
        return null;
    }
}

/**
 * Required model loader - throws if not found
 * @param {string} modelName - Name of the model file (without .js)
 * @returns {Model} - Mongoose model
 */
function requireLoad(modelName) {
    try {
        return require(`./${modelName}`);
    } catch (e) {
        console.error(
            `❌ Required model '${modelName}' failed to load:`,
            e.message
        );
        throw new Error(`Required model '${modelName}' not found`);
    }
}

// ===========================================
// CORE MODELS (Required)
// ===========================================
const User = requireLoad("User");

// ===========================================
// CONTENT MODELS (Optional)
// ===========================================
const Post = safeLoad("Post");
const Comment = safeLoad("Comment");
const Media = safeLoad("Media");

// ===========================================
// LIVE STREAMING MODELS (Optional)
// ===========================================
const Stream = safeLoad("Stream");
const LiveStream = safeLoad("LiveStream");
const StreamChat = safeLoad("StreamChat");

// ===========================================
// PK BATTLE MODELS (Optional)
// ===========================================

// Je PK-model zit in PK.js en registreert zichzelf als "PK"
const PK = safeLoad("PK");

// Alias: PKBattle verwijst gewoon naar hetzelfde model
const PKBattle = PK;

const PKChallenge = safeLoad("PKChallenge");

// ===========================================
// MONETIZATION MODELS (Optional)
// ===========================================
const Gift = safeLoad("Gift");
const Wallet = safeLoad("Wallet");
const Transaction = safeLoad("Transaction");
const Purchase = safeLoad("Purchase");
const Subscription = safeLoad("Subscription");
const PlatformWallet = safeLoad("PlatformWallet"); // 🔥 voor platform fees / gift revenue

// ===========================================
// SOCIAL MODELS (Optional)
// ===========================================
const Follow = safeLoad("Follow");
const Notification = safeLoad("Notification");
const Message = safeLoad("Message");
const Conversation = safeLoad("Conversation");

// ===========================================
// CONTENT SHOP MODELS (Optional)
// ===========================================
const Content = safeLoad("Content");
const ContentPurchase = safeLoad("ContentPurchase");
const Review = safeLoad("Review");

// ===========================================
// ADMIN MODELS (Optional)
// ===========================================
const Report = safeLoad("Report");
const Ban = safeLoad("Ban");
const AdminLog = safeLoad("AdminLog");
const Setting = safeLoad("Setting");

// ===========================================
// ANALYTICS MODELS (Optional)
// ===========================================
const Analytics = safeLoad("Analytics");
const ViewLog = safeLoad("ViewLog");

// ===========================================
// LOADED MODELS REGISTER
// ===========================================
const loadedModels = {
    // Core
    User: !!User,

    // Content
    Post: !!Post,
    Comment: !!Comment,
    Media: !!Media,

    // Live Streaming
    Stream: !!Stream,
    LiveStream: !!LiveStream,
    StreamChat: !!StreamChat,

    // PK Battles
    PK: !!PK,
    PKBattle: !!PKBattle,
    PKChallenge: !!PKChallenge,

    // Monetization
    Gift: !!Gift,
    Wallet: !!Wallet,
    Transaction: !!Transaction,
    Purchase: !!Purchase,
    Subscription: !!Subscription,
    PlatformWallet: !!PlatformWallet,

    // Social
    Follow: !!Follow,
    Notification: !!Notification,
    Message: !!Message,
    Conversation: !!Conversation,

    // Content Shop
    Content: !!Content,
    ContentPurchase: !!ContentPurchase,
    Review: !!Review,

    // Admin
    Report: !!Report,
    Ban: !!Ban,
    AdminLog: !!AdminLog,
    Setting: !!Setting,

    // Analytics
    Analytics: !!Analytics,
    ViewLog: !!ViewLog
};


const loadedCount = Object.values(loadedModels).filter(Boolean).length;
const totalCount = Object.keys(loadedModels).length;

// Iets nettere logging: alleen uitgebreid loggen in development
if (process.env.NODE_ENV !== "test") {
    console.log(`✅ Models registered: ${loadedCount}/${totalCount}`);
    console.log(
        "📦 Loaded models:",
        Object.entries(loadedModels)
            .filter(([, loaded]) => loaded)
            .map(([name]) => name)
            .join(", ") || "(none)"
    );
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Get a model by name from mongoose registry
 * @param {string} name - Model name (e.g. "User")
 * @returns {Model|null}
 */
function getModel(name) {
    try {
        return mongoose.model(name);
    } catch (e) {
        return null;
    }
}

/**
 * Check if a model is loaded
 * @param {string} name - Model name
 * @returns {boolean}
 */
function hasModel(name) {
    return loadedModels[name] === true;
}

/**
 * Get all loaded model names
 * @returns {string[]}
 */
function getLoadedModelNames() {
    return Object.entries(loadedModels)
        .filter(([, loaded]) => loaded)
        .map(([name]) => name);
}

/**
 * Get model statistics
 * @returns {Object}
 */
function getModelStats() {
    return {
        loaded: loadedCount,
        total: totalCount,
        models: loadedModels
    };
}

// ===========================================
// EXPORTS
// ===========================================
module.exports = {
    // Core
    User,

    // Content
    Post,
    Comment,
    Media,

    // Live Streaming
    Stream,
    LiveStream,
    StreamChat,

    // PK Battles
    PK,
    PKBattle,
    PKChallenge,

    // Monetization
    Gift,
    Wallet,
    Transaction,
    Purchase,
    Subscription,
    PlatformWallet,

    // Social
    Follow,
    Notification,
    Message,
    Conversation,

    // Content Shop
    Content,
    ContentPurchase,
    Review,

    // Admin
    Report,
    Ban,
    AdminLog,
    Setting,

    // Analytics
    Analytics,
    ViewLog,

    // Helpers
    getModel,
    hasModel,
    getLoadedModelNames,
    getModelStats,
    safeLoad,
    requireLoad,

    // Registry
    loadedModels
};
