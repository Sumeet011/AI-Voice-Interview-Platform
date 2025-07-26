const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address.']
  },
  password: {
    type: String,
    required: true
  },
  // Array of references to AIGeneratedInterviewResult documents
  aiGeneratedResults: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AIGeneratedInterviewResult' // This refers to the model defined in the other schema
  }],
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
