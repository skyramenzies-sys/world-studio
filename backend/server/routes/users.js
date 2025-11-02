const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// Get all users
router.get('/', auth, async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get user profile
router.get('/:id', auth, async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Support creator (send money)
router.post('/:id/support', auth, async (req, res) => {
    try {
        const { amount } = req.body;
        const creatorId = req.params.id;

        const creator = await User.findById(creatorId);
        if (!creator) {
            return res.status(404).json({ error: 'Creator not found' });
        }

        // Create transaction
        const transaction = new Transaction({
            fromUserId: req.userId,
            fromUsername: req.user.username,
            toUserId: creatorId,
            amount,
            type: 'support'
        });

        await transaction.save();

        // Update creator earnings
        creator.earnings += amount;
        await creator.save();

        res.json({
            message: 'Support sent successfully',
            transaction
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get user transactions
router.get('/:id/transactions', auth, async (req, res) => {
    try {
        const transactions = await Transaction.find({ toUserId: req.params.id })
            .sort({ createdAt: -1 });

        res.json(transactions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;