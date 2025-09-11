import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

class SocketService {
  constructor() {
    this.socket = null;
  }

  connect() {
    if (!this.socket) {
      this.socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling']
      });

      this.socket.on("connect", () => {
        console.log("Connected to server:", this.socket.id);
      });

      this.socket.on("disconnect", (reason) => {
        console.log("Disconnected from server:", reason);
      });

      this.socket.on("connect_error", (error) => {
        console.error("Connection error:", error);
      });
    }
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinBoard(boardId) {
    if (this.socket && boardId) {
      this.socket.emit("join_board", boardId);
    }
  }

  leaveBoard(boardId) {
    if (this.socket && boardId) {
      this.socket.emit("leave_board", boardId);
    }
  }

  // --- Main Event Listener ---
  // We only need this one for board state updates now.
  onBoardUpdated(callback) {
    if (this.socket) {
      this.socket.on("board_updated", callback);
    }
  }

  // You might keep these if you have a global dashboard view, for example.
  onBoardCreated(callback) {
    if (this.socket) {
      this.socket.on("board_created", callback);
    }
  }

  onBoardDeleted(callback) {
    if (this.socket) {
      this.socket.on("board_deleted", callback);
    }
  }

  // This is still needed to clean up listeners when the component unmounts.
  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }
}

const socketService = new SocketService();

export default socketService;