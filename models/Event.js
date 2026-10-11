const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Event title is required'],
        trim: true
    },
    type: {
        type: String,
        enum: ['Upcoming', 'Completed', 'upcoming', 'past'],
        default: 'Upcoming'
    },
    date: {
        type: String,
        required: [true, 'Event date is required']
    },
    location: {
        type: String,
        required: [true, 'Event location is required'],
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Event description is required'],
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Event', eventSchema);
