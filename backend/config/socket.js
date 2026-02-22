const socketHandler = (io) => {
  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("join-session", (sessionId) => {
      socket.join(sessionId);
    });

    socket.on("location-update", (data) => {
      socket.to(data.sessionId).emit("location-receive", data);
    });

    socket.on("emergency-on", (sessionId) => {
      socket.to(sessionId).emit("emergency-alert", true);
    });
  });
};

module.exports = socketHandler;
