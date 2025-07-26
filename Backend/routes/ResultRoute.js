const express = require('express');
const router = express.Router();
const AIGeneratedInterviewResult = require('../models/Result'); // Adjust path as needed
const User = require('../models/User'); // Adjust path as needed

// Middleware to protect routes (optional, but recommended for real apps)
// In a real application, you would have authentication middleware here
// For example:
// const authMiddleware = require('../middleware/auth');
// router.post('/ai-results', authMiddleware, async (req, res) => { ... });

router.post('/', async (req, res) => {
  try {
    // Extract data from the request body
    // The Python backend sends a comprehensive payload with all interview details
    const {
      userId,
      score,
      feedback,
      recommendation,
      aiGeneratedContent,
      aiModelUsed,
      sourceDataReference,
      status,
      originalInterviewDate,
      originalCandidateIdentifier
    } = req.body;

    // --- Step 1: Validate userId ---
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required to store AI generated results.' });
    }

    // --- Step 2: Create a new AI Generated Interview Result document ---
    const newAIResult = new AIGeneratedInterviewResult({
      userId, 
      score,
      feedback,
      recommendation,
      // Store additional data in a metadata field or extend the schema
      // For now, we'll store the core fields and log the additional data
    });

    // Save the new AI result to the database
    const savedAIResult = await newAIResult.save();

    // Log the additional data for debugging
    console.log('Additional interview data received:', {
      aiGeneratedContent: aiGeneratedContent ? 'Present (length: ' + aiGeneratedContent.length + ')' : 'Not provided',
      aiModelUsed,
      sourceDataReference,
      status,
      originalInterviewDate,
      originalCandidateIdentifier
    });

    // --- Step 3: Find the user and update their aiGeneratedResults array ---
    const user = await User.findById(userId);

    if (!user) {
      // If user is not found, you might want to delete the savedAIResult
      // or handle this error differently depending on your application logic.
      await AIGeneratedInterviewResult.findByIdAndDelete(savedAIResult._id); // Clean up
      return res.status(404).json({ message: 'User not found.' });
    }

    // Add the ID of the new AI result to the user's aiGeneratedResults array
    user.aiGeneratedResults.push(savedAIResult._id);

    // Save the updated user document
    await user.save();

    // --- Step 4: Send a success response ---
    res.status(201).json({
      message: 'AI Generated Interview Result stored successfully and linked to user.',
      aiResult: savedAIResult,
      additionalData: {
        aiGeneratedContent: aiGeneratedContent ? 'Present' : 'Not provided',
        aiModelUsed,
        sourceDataReference,
        status,
        originalInterviewDate,
        originalCandidateIdentifier
      }
    });

  } catch (error) {
    console.error('Error storing AI Generated Interview Result:', error);
    // Handle Mongoose validation errors or other errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
