// models/Message.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId: String,
  sender: String,
  content: String,
  room: { type: String, default: 'General' },
  reactions: {
    type: Map,
    of: {
      count: Number,
      users: [String]
    },
    default: {}
  },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Message', messageSchema);
