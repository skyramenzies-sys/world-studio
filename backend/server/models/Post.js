// models/Post.js
const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: { type: String, required: true },
    avatar: { type: String, default: '🎨' },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});

const PostSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    avatar: { type: String, default: '🎨' },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    type: { type: String, enum: ['image', 'video', 'audio', 'document', 'other'], default: 'image' },
    category: { type: String, default: 'general' },
    fileUrl: { type: String, required: true },
    fileName: { type: String, default: '' },
    fileSize: { type: Number, default: 0 },
    filePublicId: { type: String, default: '' }, // Cloudinary public ID
    thumbnail: { type: String, default: '' },
    isFree: { type: Boolean, default: true },
    price: { type: Number, default: 0 },
    isPremium: { type: Boolean, default: false },
    likes: { type: Number, default: 0 },
    likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    views: { type: Number, default: 0 },
    comments: [CommentSchema],
}, {
    timestamps: true
});

module.exports = mongoose.model('Post', PostSchema);
