// server.js - Main server file for Socket.io chat application

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');
const messageRoutes = require('./routes/messageRoutes');
const Message = require('./models/Message');



// Load environment variables
dotenv.config();

// Initialize Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Use environment variable for client URL or default to 5173
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// ✅ Import API routes
const authRoutes = require('./api/auth');
app.use('/api', authRoutes);

app.use('/api/messages', messageRoutes);


// --- In-memory chat data ---
const users = {}; // Maps socket.id to { username, id }
const messages = []; // Global message store (temporary)
const typingUsers = {};
const AVAILABLE_ROOMS = ['General', 'Development', 'Random'];

// --- Socket.io Events ---
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error("Authentication error: Token missing"));
  }

  try {
    const decoded = require("jsonwebtoken").verify(token, process.env.JWT_SECRET);
    socket.user = decoded; // Attach user info to socket
    next();
  } catch (err) {
    console.error("Socket auth failed:", err.message);
    next(new Error("Authentication error: Invalid token"));
  }
});

  socket.on('user_join', (username) => {
    users[socket.id] = { username, id: socket.id };
    io.emit('user_list', Object.values(users));
    io.emit('user_joined', { username, id: socket.id });
    console.log(`${username} joined the chat`);

    socket.emit('available_rooms', AVAILABLE_ROOMS);
    socket.emit('join_room', 'General');
  });

  socket.on('join_room', (roomName) => {
    socket.rooms.forEach(room => {
      if (room !== socket.id && AVAILABLE_ROOMS.includes(room)) {
        socket.leave(room);
        const username = users[socket.id]?.username || 'A user';
        socket.to(room).emit('user_left_room', {
          username,
          roomName: room,
          message: `${username} has left ${room}.`
        });
      }
    });

    if (AVAILABLE_ROOMS.includes(roomName)) {
      socket.join(roomName);
      socket.emit('room_joined', {
        roomName,
        message: `Welcome to the ${roomName} channel!`
      });
      const username = users[socket.id]?.username || 'A user';
      socket.to(roomName).emit('user_joined_room', {
        username,
        roomName,
        message: `${username} has joined ${roomName}.`
      });
      console.log(`${username} joined room: ${roomName}`);
    }
  });

  socket.on('send_message', async (messageData, callback) => {
    const { room, message } = messageData;
    if (!socket.rooms.has(room)) {
      if (callback) callback({ status: 'error', message: 'Not authorized for this room' });
      return;
    }

    try {
      const newMessage = new Message({
        senderId: socket.id,
        sender: users[socket.id]?.username || 'Anonymous',
        content: message,
        room,
      });

      await newMessage.save();

      io.to(room).emit('receive_message', newMessage);
      if (callback) callback({ status: 'ok', id: newMessage._id });
    } catch (err) {
      console.error('Error saving message:', err);
      if (callback) callback({ status: 'error', message: err.message });
    }
  });


socket.on('add_reaction', async ({ messageId, reaction }) => {
  try {
    const senderUsername = users[socket.id]?.username || 'Anonymous';
    const msg = await Message.findById(messageId);
    if (!msg) return;

    if (!msg.reactions.has(reaction)) {
      msg.reactions.set(reaction, { count: 0, users: [] });
    }

    const reactionData = msg.reactions.get(reaction);
    const userIndex = reactionData.users.indexOf(senderUsername);

    if (userIndex > -1) {
      reactionData.users.splice(userIndex, 1);
      reactionData.count--;
    } else {
      reactionData.users.push(senderUsername);
      reactionData.count++;
    }

    if (reactionData.count === 0) msg.reactions.delete(reaction);
    await msg.save();

    io.to(msg.room).emit('message_updated', msg);
  } catch (err) {
    console.error('Error updating reaction:', err);
  }
});


  socket.on('private_message', ({ to, message }) => {
    const messageData = {
      id: Date.now() + Math.random(),
      sender: users[socket.id]?.username || 'Anonymous',
      senderId: socket.id,
      message,
      timestamp: new Date().toISOString(),
      isPrivate: true,
    };
    socket.to(to).emit('private_message', messageData);
    socket.emit('private_message', messageData);
  });

  socket.on('typing', (isTyping) => {
    if (users[socket.id]) {
      const username = users[socket.id].username;
      if (isTyping) typingUsers[socket.id] = username;
      else delete typingUsers[socket.id];
      socket.broadcast.emit('typing_users', Object.values(typingUsers));
    }
  });

  socket.on('disconnect', () => {
    if (users[socket.id]) {
      const { username } = users[socket.id];
      io.emit('user_left', { username, id: socket.id });
      console.log(`${username} left the chat`);
    }
    delete users[socket.id];
    delete typingUsers[socket.id];
    io.emit('user_list', Object.values(users));
    io.emit('typing_users', Object.values(typingUsers));
  });
});

// --- REST API Endpoints (for debugging) ---
app.get('/api/messages', (req, res) => res.json(messages));
app.get('/api/users', (req, res) => res.json(Object.values(users)));

app.get('/', (req, res) => {
  res.send('✅ Socket.io Chat Server with MongoDB Auth is running');
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`Client URL expected at: ${CLIENT_URL}`);
});

module.exports = { app, server, io };
