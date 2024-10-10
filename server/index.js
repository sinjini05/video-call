const { Server } = require("socket.io");
const rateLimit = require("express-rate-limit");
const express = require("express");
const helmet = require("helmet");
const { body, validationResult } = require('express-validator');
const sanitizeHtml = require('sanitize-html');

const app = express();
const io = new Server(8000, {
  cors: {
    origin: "yourdomain.com", // Replace with your specific domain in production
    methods: ["GET", "POST"]
  },
});

// Rate limit middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

app.use(helmet());
app.use(limiter);

const emailToSocketIdMap = new Map();
const socketIdToEmailMap = new Map();

io.on("connection", (socket) => {
  console.log(`Socket Connected: ${socket.id}`);

  socket.on("room:join", (data) => {
    const email = sanitizeHtml(data.email);
    const room = sanitizeHtml(data.room);

    // Validate data
    const errors = validationResult({ email, room });
    if (!errors.isEmpty()) {
      return socket.emit("error", { message: "Invalid data" });
    }

    emailToSocketIdMap.set(email, socket.id);
    socketIdToEmailMap.set(socket.id, email);
    socket.join(room);
    
    io.to(room).emit("user:joined", { email, id: socket.id });
    io.to(socket.id).emit("room:join", data);
  });

  socket.on("disconnect", () => {
    const email = socketIdToEmailMap.get(socket.id);
    if (email) {
      emailToSocketIdMap.delete(email);
      socketIdToEmailMap.delete(socket.id);
    }
    console.log(`Socket Disconnected: ${socket.id}`);
  });

  // Other socket event handlers remain the same...
});
