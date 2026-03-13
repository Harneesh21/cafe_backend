const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const { protect } = require('../middleware/auth');

// @desc    Get personalized recommendations for logged-in customer
// @route   GET /api/recommendations
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        // Fetch this customer's completed/non-cancelled orders
        const userOrders = await Order.find({
            customer: req.user._id,
            status: { $ne: 'Cancelled' }
        }).populate({
            path: 'items.menuItem',
            populate: { path: 'category', select: 'name' }
        });

        let recommendations = [];

        if (userOrders.length > 0) {
            // ── Frequency analysis ──
            const itemFrequency = {};   // menuItemId -> { count, item }
            const categoryFrequency = {}; // categoryId -> count

            for (const order of userOrders) {
                for (const entry of order.items) {
                    if (!entry.menuItem) continue; // item may have been deleted

                    const itemId = entry.menuItem._id.toString();
                    const catId = entry.menuItem.category?._id?.toString();

                    // Count item frequency
                    if (!itemFrequency[itemId]) {
                        itemFrequency[itemId] = { count: 0, item: entry.menuItem };
                    }
                    itemFrequency[itemId].count += entry.quantity;

                    // Count category frequency
                    if (catId) {
                        categoryFrequency[catId] = (categoryFrequency[catId] || 0) + entry.quantity;
                    }
                }
            }

            // ── Top re-purchase suggestions (top 5 most-ordered items) ──
            const topItems = Object.values(itemFrequency)
                .sort((a, b) => b.count - a.count)
                .slice(0, 5)
                .map(entry => entry.item)
                .filter(item => item.isAvailable);

            // ── Category-based discovery suggestions ──
            const orderedItemIds = new Set(Object.keys(itemFrequency));
            const topCategoryIds = Object.entries(categoryFrequency)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(entry => entry[0]);

            let categoryItems = [];
            if (topCategoryIds.length > 0) {
                categoryItems = await MenuItem.find({
                    category: { $in: topCategoryIds },
                    isAvailable: true,
                    _id: { $nin: Array.from(orderedItemIds) }
                })
                    .populate('category', 'name')
                    .limit(5);
            }

            // ── Merge & deduplicate ──
            const seen = new Set();
            for (const item of [...topItems, ...categoryItems]) {
                const id = item._id.toString();
                if (!seen.has(id)) {
                    seen.add(id);
                    recommendations.push(item);
                }
                if (recommendations.length >= 8) break;
            }
        }

        // ── Fallback for new users: globally popular items ──
        if (recommendations.length === 0) {
            const popularAgg = await Order.aggregate([
                { $match: { status: { $ne: 'Cancelled' } } },
                { $unwind: '$items' },
                { $group: { _id: '$items.menuItem', totalQty: { $sum: '$items.quantity' } } },
                { $sort: { totalQty: -1 } },
                { $limit: 8 }
            ]);

            const popularIds = popularAgg.map(p => p._id);
            if (popularIds.length > 0) {
                recommendations = await MenuItem.find({
                    _id: { $in: popularIds },
                    isAvailable: true
                }).populate('category', 'name');
            }

            // If still empty (no orders at all in the system), return random available items
            if (recommendations.length === 0) {
                recommendations = await MenuItem.find({ isAvailable: true })
                    .populate('category', 'name')
                    .limit(8);
            }
        }

        res.json(recommendations);
    } catch (error) {
        console.error('Recommendation error:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
