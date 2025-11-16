const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    username: String,
    avatar: String,
    text: String,
    createdAt: { type: Date, default: Date.now },
});

const postSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        username: String,
        avatar: String,
        title: { type: String, default: "Untitled" },
        description: { type: String, default: "" },
        type: { type: String, enum: ["image", "video", "audio"], default: "image" },
        category: { type: String, default: "general" },
        fileUrl: { type: String, required: true },
        fileName: String,
        fileSize: { type: Number, default: 0 },
        filePublicId: String,
        thumbnail: String,
        likes: { type: Number, default: 0 },
        likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        views: { type: Number, default: 0 },
        comments: [commentSchema],
        isFree: { type: Boolean, default: true },
        price: { type: Number, default: 0 },
        isPremium: { type: Boolean, default: false },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Post", postSchema);
