const mongoose = require('mongoose');

const TableSchema = new mongoose.Schema({
    tableNumber: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Table', TableSchema);
