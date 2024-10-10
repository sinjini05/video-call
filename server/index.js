const { Server } = require("socket.io");
const rateLimit = require("express-rate-limit");
const express = require("express");
const helmet = require("helmet");
const { body, validationResult } = require('express-validator');
const sanitizeHtml = require('sanitize-html');

const app = express();
const io = new Server(8000, {
  cors: {
    origin: "*", // Update to your specific domain in production
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

  socket.on("room:join", [
    body('email').isEmail(),
    body('room').isString(),
  ], (data) => {
    const errors = validationResult(data);
    if (!errors.isEmpty()) {
      return socket.emit("error", { message: "Invalid data" });
    }

    const email = sanitizeHtml(data.email);
    const room = sanitizeHtml(data.room);

    emailToSocketIdMap.set(email, socket.id);
    socketIdToEmailMap.set(socket.id, email);
    socket.join(room);
    
    io.to(room).emit("user:joined", { email, id: socket.id });
    io.to(socket.id).emit("room:join", data);
  });

  socket.on("user:call", ({ to, offer }) => {
    if (!socketIdToEmailMap.has(to)) {
      return socket.emit("error", { message: "User not found" });
    }
    io.to(to).emit("incoming:call", { from: socket.id, offer });
  });

  socket.on("call:accepted", ({ to, ans }) => {
    io.to(to).emit("call:accepted", { from: socket.id, ans });
  });

  socket.on("peer:nego:needed", ({ to, offer }) => {
    console.log("peer:nego:needed", offer);
    io.to(to).emit("peer:nego:needed", { from: socket.id, offer });
  });

  socket.on("peer:nego:done", ({ to, ans }) => {
    console.log("peer:nego:done", ans);
    io.to(to).emit("peer:nego:final", { from: socket.id, ans });
  });
});
