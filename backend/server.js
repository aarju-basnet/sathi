const http = require("http");
const dotenv = require("dotenv");
const { Server } = require("socket.io");

const app = require("./app");
const connectDB = require("./config/db");
const socketHandler = require("./config/socket");

dotenv.config();
connectDB();

const server = http.createServer(app);

const io = new Server(server, {
  cors: { 
    origin: process.env.CLIENT_URL,  // <--- use env variable
    methods: ["GET", "POST"],
  },
});

socketHandler(io);

server.listen(process.env.PORT || 5000, () => {
  console.log("Server running");
});
