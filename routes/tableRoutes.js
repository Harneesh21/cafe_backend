const express = require('express');
const router = express.Router();
const Table = require('../models/Table');
const { protect, authorize } = require('../middleware/auth');

// @desc    Get all tables
// @route   GET /api/tables
// @access  Private (Admin)
router.get('/', protect, authorize('admin'), async (req, res) => {
    try {
        const tables = await Table.find({}).sort({ tableNumber: 1 });
        res.json(tables);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Create a new table
// @route   POST /api/tables
// @access  Private (Admin)
router.post('/', protect, authorize('admin'), async (req, res) => {
    const { tableNumber } = req.body;

    if (!tableNumber || !String(tableNumber).trim()) {
        return res.status(400).json({ message: 'Table number is required' });
    }

    try {
        const exists = await Table.findOne({ tableNumber: String(tableNumber).trim() });
        if (exists) {
            return res.status(400).json({ message: 'Table number already exists' });
        }

        const table = await Table.create({ tableNumber: String(tableNumber).trim() });
        res.status(201).json(table);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// @desc    Delete a table
// @route   DELETE /api/tables/:id
// @access  Private (Admin)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const table = await Table.findByIdAndDelete(req.params.id);
        if (table) {
            res.json({ message: 'Table removed' });
        } else {
            res.status(404).json({ message: 'Table not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Verify a table number is valid (used after QR scan)
// @route   GET /api/tables/:tableNumber/verify
// @access  Public
router.get('/:tableNumber/verify', async (req, res) => {
    try {
        const table = await Table.findOne({
            tableNumber: req.params.tableNumber,
            isActive: true
        });

        if (table) {
            res.json({ valid: true, tableNumber: table.tableNumber });
        } else {
            res.status(404).json({ valid: false, message: 'Invalid or inactive table' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
