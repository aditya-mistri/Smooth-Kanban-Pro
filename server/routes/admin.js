// routes/admin.js
import express from "express";
import {
  Column,
  Card,
  Board,
  BoardMember,
  User,
  Invite,
  CardAssignment,
  CardComment,
} from "../models/index.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { SOCKET_EVENTS, NOTIFICATION_TYPES } from "../socket/events.js";

export default function (socketManager, socketEventHelper) {
  const router = express.Router();

  // ✅ Get admin dashboard stats
  router.get("/stats", authenticate, authorize("admin"), async (req, res) => {
    try {
      const [
        totalBoards,
        totalMembers,
        pendingInvites,
        totalCards,
        activeMembers,
      ] = await Promise.all([
        Board.count(),
        User.count(),
        Invite.count({ where: { status: "pending" } }),
        Card.count(),
        BoardMember.count({ where: { status: "accepted" } }),
      ]);

      // Online users from socketManager
      const connectedUsers = socketManager.getConnectedUsers();

      res.json({
        totalBoards,
        totalMembers,
        pendingInvites,
        totalCards,
        activeMembers,
        onlineUsers: connectedUsers.length,
        lastUpdated: new Date(),
      });
    } catch (err) {
      console.error("Error fetching admin stats:", err);

      // Notify the admin who requested
      socketEventHelper.emitNotification(req.user.id, {
        type: NOTIFICATION_TYPES.ERROR,
        title: "Admin Stats Error",
        message: "Failed to load dashboard stats. Please try again later.",
      });

      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}
