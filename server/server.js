// server.js - Main server file for Socket.io chat application

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
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

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// Import API routes
const authRoutes = require('./api/auth');
app.use('/api', authRoutes);
app.use('/api/messages', messageRoutes);

// In-memory structures
const socketUsers = new Map(); // userId -> socket.id
const users = {}; // socket.id -> { username, userId }
const typingUsers = {};
const AVAILABLE_ROOMS = ['General', 'Development', 'Random'];

// --- SOCKET AUTHENTICATION MIDDLEWARE ---
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication error: Token missing'));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = {
      id: decoded.id,
      email: decoded.email,
      username: decoded.username,
    };// decoded should include _id or id
    next();
  } catch (err) {
    console.error('Socket auth failed:', err.message);
    next(new Error('Authentication error: Invalid token'));
  }
});

// --- SOCKET CONNECTION HANDLER ---
io.on('connection', (socket) => {
  console.log(`🟢 User connected: ${socket.id}`);

  const userId = socket.user?._id || socket.user?.id;
  if (userId) {
    socketUsers.set(userId, socket.id);
    io.emit('online_users', Array.from(socketUsers.keys())); // broadcast current online users
  }

  socket.on('user_join', (username) => {
    if (!userId) return;
    users[socket.id] = { username, userId };
    io.emit('user_list', Object.values(users));
    io.emit('user_joined', { username, userId });
    console.log(`${username} joined the chat`);
    socket.emit('available_rooms', AVAILABLE_ROOMS);
    socket.emit('join_room', 'General');
  });

  socket.on('join_room', (roomName) => {
    socket.rooms.forEach((room) => {
      if (room !== socket.id && AVAILABLE_ROOMS.includes(room)) {
        socket.leave(room);
        const username = users[socket.id]?.username || 'A user';
        socket.to(room).emit('user_left_room', {
          username,
          roomName: room,
          message: `${username} has left ${room}.`,
        });
      }
    });

    if (AVAILABLE_ROOMS.includes(roomName)) {
      socket.join(roomName);
      const username = users[socket.id]?.username || 'A user';
      socket.emit('room_joined', {
        roomName,
        message: `Welcome to the ${roomName} channel!`,
      });
      socket.to(roomName).emit('user_joined_room', {
        username,
        roomName,
        message: `${username} has joined ${roomName}.`,
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
        senderId: socket.user.id,
        senderName: socket.user.username, // ✅ use username
        content: messageData.message,
        room: messageData.room,
      });

      await newMessage.save();
      socket.to(room).emit('receive_message', newMessage);
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
    const targetSocket = socketUsers.get(to);
    const msg = {
      id: Date.now() + Math.random(),
      sender: users[socket.id]?.username || 'Anonymous',
      senderId: userId,
      message,
      timestamp: new Date().toISOString(),
      isPrivate: true,
    };
    if (targetSocket) io.to(targetSocket).emit('private_message', msg);
    socket.emit('private_message', msg);
  });

  socket.on('typing', (isTyping) => {
    const username = users[socket.id]?.username;
    if (!username) return;
    if (isTyping) typingUsers[socket.id] = username;
    else delete typingUsers[socket.id];
    socket.broadcast.emit('typing_users', Object.values(typingUsers));
  });

  socket.on('disconnect', () => {
    const username = users[socket.id]?.username;
    if (username) {
      io.emit('user_left', { username, userId });
      console.log(`${username} left the chat`);
    }
    delete users[socket.id];
    delete typingUsers[socket.id];
    if (userId) socketUsers.delete(userId);
    io.emit('user_list', Object.values(users));
    io.emit('typing_users', Object.values(typingUsers));
    io.emit('online_users', Array.from(socketUsers.keys()));
  });
});

// REST Endpoints
app.get('/api/messages', (req, res) => res.json([]));
app.get('/api/users', (req, res) => res.json(Object.values(users)));

app.get('/', (req, res) => res.send('✅ Socket.io Chat Server with MongoDB Auth is running'));

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`Client URL expected at: ${CLIENT_URL}`);
});

module.exports = { app, server, io };
