const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { protect, authorize } = require('../middleware/auth');

// @desc    Get sales analytics
// @route   GET /api/analytics/sales
// @access  Private (Admin)
router.get('/sales', protect, authorize('admin'), async (req, res) => {
    try {
        const stats = await Order.aggregate([
            { $match: { status: 'Completed' } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    totalSales: { $sum: "$totalAmount" },
                    orderCount: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } },
            { $limit: 30 } // Last 30 days
        ]);

        const overallStats = await Order.aggregate([
            { $match: { status: 'Completed' } },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$totalAmount" },
                    totalOrders: { $sum: 1 }
                }
            }
        ]);

        res.json({
            dailyStats: stats,
            overall: overallStats[0] || { totalRevenue: 0, totalOrders: 0 }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
