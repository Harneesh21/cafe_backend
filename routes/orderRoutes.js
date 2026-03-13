const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const { POINTS_PER_DOLLAR } = require('./loyaltyRoutes');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
router.post('/', protect, async (req, res) => {
    const { items, totalAmount, tax, tableNumber, notes, rewardDiscount } = req.body;

    if (items && items.length === 0) {
        res.status(400);
        throw new Error('No order items');
    } else {
        const order = new Order({
            customer: req.user._id,
            items,
            totalAmount,
            tax,
            tableNumber,
            notes
        });

        const createdOrder = await order.save();

        // Award loyalty points (based on pre-discount total)
        const baseAmount = rewardDiscount ? totalAmount / (1 - rewardDiscount / 100) : totalAmount;
        const pointsEarned = Math.floor(baseAmount * POINTS_PER_DOLLAR);
        await User.findByIdAndUpdate(req.user._id, { $inc: { loyaltyPoints: pointsEarned } });

        res.status(201).json({ ...createdOrder.toObject(), pointsEarned });
    }
});

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private (Admin, Staff)
router.get('/', protect, authorize('admin', 'staff'), async (req, res) => {
    try {
        const orders = await Order.find({})
            .populate('customer', 'name email')
            .populate('items.menuItem', 'name price')
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private (Admin, Staff)
router.put('/:id/status', protect, authorize('admin', 'staff'), async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (order) {
            order.status = req.body.status || order.status;
            const updatedOrder = await order.save();
            res.json(updatedOrder);
        } else {
            res.status(404).json({ message: 'Order not found' });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private
router.get('/myorders', protect, async (req, res) => {
    try {
        const orders = await Order.find({ customer: req.user._id })
            .populate('items.menuItem', 'name price image')
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
