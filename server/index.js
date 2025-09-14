import dns from "dns";
dns.setDefaultResultOrder("ipv4first");

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import sequelize from "./config/database.js";

// Import Socket Manager
import SocketManager from "./socket/socketManager.js";
import { SocketEventHelper } from "./socket/events.js";

// Import models to ensure associations are set up
import { Board, Column, Card, User } from "./models/index.js";

// Import routes
import boardRoutes from "./routes/boards.js";
import columnRoutes from "./routes/columns.js";
import cardRoutes from "./routes/cards.js";
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import inviteRoutes from "./routes/invites.js";


dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);

// Socket.IO setup with enhanced configuration
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Initialize Socket Manager
const socketManager = new SocketManager(io);
const socketEventHelper = new SocketEventHelper(socketManager);

// Make socket manager and helper available globally
app.set("socketManager", socketManager);
app.set("socketEventHelper", socketEventHelper);

const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Serve React static files
app.use(express.static(path.join(__dirname, "public")));

app.use((req, res, next) => {
  console.log(
    `📡 [${new Date().toISOString()}] ${req.method} ${req.originalUrl}`,
    req.body && Object.keys(req.body).length ? `\n   Body: ${JSON.stringify(req.body)}` : ""
  );
  next();
});


// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    socketConnections: socketManager.getConnectedUsers().length,
  });
});

// Socket status endpoint
app.get("/api/socket/status", (req, res) => {
  const connectedUsers = socketManager.getConnectedUsers();
  res.json({
    connectedUsers: connectedUsers.length,
    users: connectedUsers.map((user) => ({
      userId: user.userId,
      email: user.email,
      role: user.role,
    })),
  });
});

// API Routes (pass socketManager and socketEventHelper to routes)
app.use("/api/auth", authRoutes(socketManager, socketEventHelper));
app.use("/api/boards", boardRoutes(socketManager, socketEventHelper));
app.use("/api/columns", columnRoutes(socketManager, socketEventHelper));
app.use("/api/cards", cardRoutes(socketManager, socketEventHelper));
app.use("/api/admin", adminRoutes(socketManager, socketEventHelper));
app.use("/api/invites", inviteRoutes(socketManager, socketEventHelper));

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Error:", error);

  // Send error notification to user if they're connected
  if (req.user && req.user.id) {
    socketEventHelper.emitNotification(req.user.id, {
      type: "error",
      title: "Server Error",
      message: "An unexpected error occurred. Please try again.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }

  res.status(error.status || 500).json({
    error: error.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
  });
});

// 404 handler for API routes
app.use("/api/*", (req, res) => {
  res.status(404).json({ error: "API endpoint not found" });
});

// Fallback to React for SPA routing
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Graceful shutdown handling
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully...");

  // Emit system notification about server shutdown
  socketEventHelper.emitSystemNotification({
    type: "warning",
    title: "Server Maintenance",
    message: "Server is restarting. You may experience a brief disconnection.",
  });

  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully...");

  socketEventHelper.emitSystemNotification({
    type: "info",
    title: "Server Shutdown",
    message: "Server is shutting down. Please save your work.",
  });

  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

// Unhandled promise rejection handling
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Promise Rejection:", err);

  // Emit system notification about critical error
  socketEventHelper.emitSystemNotification({
    type: "error",
    title: "System Error",
    message: "A critical error occurred. Please refresh the page.",
  });
});

// Start database + server
sequelize
  .sync({
    force: false, // Set to true only for development reset
    alter: process.env.NODE_ENV === "development", // Only alter in development
  })
  .then(() => {
    console.log("✅ Database synced successfully");

    server.listen(PORT, () => {
      console.log(` Server running on port ${PORT}`);
      console.log(` Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(
        ` Client URL: ${process.env.CLIENT_URL || "http://localhost:5173"}`
      );
      console.log(` Socket.IO initialized`);

      // Emit system notification about server start (for reconnecting clients)
      setTimeout(() => {
        socketEventHelper.emitSystemNotification({
          type: "success",
          title: "Server Online",
          message: "Server is now running and ready to handle requests.",
        });
      }, 1000);
    });
  })
  .catch((error) => {
    console.error("❌ Unable to sync database:", error);
    process.exit(1);
  });
