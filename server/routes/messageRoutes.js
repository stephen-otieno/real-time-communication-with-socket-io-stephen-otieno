// routes/messageRoutes.js
const express = require('express');
const Message = require('../models/Message');
const router = express.Router();

// Fetch messages for a given room
router.get('/:room', async (req, res) => {
  try {
    const messages = await Message.find({ room: req.params.room }).sort({ timestamp: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
