const {Server} = require("socket.io");

const io = new Server(8000,{
    //cross origin site policy --> frontend and 
    //backend running on diff servers so chrome blocking it for us
    cors: true,
});

//mapping from email to id
const emailToSocketIdMap = new Map();
const socketidtoEmailMap = new Map();

io.on("connection",(socket) => {
    console.log(`Socket Connected`, socket.id);
    //user req
    socket.on("room:join", (data) =>{
        //will get these info from the user's data provided
        const { email,room } = data
        emailToSocketIdMap.set(email,socket.id);
        socketidtoEmailMap.set(socket.id,email);
        //existing user will get this event
        io.to(room).emit("user:joined",{email, id: socket.id});
        //next will join the other user
        socket.join(room);
        //granting join req for user(socket.id) and sending data
        io.to(socket.id).emit("room:join", data);
        console.log(data);
    });
});