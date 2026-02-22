import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL; // backend root
const socket = io(SOCKET_URL, {
  transports: ["websocket", "polling"]
});

export default socket;