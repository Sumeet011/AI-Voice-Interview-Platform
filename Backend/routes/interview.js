const express = require('express');
const router = express.Router();
const Interview = require('../models/Interview');
const auth = require('../middleware/auth');

// Create interview
router.post('/', auth, async (req, res) => {
  try {
    const { interviewTitle, interviewType, jobRole, difficulty, keySkills, interviewDuration, description, publishSetting } = req.body;
    if (!interviewTitle || !interviewType || !difficulty || !interviewDuration || !publishSetting) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    const interview = new Interview({
      user: req.user._id,
      details: {
        interviewTitle,
        interviewType,
        jobRole,
        difficulty,
        keySkills,
        interviewDuration,
        description,
      },
      publishSetting,
    });
    await interview.save();
    res.status(201).json(interview);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Public: Get all public interviews
router.get('/public', async (req, res) => {
  try {
    const interviews = await Interview.find({ publishSetting: 'Public' }).populate('user', 'name email');
    res.json(interviews);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Authenticated: Get all public interviews + user's own interviews
router.get('/', auth, async (req, res) => {
  try {
    const publicInterviews = await Interview.find({ publishSetting: 'Public' });
    const userInterviews = await Interview.find({ user: req.user._id });
    // Merge, avoiding duplicates
    const allInterviews = [...userInterviews];
    publicInterviews.forEach(pub => {
      if (!userInterviews.some(u => u._id.equals(pub._id))) {
        allInterviews.push(pub);
      }
    });
    res.json(allInterviews);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single interview
router.get('/:id', auth, async (req, res) => {
  try {
    const interview = await Interview.findOne({ _id: req.params.id, user: req.user._id });
    if (!interview) return res.status(404).json({ message: 'Interview not found' });
    res.json(interview);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update interview
router.put('/:id', auth, async (req, res) => {
  try {
    const interview = await Interview.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { details: req.body.details },
      { new: true }
    );
    if (!interview) return res.status(404).json({ message: 'Interview not found' });
    res.json(interview);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete interview
router.delete('/:id', auth, async (req, res) => {
  try {
    const interview = await Interview.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!interview) return res.status(404).json({ message: 'Interview not found' });
    res.json({ message: 'Interview deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 