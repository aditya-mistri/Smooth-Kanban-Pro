// socket/socketManager.js
import jwt from "jsonwebtoken";

class SocketManager {
  constructor(io) {
    this.io = io;
    this.connectedUsers = new Map(); // userId -> socketId mapping
    this.userSockets = new Map(); // socketId -> user info mapping
    this.setupMiddleware();
    this.setupEventHandlers();
  }

  setupMiddleware() {
    // Socket authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id;
        socket.userEmail = decoded.email;
        socket.userRole = decoded.role;
        
        console.log(`User ${decoded.email} (${decoded.id}) attempting to connect`);
        next();
      } catch (err) {
        console.error('Socket authentication error:', err.message);
        next(new Error('Authentication error: Invalid token'));
      }
    });
  }

  setupEventHandlers() {
    this.io.on("connection", (socket) => {
      console.log(`User connected: ${socket.userEmail} (${socket.id})`);
      
      // Store user connection
      this.connectedUsers.set(socket.userId, socket.id);
      this.userSockets.set(socket.id, {
        userId: socket.userId,
        email: socket.userEmail,
        role: socket.userRole
      });

      // Join user to their personal room for notifications
      socket.join(socket.userId);

      // Handle board room joining
      socket.on("join_board", (boardId) => {
        socket.join(boardId.toString());
        console.log(`User ${socket.userEmail} joined board ${boardId}`);
        
        // Notify others in the board
        socket.to(boardId.toString()).emit("user_joined_board", {
          userId: socket.userId,
          email: socket.userEmail,
          boardId
        });
      });

      // Handle leaving board room
      socket.on("leave_board", (boardId) => {
        socket.leave(boardId.toString());
        console.log(`User ${socket.userEmail} left board ${boardId}`);
        
        // Notify others in the board
        socket.to(boardId.toString()).emit("user_left_board", {
          userId: socket.userId,
          email: socket.userEmail,
          boardId
        });
      });

      // Handle typing indicators for card comments
      socket.on("typing_start", ({ cardId, boardId }) => {
        socket.to(boardId.toString()).emit("user_typing", {
          cardId,
          userId: socket.userId,
          email: socket.userEmail,
          isTyping: true
        });
      });

      socket.on("typing_stop", ({ cardId, boardId }) => {
        socket.to(boardId.toString()).emit("user_typing", {
          cardId,
          userId: socket.userId,
          email: socket.userEmail,
          isTyping: false
        });
      });

      // Handle cursor position for real-time collaboration
      socket.on("cursor_move", ({ boardId, position }) => {
        socket.to(boardId.toString()).emit("user_cursor", {
          userId: socket.userId,
          email: socket.userEmail,
          position
        });
      });

      // Handle disconnect
      socket.on("disconnect", (reason) => {
        console.log(`User disconnected: ${socket.userEmail} (${socket.id}) - Reason: ${reason}`);
        
        // Clean up user connections
        this.connectedUsers.delete(socket.userId);
        this.userSockets.delete(socket.id);

        // Notify all rooms this user was in about disconnection
        const rooms = Array.from(socket.rooms);
        rooms.forEach(room => {
          if (room !== socket.id) { // Don't emit to the socket's own room
            socket.to(room).emit("user_disconnected", {
              userId: socket.userId,
              email: socket.userEmail
            });
          }
        });
      });

      // Handle reconnection
      socket.on("reconnect", () => {
        console.log(`User reconnected: ${socket.userEmail}`);
        this.connectedUsers.set(socket.userId, socket.id);
      });
    });
  }

  // Utility methods for emitting events
  emitToBoard(boardId, event, data) {
    this.io.to(boardId.toString()).emit(event, data);
  }

  emitToUser(userId, event, data) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }

  emitToUserById(userId, event, data) {
    this.io.to(userId).emit(event, data);
  }

  emitNotificationToBoard(boardId, notification) {
    this.emitToBoard(boardId, "notification", {
      id: Date.now(),
      timestamp: new Date(),
      ...notification
    });
  }

  emitNotificationToUser(userId, notification) {
    this.emitToUser(userId, "notification", {
      id: Date.now(),
      timestamp: new Date(),
      ...notification
    });
  }

  // Get online users for a specific board
  async getBoardOnlineUsers(boardId) {
    try {
      const sockets = await this.io.in(boardId.toString()).fetchSockets();
      return sockets.map(socket => ({
        userId: socket.userId,
        email: socket.userEmail,
        role: socket.userRole,
        socketId: socket.id
      }));
    } catch (error) {
      console.error('Error fetching board online users:', error);
      return [];
    }
  }

  // Get all connected users
  getConnectedUsers() {
    return Array.from(this.userSockets.values());
  }

  // Check if user is online
  isUserOnline(userId) {
    return this.connectedUsers.has(userId);
  }
}

export default SocketManager;