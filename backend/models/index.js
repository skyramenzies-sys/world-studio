// backend/models/index.js
// World-Studio.live - Model Index
// Centralized export of all Mongoose models

const mongoose = require("mongoose");

// ===========================================
// SAFE MODEL LOADER
// ===========================================

/**
 * Safely load a model - returns null if not found
 * @param {string} modelName - Name of the model file
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
 * @param {string} modelName - Name of the model file
 * @returns {Model} - Mongoose model
 */
function requireLoad(modelName) {
    try {
        return require(`./${modelName}`);
    } catch (e) {
        console.error(`❌ Required model '${modelName}' failed to load:`, e.message);
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
const PK = safeLoad("PK");
const PKBattle = safeLoad("PKBattle");
const PKChallenge = safeLoad("PKChallenge");

// ===========================================
// MONETIZATION MODELS (Optional)
// ===========================================
const Gift = safeLoad("Gift");
const Wallet = safeLoad("Wallet");
const Transaction = safeLoad("Transaction");
const Purchase = safeLoad("Purchase");
const Subscription = safeLoad("Subscription");

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
// LOG LOADED MODELS
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
    ViewLog: !!ViewLog,
};

// Count loaded models
const loadedCount = Object.values(loadedModels).filter(Boolean).length;
const totalCount = Object.keys(loadedModels).length;

console.log(`✅ Models registered: ${loadedCount}/${totalCount}`);
console.log("📦 Loaded models:", Object.entries(loadedModels)
    .filter(([_, loaded]) => loaded)
    .map(([name]) => name)
    .join(", ")
);

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Get a model by name
 * @param {string} name - Model name
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
        .filter(([_, loaded]) => loaded)
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
    // Core Models
    User,

    // Content Models
    Post,
    Comment,
    Media,

    // Live Streaming Models
    Stream,
    LiveStream,
    StreamChat,

    // PK Battle Models
    PK,
    PKBattle,
    PKChallenge,

    // Monetization Models
    Gift,
    Wallet,
    Transaction,
    Purchase,
    Subscription,

    // Social Models
    Follow,
    Notification,
    Message,
    Conversation,

    // Content Shop Models
    Content,
    ContentPurchase,
    Review,

    // Admin Models
    Report,
    Ban,
    AdminLog,
    Setting,

    // Analytics Models
    Analytics,
    ViewLog,

    // Helper Functions
    getModel,
    hasModel,
    getLoadedModelNames,
    getModelStats,
    safeLoad,
    requireLoad,

    // Model registry
    loadedModels,
};