const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// Reward tiers configuration
// Points earned: $1 spent = 10 points
const POINTS_PER_DOLLAR = 10;

const REWARDS = [
    { id: 'free_cookie', name: 'Free Cookie', description: 'Enjoy a freshly baked cookie on us', pointsCost: 100, discount: 0, isFreeItem: true },
    { id: 'discount_10', name: '10% Off', description: '10% discount on your next order', pointsCost: 200, discount: 10, isFreeItem: false },
    { id: 'free_coffee', name: 'Free Coffee', description: 'A complimentary coffee of your choice', pointsCost: 350, discount: 0, isFreeItem: true },
    { id: 'discount_20', name: '20% Off', description: '20% discount on your next order', pointsCost: 500, discount: 20, isFreeItem: false },
    { id: 'free_meal', name: 'Free Meal Combo', description: 'Any meal combo completely free', pointsCost: 1000, discount: 0, isFreeItem: true },
];

// Tier thresholds
const TIERS = [
    { name: 'Bronze', minPoints: 0, icon: '☕' },
    { name: 'Silver', minPoints: 500, icon: '⭐' },
    { name: 'Gold', minPoints: 1500, icon: '👑' },
    { name: 'Platinum', minPoints: 3000, icon: '💎' },
];

// @desc    Get customer loyalty info (points, tier, available rewards)
// @route   GET /api/loyalty
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('loyaltyPoints');
        const points = user.loyaltyPoints || 0;

        // Determine tier
        let currentTier = TIERS[0];
        let nextTier = TIERS[1];
        for (let i = TIERS.length - 1; i >= 0; i--) {
            if (points >= TIERS[i].minPoints) {
                currentTier = TIERS[i];
                nextTier = TIERS[i + 1] || null;
                break;
            }
        }

        // Mark which rewards are redeemable
        const rewards = REWARDS.map(r => ({
            ...r,
            canRedeem: points >= r.pointsCost,
        }));

        res.json({
            points,
            currentTier,
            nextTier,
            pointsToNextTier: nextTier ? nextTier.minPoints - points : 0,
            rewards,
            pointsPerDollar: POINTS_PER_DOLLAR,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Redeem a reward
// @route   POST /api/loyalty/redeem
// @access  Private
router.post('/redeem', protect, async (req, res) => {
    const { rewardId } = req.body;

    try {
        const reward = REWARDS.find(r => r.id === rewardId);
        if (!reward) {
            return res.status(400).json({ message: 'Invalid reward' });
        }

        const user = await User.findById(req.user._id);
        if ((user.loyaltyPoints || 0) < reward.pointsCost) {
            return res.status(400).json({ message: 'Not enough points' });
        }

        user.loyaltyPoints -= reward.pointsCost;
        await user.save();

        res.json({
            message: `Redeemed: ${reward.name}`,
            reward,
            remainingPoints: user.loyaltyPoints,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
module.exports.POINTS_PER_DOLLAR = POINTS_PER_DOLLAR;
