const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
    userId: String,
    username: String,
    avatar: String,
    text: String,
    createdAt: { type: Date, default: Date.now },
});

const postSchema = new mongoose.Schema(
    {
        userId: { type: String, required: true },
        username: { type: String },
        avatar: { type: String },
        title: String,
        description: String,
        type: String, // image, video, audio
        fileUrl: String,
        thumbnail: String,
        likes: { type: Number, default: 0 },
        likedBy: [String],
        views: { type: Number, default: 0 },
        comments: [commentSchema],
    },
    { timestamps: true }
);

module.exports = mongoose.model("Post", postSchema);
