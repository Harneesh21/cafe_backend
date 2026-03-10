const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const MenuItem = require('../models/MenuItem');
const { protect, authorize } = require('../middleware/auth');

// --- Category Routes ---

// @desc    Get all categories
// @route   GET /api/menu/categories
// @access  Public
router.get('/categories', async (req, res) => {
    try {
        const categories = await Category.find({});
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Create a category
// @route   POST /api/menu/categories
// @access  Private (Admin)
router.post('/categories', protect, authorize('admin'), async (req, res) => {
    try {
        const category = new Category(req.body);
        const createdCategory = await category.save();
        res.status(201).json(createdCategory);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// --- MenuItem Routes ---

// @desc    Get all menu items
// @route   GET /api/menu/items
// @access  Public
router.get('/items', async (req, res) => {
    try {
        const items = await MenuItem.find({}).populate('category', 'name');
        res.json(items);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Create a menu item
// @route   POST /api/menu/items
// @access  Private (Admin)
router.post('/items', protect, authorize('admin'), async (req, res) => {
    try {
        const menuItem = new MenuItem(req.body);
        const createdMenuItem = await menuItem.save();
        res.status(201).json(createdMenuItem);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// @desc    Update a menu item
// @route   PUT /api/menu/items/:id
// @access  Private (Admin)
router.put('/items/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const item = await MenuItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (item) {
            res.json(item);
        } else {
            res.status(404).json({ message: 'Item not found' });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// @desc    Delete a menu item
// @route   DELETE /api/menu/items/:id
// @access  Private (Admin)
router.delete('/items/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const item = await MenuItem.findByIdAndDelete(req.params.id);
        if (item) {
            res.json({ message: 'Item removed' });
        } else {
            res.status(404).json({ message: 'Item not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
