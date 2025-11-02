const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    fromUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    fromUsername: String,
    toUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    type: {
        type: String,
        enum: ['support', 'withdrawal'],
        default: 'support'
    },
    status: {
        type: String,
        enum: ['completed', 'pending', 'failed'],
        default: 'completed'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Transaction', transactionSchema);