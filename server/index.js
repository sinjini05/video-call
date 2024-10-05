const { Server } = require("socket.io");
const io = new Server(8000, {
  cors: {
    origin: "*", // Update to your specific domain in production
    methods: ["GET", "POST"]
  },
});

// Maps to track users
const emailToSocketIdMap = new Map();
const socketIdToEmailMap = new Map();

io.on("connection", (socket) => {
  console.log(`Socket Connected: ${socket.id}`);

  socket.on("room:join", (data) => {
    const { email, room } = data;

    // Validate incoming data
    if (typeof email !== 'string' || typeof room !== 'string') {
      return socket.emit("error", { message: "Invalid data" });
    }

    emailToSocketIdMap.set(email, socket.id);
    socketIdToEmailMap.set(socket.id, email);
    socket.join(room);
    
    // Emit user joined
    io.to(room).emit("user:joined", { email, id: socket.id });
    io.to(socket.id).emit("room:join", data);
  });

  // Handle user call
  socket.on("user:call", ({ to, offer }) => {
    if (!socketIdToEmailMap.has(to)) {
      return socket.emit("error", { message: "User not found" });
    }
    io.to(to).emit("incoming:call", { from: socket.id, offer });
  });

  // Handle call acceptance
  socket.on("call:accepted", ({ to, ans }) => {
    io.to(to).emit("call:accepted", { from: socket.id, ans });
  });

  // Peer negotiation needed
  socket.on("peer:nego:needed", ({ to, offer }) => {
    console.log("peer:nego:needed", offer);
    io.to(to).emit("peer:nego:needed", { from: socket.id, offer });
  });

  // Peer negotiation done
  socket.on("peer:nego:done", ({ to, ans }) => {
    console.log("peer:nego:done", ans);
    io.to(to).emit("peer:nego:final", { from: socket.id, ans });
  });
});
