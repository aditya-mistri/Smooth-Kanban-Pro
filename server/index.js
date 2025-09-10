import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import sequelize from "./config/database.js";
import boardRoutes from "./routes/boards.js";
import columnRoutes from "./routes/columns.js";
import cardRoutes from "./routes/cards.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app); // <-- HTTP server
const io = new Server(server, {
  cors: {
    origin: "*", // allow frontend
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Static React build
app.use(express.static(path.join(__dirname, "public")));

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy" });
});

// API Routes
app.use("/api/boards", boardRoutes(io));   // pass io
app.use("/api/columns", columnRoutes(io));
app.use("/api/cards", cardRoutes(io));

// React fallback
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Socket.IO events
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join_board", (boardId) => {
    socket.join(boardId);
    console.log(`User ${socket.id} joined board ${boardId}`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Start DB + server
sequelize.sync().then(() => {
  console.log("Database synced");
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
