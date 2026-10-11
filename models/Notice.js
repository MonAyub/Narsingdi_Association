const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Notice title is required'],
        trim: true
    },
    category: {
        type: String,
        enum: ['NOTICE', 'NEWS', 'ANNOUNCEMENT'],
        default: 'NOTICE'
    },
    date: {
        type: String,
        required: [true, 'Notice date is required'],
        default: () => new Date().toISOString().split('T')[0]
    },
    content: {
        type: String,
        required: [true, 'Notice content is required'],
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Notice', noticeSchema);
