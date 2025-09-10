import { io } from "socket.io-client";

console.log("Connecting to socket server at:", import.meta.env.VITE_API_URL);

const socket = io(import.meta.env.VITE_API_URL, {
  transports: ["websocket"],
});

export default socket;
