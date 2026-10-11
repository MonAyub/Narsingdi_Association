const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Member name is required'],
        trim: true
    },
    department: {
        type: String,
        required: [true, 'Department is required'],
        trim: true
    },
    session: {
        type: String,
        required: [true, 'Session is required'],
        trim: true
    },
    upazila: {
        type: String,
        required: [true, 'Upazila is required'],
        trim: true
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true
    },
    whatsapp: {
        type: String,
        trim: true,
        default: ''
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'approved'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for fast search and filtering
memberSchema.index({ name: 'text', department: 'text', upazila: 'text', session: 'text' });

module.exports = mongoose.model('Member', memberSchema);
