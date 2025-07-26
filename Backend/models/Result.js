const mongoose = require('mongoose');

// Define the AIGeneratedInterviewResult Schema
const aiGeneratedInterviewResultSchema = new mongoose.Schema({
  // User who initiated the AI generation
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Assumes you have a 'User' model defined elsewhere
    required: [true, 'User ID is required for AI generated results.']
  },
  score: {
    type: Number,
    min: [0, 'Score cannot be less than 0.'],
    max: [100, 'Score cannot be more than 100.'],
    default: null // AI might provide a score, or it can be added during review
  },
  feedback: {
    type: String,
    trim: true,
    maxlength: [2000, 'Feedback cannot exceed 2000 characters.'] // Increased length for AI feedback
  },
  recommendation: {
    type: String,
    enum: ['Hire', 'Do Not Hire', 'Further Interview', 'Strong Hire', 'Weak Hire', 'N/A'],
    default: 'N/A' // AI might provide a recommendation, or it can be added during review
  },
}, {
  timestamps: true // Adds createdAt and updatedAt timestamps automatically
});

// Create a Mongoose model from the schema
const AIGeneratedInterviewResult = mongoose.model('AIGeneratedInterviewResult', aiGeneratedInterviewResultSchema);

module.exports = AIGeneratedInterviewResult;
