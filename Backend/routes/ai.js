const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// Mock AI endpoints
router.post('/gemini', auth, async (req, res) => {
  // Here you would call Gemini API with req.body.interview
  res.json({ message: 'Gemini AI response (mock)', input: req.body.interview });
});

router.post('/merf', auth, async (req, res) => {
  // Here you would call Merf API with req.body.interview
  res.json({ message: 'Merf AI voice response (mock)', input: req.body.interview });
});

module.exports = router; 