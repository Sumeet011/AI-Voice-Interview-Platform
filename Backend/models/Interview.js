const mongoose = require('mongoose');

const interviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  details: {
    interviewTitle: { type: String, required: true },
    interviewType: { type: String, required: true },
    jobRole: { type: String },
    difficulty: { type: String, required: true },
    keySkills: { type: String }, // comma-separated
    interviewDuration: { type: String, required: true },
    description: { type: String },
  },
  publishSetting: { type: String, enum: ['Private', 'Public'], default: 'Private' },
}, { timestamps: true });

module.exports = mongoose.model('Interview', interviewSchema); 