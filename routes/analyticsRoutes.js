const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

// @desc    Get comprehensive analytics
// @route   GET /api/analytics/summary
// @access  Private (Admin)
router.get('/summary', protect, authorize('admin'), async (req, res) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // 1. Daily Sales Trend (Completed orders, last 30 days)
        const dailyStats = await Order.aggregate([
            { $match: { status: 'Completed', createdAt: { $gte: thirtyDaysAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    revenue: { $sum: "$totalAmount" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // 2. Popular Items (Top 5 based on quantity)
        const popularItems = await Order.aggregate([
            { $match: { status: 'Completed' } },
            { $unwind: "$items" },
            {
                $group: {
                    _id: "$items.menuItem",
                    totalSold: { $sum: "$items.quantity" }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: 'menuitems',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'details'
                }
            },
            { $unwind: "$details" },
            {
                $project: {
                    name: "$details.name",
                    totalSold: 1,
                    price: "$details.price"
                }
            }
        ]);

        // 3. Busiest Hours (Order frequency by hour)
        const busiestHours = await Order.aggregate([
            { $match: { status: 'Completed' } },
            {
                $group: {
                    _id: { $hour: "$createdAt" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // 4. Category Distribution
        const categoryStats = await Order.aggregate([
            { $match: { status: 'Completed' } },
            { $unwind: "$items" },
            {
                $lookup: {
                    from: 'menuitems',
                    localField: 'items.menuItem',
                    foreignField: '_id',
                    as: 'itemDetails'
                }
            },
            { $unwind: "$itemDetails" },
            {
                $group: {
                    _id: "$itemDetails.category",
                    revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
                }
            },
            {
                $lookup: {
                    from: 'categories',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'cat'
                }
            },
            { $unwind: "$cat" },
            { $project: { _id: "$cat.name", revenue: 1 } }
        ]);

        // 5. Overall Metrics & Customer Stats
        const totalRevenue = await Order.aggregate([
            { $match: { status: 'Completed' } },
            { $group: { _id: null, total: { $sum: "$totalAmount" } } }
        ]);

        const totalOrders = await Order.countDocuments({ status: 'Completed' });
        const totalCustomers = await User.countDocuments({ role: 'customer' });
        const newCustomers = await User.countDocuments({ 
            role: 'customer', 
            createdAt: { $gte: thirtyDaysAgo } 
        });

        res.json({
            dailyStats,
            popularItems,
            busiestHours,
            categoryStats,
            metrics: {
                totalRevenue: totalRevenue[0]?.total || 0,
                totalOrders,
                totalCustomers,
                newCustomers
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
