import express from "express";
import {
  Board,
  BoardMember,
  Invite,
  User,
  Column,
  Card,
  CardComment,
  CardAssignment,
} from "../models/index.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { SOCKET_EVENTS, NOTIFICATION_TYPES } from "../socket/events.js";

export default function (socketManager, socketEventHelper) {
  const router = express.Router();

  // Helper function to get full board data
  async function getFullBoardData(boardId) {
    return await Board.findByPk(boardId, {
      include: [
        {
          model: Column,
          as: "Columns",
          include: [
            {
              model: Card,
              as: "Cards",
              include: [
                { model: User, as: "Assignees" },
                {
                  model: CardComment,
                  as: "Comments",
                  include: [{ model: User, as: "User" }],
                },
              ],
            },
          ],
        },
        {
          model: BoardMember,
          as: "Members",
          include: [{ model: User, as: "User" }],
        },
      ],
      order: [
        ["Columns", "order", "ASC"],
        ["Columns", "Cards", "order", "ASC"],
      ],
    });
  }

  // ✅ Update board data
  router.put("/:id", authenticate, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description } = req.body;

      const board = await Board.findByPk(id);
      if (!board) return res.status(404).json({ error: "Board not found" });

      // Check if user is owner or admin
      const isBoardAdmin = await BoardMember.findOne({
        where: {
          boardId: id,
          userId: req.user.id,
          role: "admin",
          status: "accepted",
        },
      });

      if (board.ownerId !== req.user.id && !isBoardAdmin) {
        return res.status(403).json({
          error: "Only board owner or admin can update board details",
        });
      }

      // Update board data
      await board.update({
        name: name || board.name,
        description: description || board.description,
      });

      // Get updated board data with all associations
      const updatedBoard = await getFullBoardData(id);

      // Emit socket events
      socketEventHelper.emitBoardUpdated(id, updatedBoard);

      // Send success notification
      socketEventHelper.emitNotification(req.user.id, {
        type: NOTIFICATION_TYPES.SUCCESS,
        title: "Board Updated",
        message: `Board "${updatedBoard.name}" has been updated successfully`,
        data: { boardId: id },
      });

      res.json(updatedBoard);
    } catch (err) {
      console.error(err);

      // Send error notification
      socketEventHelper.emitNotification(req.user.id, {
        type: NOTIFICATION_TYPES.ERROR,
        title: "Update Failed",
        message: "Failed to update board. Please try again.",
      });

      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ✅ Delete a board
  router.delete("/:id", authenticate, async (req, res) => {
    try {
      const board = await Board.findByPk(req.params.id);
      if (!board) return res.status(404).json({ error: "Board not found" });

      // Check if user is owner or admin
      const isBoardAdmin = await BoardMember.findOne({
        where: {
          boardId: board.id,
          userId: req.user.id,
          role: "admin",
          status: "accepted",
        },
      });

      if (board.ownerId !== req.user.id && !isBoardAdmin) {
        return res
          .status(403)
          .json({ error: "Only board owner or admin can delete the board" });
      }

      // Delete associated data (this will cascade to columns, cards, etc.)
      await board.destroy();

      // Emit socket events
      socketEventHelper.emitBoardDeleted(board.id, board.name);

      // Send success notification to owner
      socketEventHelper.emitNotification(req.user.id, {
        type: NOTIFICATION_TYPES.SUCCESS,
        title: "Board Deleted",
        message: `Board "${board.name}" has been deleted successfully`,
      });

      // Notify board members
      const boardMembers = await BoardMember.findAll({
        where: { boardId: board.id },
      });

      boardMembers.forEach((member) => {
        if (member.userId !== req.user.id) {
          socketEventHelper.emitNotification(member.userId, {
            type: NOTIFICATION_TYPES.WARNING,
            title: "Board Deleted",
            message: `The board "${board.name}" has been deleted by ${req.user.name}`,
          });
        }
      });

      res.status(204).send();
    } catch (err) {
      console.error("Delete board error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ✅ Get board by ID (if owner or member)
  router.get("/:id", authenticate, async (req, res) => {
    try {
      const board = await getFullBoardData(req.params.id);
      if (!board) return res.status(404).json({ error: "Board not found" });

      // Check if user is owner or member
      const isOwner = board.ownerId === req.user.id;
      const isMember = await BoardMember.findOne({
        where: { boardId: board.id, userId: req.user.id, status: "accepted" },
      });

      if (!isOwner && !isMember) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Join user to board room for real-time updates
      const userSocket = socketManager.connectedUsers.get(req.user.id);
      if (userSocket) {
        socketManager.io.sockets.sockets
          .get(userSocket)
          ?.join(board.id.toString());
      }

      // Emit online users update
      await socketEventHelper.emitOnlineUsersUpdate(board.id);

      res.json(board);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ✅ Create a new board (Admin only)
  router.post("/", authenticate, authorize("admin"), async (req, res) => {
    try {
      const { name, description } = req.body;
      if (!name) return res.status(400).json({ error: "Board name required" });

      const board = await Board.create({
        name,
        description,
        ownerId: req.user.id,
      });

      // Add owner as member automatically
      await BoardMember.create({
        boardId: board.id,
        userId: req.user.id,
        role: "admin",
        status: "accepted",
        joinedAt: new Date(),
      });

      const boardWithAssociations = await getFullBoardData(board.id);

      // Emit socket events
      socketEventHelper.emitBoardCreated(boardWithAssociations, req.user.id);

      // Send success notification to creator
      socketEventHelper.emitNotification(req.user.id, {
        type: NOTIFICATION_TYPES.SUCCESS,
        title: "Board Created",
        message: `Board "${name}" has been created successfully`,
        data: { boardId: board.id },
      });

      res.status(201).json(boardWithAssociations);
    } catch (err) {
      console.error(err);

      // Send error notification
      socketEventHelper.emitNotification(req.user.id, {
        type: NOTIFICATION_TYPES.ERROR,
        title: "Board Creation Failed",
        message: "Failed to create board. Please try again.",
      });

      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ✅ Remove a member from board (Admin only)
  router.delete(
    "/:boardId/members/:userId",
    authenticate,
    authorize("admin"),
    async (req, res) => {
      try {
        const { boardId, userId } = req.params;

        const member = await BoardMember.findOne({
          where: { boardId: boardId, userId: userId },
          include: [{ model: User, as: "User" }],
        });

        if (!member) return res.status(404).json({ error: "Member not found" });

        const removedUserData = member.User;
        await member.destroy();

        // Get updated board data
        const updatedBoard = await getFullBoardData(boardId);

        // Emit socket events
        socketEventHelper.emitMemberRemoved(boardId, removedUserData, req.user);
        socketEventHelper.emitBoardUpdated(boardId, updatedBoard);

        // Force disconnect the removed user from board room
        const removedUserSocket = socketManager.connectedUsers.get(userId);
        if (removedUserSocket) {
          const socket =
            socketManager.io.sockets.sockets.get(removedUserSocket);
          if (socket) {
            socket.leave(boardId.toString());
          }
        }

        // Send notifications
        socketEventHelper.emitNotification(userId, {
          type: NOTIFICATION_TYPES.WARNING,
          title: "Removed from Board",
          message: `You have been removed from the board "${updatedBoard.name}"`,
          data: { boardId },
        });

        socketEventHelper.emitNotification(req.user.id, {
          type: NOTIFICATION_TYPES.SUCCESS,
          title: "Member Removed",
          message: `${removedUserData.name} has been removed from the board`,
          data: { boardId },
        });

        res.status(204).send();
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // ✅ Invite a user to board (Admin only)
  router.post(
    "/:id/invite",
    authenticate,
    authorize("admin"),
    async (req, res) => {
      try {
        let { inviteeEmail } = req.body;

        // Fix: Handle case where inviteeEmail might be an object
        if (typeof inviteeEmail === "object" && inviteeEmail.email) {
          inviteeEmail = inviteeEmail.email;
        }

        if (!inviteeEmail || typeof inviteeEmail !== "string") {
          return res
            .status(400)
            .json({ error: "Valid invitee email required" });
        }

        const board = await Board.findByPk(req.params.id);
        if (!board) {
          return res.status(404).json({ error: "Board not found" });
        }

        // Find user by email first
        const user = await User.findOne({ where: { email: inviteeEmail } });
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        // Check if already a member
        const existingMember = await BoardMember.findOne({
          where: { boardId: board.id, userId: user.id },
        });
        if (existingMember) {
          return res.status(400).json({ error: "User already a member" });
        }

        // Check if invite already exists
        const existingInvite = await Invite.findOne({
          where: { boardId: board.id, inviteeEmail, status: "pending" },
        });
        if (existingInvite) {
          return res.status(400).json({ error: "Invite already sent" });
        }

        const invite = await Invite.create({
          boardId: board.id,
          inviterId: req.user.id,
          inviteeEmail,
        });

        // Emit socket events
        socketEventHelper.emitInviteSent(req.user.id, invite);

        // Send notification to invitee
        socketEventHelper.emitNotification(user.id, {
          type: NOTIFICATION_TYPES.INFO,
          title: "Board Invitation",
          message: `You have been invited to join "${board.name}" by ${req.user.name}`,
          data: {
            inviteId: invite.id,
            boardId: board.id,
            boardName: board.name,
          },
        });

        res.status(201).json(invite);
      } catch (err) {
        console.error("Invite error:", err);

        socketEventHelper.emitNotification(req.user.id, {
          type: NOTIFICATION_TYPES.ERROR,
          title: "Invitation Failed",
          message: "Failed to send invitation. Please try again.",
        });

        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // ✅ Get board members
  router.get("/:boardId/members", authenticate, async (req, res) => {
    try {
      const { boardId } = req.params;

      const members = await BoardMember.findAll({
        where: { boardId: boardId },
        include: [
          { model: User, as: "User", attributes: ["id", "name", "email"] },
        ],
      });

      // Add online status to members
      const membersWithStatus = members.map((member) => ({
        ...member.toJSON(),
        isOnline: socketManager.isUserOnline(member.userId),
      }));

      res.json(membersWithStatus);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ✅ List boards for current user (owner or member)
  router.get("/", authenticate, async (req, res) => {
    try {
      // Get boards where user is owner
      const ownedBoards = await Board.findAll({
        where: { ownerId: req.user.id },
        include: [
          {
            model: Column,
            as: "Columns",
            include: [{ model: Card, as: "Cards" }],
          },
          {
            model: BoardMember,
            as: "Members",
            include: [{ model: User, as: "User" }],
          },
        ],
        order: [
          ["createdAt", "DESC"],
          ["Columns", "order", "ASC"],
          ["Columns", "Cards", "order", "ASC"],
        ],
      });

      // Get boards where user is member
      const memberBoards = await Board.findAll({
        include: [
          {
            model: BoardMember,
            as: "Members",
            where: { userId: req.user.id, status: "accepted" },
            include: [{ model: User, as: "User" }],
          },
          {
            model: Column,
            as: "Columns",
            include: [{ model: Card, as: "Cards" }],
          },
        ],
        order: [
          ["createdAt", "DESC"],
          ["Columns", "order", "ASC"],
          ["Columns", "Cards", "order", "ASC"],
        ],
      });

      // Filter out owned boards from member boards to avoid duplicates
      const filteredMemberBoards = memberBoards.filter(
        (board) => board.ownerId !== req.user.id
      );

      const allBoards = [...ownedBoards, ...filteredMemberBoards];

      // Add activity indicators and online member counts
      const boardsWithActivity = allBoards.map((board) => ({
        ...board.toJSON(),
        onlineMembersCount: board.Members.filter((member) =>
          socketManager.isUserOnline(member.userId)
        ).length,
        lastActivity: new Date(), // You can implement actual last activity tracking
      }));

      res.json(boardsWithActivity);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ✅ Accept/Decline invite
  router.post(
    "/:id/invite/:inviteId/respond",
    authenticate,
    async (req, res) => {
      try {
        const { action } = req.body; // "accept" or "decline"
        if (!["accept", "decline"].includes(action))
          return res.status(400).json({ error: "Invalid action" });

        const invite = await Invite.findByPk(req.params.inviteId, {
          include: [
            { model: User, as: "Inviter" },
            { model: Board, as: "Board" },
          ],
        });

        if (!invite || invite.boardId !== req.params.id)
          return res.status(404).json({ error: "Invite not found" });
        if (invite.inviteeEmail !== req.user.email)
          return res.status(403).json({ error: "Not authorized" });

        invite.status = action === "accept" ? "accepted" : "declined";
        await invite.save();

        if (action === "accept") {
          // Add user as board member
          const newMember = await BoardMember.create({
            boardId: invite.boardId,
            userId: req.user.id,
            role: "member",
            status: "accepted",
            joinedAt: new Date(),
          });

          // Get updated board data
          const updatedBoard = await getFullBoardData(invite.boardId);

          // Emit socket events
          socketEventHelper.emitMemberAdded(
            invite.boardId,
            {
              ...newMember.toJSON(),
              User: req.user,
            },
            invite.Inviter
          );

          socketEventHelper.emitBoardUpdated(invite.boardId, updatedBoard);
          socketEventHelper.emitInviteAccepted(
            invite.boardId,
            invite.Inviter,
            req.user
          );

          // Join user to board room
          const userSocket = socketManager.connectedUsers.get(req.user.id);
          if (userSocket) {
            socketManager.io.sockets.sockets
              .get(userSocket)
              ?.join(invite.boardId.toString());
          }

          // Update online users
          await socketEventHelper.emitOnlineUsersUpdate(invite.boardId);
        } else {
          // Emit decline notification
          socketEventHelper.emitInviteDeclined(
            invite.Inviter,
            req.user,
            invite.boardId
          );
        }

        res.json({ success: true, status: invite.status });
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // ✅ Get online users for a board
  router.get("/:boardId/online-users", authenticate, async (req, res) => {
    try {
      const { boardId } = req.params;

      // Verify user has access to board
      const board = await Board.findByPk(boardId);
      if (!board) return res.status(404).json({ error: "Board not found" });

      const isOwner = board.ownerId === req.user.id;
      const isMember = await BoardMember.findOne({
        where: { boardId: boardId, userId: req.user.id, status: "accepted" },
      });

      if (!isOwner && !isMember) {
        return res.status(403).json({ error: "Access denied" });
      }

      const onlineUsers = await socketManager.getBoardOnlineUsers(boardId);
      res.json({
        boardId,
        onlineUsers,
        count: onlineUsers.length,
        timestamp: new Date(),
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}
