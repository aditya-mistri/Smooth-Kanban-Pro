// routes/invite.js
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
import sequelize from "../config/database.js";
import { authenticate } from "../middleware/auth.js";
import { NOTIFICATION_TYPES } from "../socket/events.js";

export default function (socketManager, socketEventHelper) {
  const router = express.Router();

  // Helper: fetch full board data with columns, cards, comments, members
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

  // ✅ Get received invites for current user
  router.get("/received", authenticate, async (req, res) => {
    try {
      const invites = await Invite.findAll({
        where: { inviteeEmail: req.user.email, status: "pending" },
        include: [
          { model: User, as: "Inviter", attributes: ["id", "name", "email"] },
          {
            model: Board,
            as: "Board",
            attributes: ["id", "name", "description"],
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      res.json(invites);
    } catch (err) {
      console.error(err);
      socketEventHelper.emitNotification(req.user.id, {
        type: NOTIFICATION_TYPES.ERROR,
        title: "Invites Loading Failed",
        message: "Failed to load your invitations. Please try again.",
      });
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ✅ Get sent invites for current user
  router.get("/sent", authenticate, async (req, res) => {
    try {
      const invites = await Invite.findAll({
        where: { inviterId: req.user.id },
        include: [{ model: Board, as: "Board", attributes: ["id", "name"] }],
        order: [["createdAt", "DESC"]],
      });

      res.json(invites);
    } catch (err) {
      console.error(err);
      socketEventHelper.emitNotification(req.user.id, {
        type: NOTIFICATION_TYPES.ERROR,
        title: "Sent Invites Loading Failed",
        message: "Failed to load your sent invitations. Please try again.",
      });
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ✅ Respond to an invite (Accept/Decline)
  router.post("/:inviteId/respond", authenticate, async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
      const { action } = req.body; // "accept" or "decline"
      if (!["accept", "decline"].includes(action)) {
        return res.status(400).json({ error: "Invalid action" });
      }

      const invite = await Invite.findByPk(req.params.inviteId, {
        include: [
          { model: User, as: "Inviter" },
          { model: Board, as: "Board" },
        ],
        transaction,
      });

      if (!invite || invite.inviteeEmail !== req.user.email) {
        await transaction.rollback();
        return res
          .status(404)
          .json({ error: "Invite not found or not authorized" });
      }

      if (invite.status !== "pending") {
        await transaction.rollback();
        return res.status(400).json({ error: "Invite already responded" });
      }

      invite.status = action === "accept" ? "accepted" : "declined";
      await invite.save({ transaction });

      if (action === "accept") {
        const existingMember = await BoardMember.findOne({
          where: { boardId: invite.boardId, userId: req.user.id },
          transaction,
        });

        if (existingMember) {
          await transaction.rollback();
          return res
            .status(400)
            .json({ error: "Already a member of this board" });
        }

        const newMember = await BoardMember.create(
          {
            boardId: invite.boardId,
            userId: req.user.id,
            role: "member",
            status: "accepted",
            joinedAt: new Date(),
          },
          { transaction }
        );

        await transaction.commit();

        const updatedBoard = await getFullBoardData(invite.boardId);

        // Socket events
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

        // Join socket room
        const userSocket = socketManager.connectedUsers.get(req.user.id);
        if (userSocket) {
          socketManager.io.sockets.sockets
            .get(userSocket)
            ?.join(invite.boardId.toString());
        }

        await socketEventHelper.emitOnlineUsersUpdate(invite.boardId);

        // Notifications
        socketEventHelper.emitNotification(invite.inviterId, {
          type: NOTIFICATION_TYPES.SUCCESS,
          title: "Invitation Accepted",
          message: `${req.user.name} accepted your invitation to join "${invite.Board.name}"`,
          data: { boardId: invite.boardId, inviteId: invite.id },
        });

        socketEventHelper.emitNotification(req.user.id, {
          type: NOTIFICATION_TYPES.SUCCESS,
          title: "Board Joined",
          message: `You joined the board "${invite.Board.name}"`,
          data: { boardId: invite.boardId },
        });
      } else {
        await invite.destroy({ transaction });
        await transaction.commit();

        socketEventHelper.emitInviteDeclined(
          invite.Inviter,
          req.user,
          invite.boardId
        );

        socketEventHelper.emitNotification(invite.inviterId, {
          type: NOTIFICATION_TYPES.INFO,
          title: "Invitation Declined",
          message: `${req.user.name} declined your invitation to join "${invite.Board.name}"`,
          data: { boardId: invite.boardId, inviteId: invite.id },
        });

        socketEventHelper.emitNotification(req.user.id, {
          type: NOTIFICATION_TYPES.INFO,
          title: "Invitation Declined",
          message: `You declined the invitation to join "${invite.Board.name}"`,
          data: { boardId: invite.boardId },
        });
      }

      res.json({
        success: true,
        status: invite.status,
        action,
        boardName: invite.Board.name,
      });
    } catch (err) {
      if (
        transaction &&
        !["commit", "rollback"].includes(transaction.finished)
      ) {
        await transaction.rollback();
      }
      console.error(err);
      socketEventHelper.emitNotification(req.user.id, {
        type: NOTIFICATION_TYPES.ERROR,
        title: "Invite Response Failed",
        message: "Failed to respond to invitation. Please try again.",
      });
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ✅ Cancel/Revoke an invite
  router.delete("/:inviteId", authenticate, async (req, res) => {
    try {
      const invite = await Invite.findByPk(req.params.inviteId, {
        include: [{ model: Board, as: "Board", attributes: ["name"] }],
      });

      if (!invite) return res.status(404).json({ error: "Invite not found" });
      if (invite.inviterId !== req.user.id)
        return res.status(403).json({ error: "Not authorized" });
      if (invite.status !== "pending")
        return res.status(400).json({ error: "Invite already handled" });

      const boardName = invite.Board.name;
      const inviteeEmail = invite.inviteeEmail;

      await invite.destroy();

      const inviteeUser = await User.findOne({
        where: { email: inviteeEmail },
        attributes: ["id"],
      });
      if (inviteeUser) {
        socketEventHelper.emitNotification(inviteeUser.id, {
          type: NOTIFICATION_TYPES.INFO,
          title: "Invitation Revoked",
          message: `The invitation to join "${boardName}" has been revoked`,
          data: { boardName },
        });
      }

      socketEventHelper.emitNotification(req.user.id, {
        type: NOTIFICATION_TYPES.SUCCESS,
        title: "Invitation Cancelled",
        message: `Invitation to ${inviteeEmail} for "${boardName}" cancelled`,
        data: { inviteeEmail, boardName },
      });

      res.json({
        success: true,
        message: "Invite cancelled successfully",
        inviteeEmail,
        boardName,
      });
    } catch (err) {
      console.error(err);
      socketEventHelper.emitNotification(req.user.id, {
        type: NOTIFICATION_TYPES.ERROR,
        title: "Invite Cancellation Failed",
        message: "Failed to cancel invitation. Please try again.",
      });
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ✅ Resend an invite
  router.post("/:inviteId/resend", authenticate, async (req, res) => {
    try {
      const invite = await Invite.findByPk(req.params.inviteId, {
        include: [{ model: Board, as: "Board", attributes: ["id", "name"] }],
      });

      if (!invite) return res.status(404).json({ error: "Invite not found" });
      if (invite.inviterId !== req.user.id)
        return res.status(403).json({ error: "Not authorized" });
      if (invite.status !== "pending")
        return res.status(400).json({ error: "Invite already handled" });

      await invite.update({ createdAt: new Date() });

      const inviteeUser = await User.findOne({
        where: { email: invite.inviteeEmail },
        attributes: ["id", "name"],
      });

      if (inviteeUser) {
        socketEventHelper.emitNotification(inviteeUser.id, {
          type: NOTIFICATION_TYPES.INFO,
          title: "Board Invitation Reminder",
          message: `Reminder: You have a pending invitation to join "${invite.Board.name}" from ${req.user.name}`,
          data: {
            inviteId: invite.id,
            boardId: invite.Board.id,
            boardName: invite.Board.name,
          },
        });
      }

      socketEventHelper.emitNotification(req.user.id, {
        type: NOTIFICATION_TYPES.SUCCESS,
        title: "Invitation Resent",
        message: `Reminder sent to ${invite.inviteeEmail} for "${invite.Board.name}"`,
        data: { inviteId: invite.id, boardName: invite.Board.name },
      });

      res.json({
        success: true,
        message: "Invite resent successfully",
        invite: {
          id: invite.id,
          inviteeEmail: invite.inviteeEmail,
          boardName: invite.Board.name,
          resentAt: new Date(),
        },
      });
    } catch (err) {
      console.error(err);
      socketEventHelper.emitNotification(req.user.id, {
        type: NOTIFICATION_TYPES.ERROR,
        title: "Invite Resend Failed",
        message: "Failed to resend invitation. Please try again.",
      });
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ✅ Get single invite (for inviter or invitee)
  router.get("/:inviteId", authenticate, async (req, res) => {
    try {
      const invite = await Invite.findByPk(req.params.inviteId, {
        include: [
          { model: User, as: "Inviter", attributes: ["id", "name", "email"] },
          {
            model: Board,
            as: "Board",
            attributes: ["id", "name", "description"],
          },
        ],
      });

      if (!invite) return res.status(404).json({ error: "Invite not found" });

      const isInviter = invite.inviterId === req.user.id;
      const isInvitee = invite.inviteeEmail === req.user.email;

      if (!isInviter && !isInvitee) {
        return res.status(403).json({ error: "Not authorized" });
      }

      res.json(invite);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}
