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
import { Op } from "sequelize";
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
      ],
      order: [
        ["Columns", "order", "ASC"],
        ["Columns", "Cards", "order", "ASC"],
      ],
    });
  }

  // ✅ Get single card with full details
  router.get("/:id", authenticate, async (req, res) => {
    try {
      const card = await Card.findByPk(req.params.id, {
        include: [
          {
            model: User,
            as: "Assignees",
            through: { attributes: [] }, // Don't include junction table data
          },
          {
            model: CardComment,
            as: "Comments",
            include: [{ model: User, as: "User" }],
            order: [["createdAt", "ASC"]],
          },
        ],
      });

      if (!card) {
        return res.status(404).json({ error: "Card not found" });
      }

      res.json(card);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ✅ Create Card
  router.post("/:columnId", authenticate, async (req, res) => {
    try {
      const { title, description, priority, dueDate } = req.body;
      const { columnId } = req.params;

      if (!title)
        return res.status(400).json({ error: "Card title is required" });

      const column = await Column.findByPk(columnId);
      if (!column) return res.status(404).json({ error: "Column not found" });

      const maxOrder = await Card.max("order", {
        where: { columnId: columnId },
      });

      const card = await Card.create({
        title,
        description,
        priority: priority || "medium",
        dueDate: dueDate || null,
        columnId: columnId,
        order: (maxOrder ?? -1) + 1,
      });

      // Fetch the card with associations for the response
      const cardWithDetails = await Card.findByPk(card.id, {
        include: [
          { model: User, as: "Assignees" },
          {
            model: CardComment,
            as: "Comments",
            include: [{ model: User, as: "User" }],
          },
        ],
      });

      const updatedBoard = await getFullBoardData(column.boardId);

      // Emit socket events
      socketEventHelper.emitCardCreated(column.boardId, cardWithDetails);
      socketEventHelper.emitBoardUpdated(column.boardId, updatedBoard);

      // Send board notification
      socketEventHelper.emitBoardNotification(column.boardId, {
        type: NOTIFICATION_TYPES.SUCCESS,
        title: "Card Created",
        message: `${req.user.name} created card "${title}"`,
      });

      res.status(201).json(cardWithDetails);
    } catch (err) {
      console.error(err);

      // Send error notification
      socketEventHelper.emitNotification(req.user.id, {
        type: NOTIFICATION_TYPES.ERROR,
        title: "Card Creation Failed",
        message: "Failed to create card. Please try again.",
      });

      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ✅ Update Card
  router.put("/:id", authenticate, async (req, res) => {
    try {
      const { title, description, status, priority, dueDate } = req.body;
      const card = await Card.findByPk(req.params.id);
      if (!card) return res.status(404).json({ error: "Card not found" });

      const updatedFields = [];
      const oldData = { ...card.toJSON() };

      await card.update({
        title,
        description,
        status,
        priority,
        dueDate,
      });

      // Track which fields were updated
      if (oldData.title !== title) updatedFields.push("title");
      if (oldData.description !== description)
        updatedFields.push("description");
      if (oldData.status !== status) updatedFields.push("status");
      if (oldData.priority !== priority) updatedFields.push("priority");
      if (oldData.dueDate !== dueDate) updatedFields.push("dueDate");

      // Fetch updated card with associations
      const updatedCard = await Card.findByPk(card.id, {
        include: [
          { model: User, as: "Assignees" },
          {
            model: CardComment,
            as: "Comments",
            include: [{ model: User, as: "User" }],
          },
        ],
      });

      const column = await Column.findByPk(card.columnId);
      const updatedBoard = await getFullBoardData(column.boardId);

      // Emit socket events
      socketEventHelper.emitCardUpdated(
        column.boardId,
        updatedCard,
        updatedFields
      );
      socketEventHelper.emitBoardUpdated(column.boardId, updatedBoard);

      // Send board notification for significant changes
      if (updatedFields.includes("status") || updatedFields.includes("title")) {
        socketEventHelper.emitBoardNotification(column.boardId, {
          type: NOTIFICATION_TYPES.INFO,
          title: "Card Updated",
          message: `${req.user.name} updated card "${card.title}"`,
        });
      }

      res.json(updatedCard);
    } catch (err) {
      console.error(err);

      // Send error notification
      socketEventHelper.emitNotification(req.user.id, {
        type: NOTIFICATION_TYPES.ERROR,
        title: "Card Update Failed",
        message: "Failed to update card. Please try again.",
      });

      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ✅ Assign user to card
  router.post("/:id/assign", authenticate, async (req, res) => {
    try {
      console.log("req.body", req.body);
      const { userId } = req.body;
      const card = await Card.findByPk(req.params.id);
      if (!card) return res.status(404).json({ error: "Card not found" });

      // Check if assignment already exists
      const existingAssignment = await CardAssignment.findOne({
        where: { cardId: card.id, userId: userId },
      });

      if (existingAssignment) {
        return res
          .status(400)
          .json({ error: "User already assigned to this card" });
      }

      const assignee = await User.findByPk(userId);
      if (!assignee) return res.status(404).json({ error: "User not found" });

      const assignment = await CardAssignment.create({
        cardId: card.id,
        userId,
      });

      const column = await Column.findByPk(card.columnId);
      const updatedBoard = await getFullBoardData(column.boardId);

      // Get the updated card with assignees
      const updatedCard = await Card.findByPk(card.id, {
        include: [{ model: User, as: "Assignees" }],
      });

      // Emit socket events
      socketEventHelper.emitCardAssigned(
        column.boardId,
        card.id,
        assignee,
        req.user
      );
      socketEventHelper.emitBoardUpdated(column.boardId, updatedBoard);

      // Send notification to assigned user
      socketEventHelper.emitNotification(userId, {
        type: NOTIFICATION_TYPES.INFO,
        title: "Card Assignment",
        message: `You have been assigned to card "${card.title}" by ${req.user.name}`,
        data: { cardId: card.id, boardId: column.boardId },
      });

      // Return the assignment with user data
      res.status(201).json({
        assignment,
        assignee,
        card: updatedCard,
      });
    } catch (err) {
      console.error(err);

      // Send error notification
      socketEventHelper.emitNotification(req.user.id, {
        type: NOTIFICATION_TYPES.ERROR,
        title: "Assignment Failed",
        message: "Failed to assign user to card. Please try again.",
      });

      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ✅ Remove user assignment from card
  router.delete("/:id/assign/:userId", authenticate, async (req, res) => {
    try {
      const { id: cardId, userId } = req.params;

      const assignment = await CardAssignment.findOne({
        where: { cardId, userId },
        include: [{ model: User, as: "User" }],
      });

      if (!assignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }

      const unassignedUser = await User.findByPk(userId);
      await assignment.destroy();

      const card = await Card.findByPk(cardId, {
        include: [{ model: User, as: "Assignees" }],
      });
      const column = await Column.findByPk(card.columnId);
      const updatedBoard = await getFullBoardData(column.boardId);

      // Emit socket events
      socketEventHelper.emitCardUnassigned(
        column.boardId,
        cardId,
        unassignedUser,
        req.user
      );
      socketEventHelper.emitBoardUpdated(column.boardId, updatedBoard);

      // Send notification to unassigned user
      socketEventHelper.emitNotification(userId, {
        type: NOTIFICATION_TYPES.INFO,
        title: "Card Unassigned",
        message: `You have been unassigned from card "${card.title}"`,
        data: { cardId, boardId: column.boardId },
      });

      res.status(200).json({
        message: "User unassigned successfully",
        unassignedUser,
        card,
      });
    } catch (err) {
      console.error(err);

      // Send error notification
      socketEventHelper.emitNotification(req.user.id, {
        type: NOTIFICATION_TYPES.ERROR,
        title: "Unassignment Failed",
        message: "Failed to remove user assignment. Please try again.",
      });

      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ✅ Move card within same column or across columns
  router.put("/:id/move", authenticate, async (req, res) => {
    const t = await sequelize.transaction();
    try {
      const { newColumnId, newOrder } = req.body;
      const card = await Card.findByPk(req.params.id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!card) {
        await t.rollback();
        return res.status(404).json({ error: "Card not found" });
      }

      const oldColumnId = card.columnId;
      const oldOrder = card.order;
      const sameColumn = String(oldColumnId) === String(newColumnId);

      // Moving within the same column
      if (sameColumn) {
        if (oldOrder === newOrder) {
          await t.commit();
          return res.status(200).json(card);
        }

        await card.update({ order: -1 }, { transaction: t });

        if (newOrder > oldOrder) {
          await Card.update(
            { order: sequelize.literal('"order" - 1') },
            {
              where: {
                columnId: oldColumnId,
                order: { [Op.gt]: oldOrder, [Op.lte]: newOrder },
              },
              transaction: t,
            }
          );
        } else {
          await Card.update(
            { order: sequelize.literal('"order" + 1') },
            {
              where: {
                columnId: oldColumnId,
                order: { [Op.gte]: newOrder, [Op.lt]: oldOrder },
              },
              transaction: t,
            }
          );
        }

        await card.update({ order: newOrder }, { transaction: t });
      } else {
        // Moving across columns
        const targetColumn = await Column.findByPk(newColumnId, {
          transaction: t,
        });
        if (!targetColumn) {
          await t.rollback();
          return res.status(400).json({ error: "Target column not found" });
        }

        // Remove gap in old column
        await Card.update(
          { order: sequelize.literal('"order" - 1') },
          {
            where: { columnId: oldColumnId, order: { [Op.gt]: oldOrder } },
            transaction: t,
          }
        );

        // Shift cards in new column to make room
        await Card.update(
          { order: sequelize.literal('"order" + 1') },
          {
            where: { columnId: newColumnId, order: { [Op.gte]: newOrder } },
            transaction: t,
          }
        );

        await card.update(
          { columnId: newColumnId, order: newOrder },
          { transaction: t }
        );
      }

      await t.commit();

      // Get updated card with associations
      const updatedCard = await Card.findByPk(card.id, {
        include: [
          { model: User, as: "Assignees" },
          {
            model: CardComment,
            as: "Comments",
            include: [{ model: User, as: "User" }],
          },
        ],
      });

      // Emit real-time board update
      const finalColumn = await Column.findByPk(newColumnId);
      const updatedBoard = await getFullBoardData(finalColumn.boardId);

      // Emit socket events
      socketEventHelper.emitCardMoved(
        finalColumn.boardId,
        updatedCard,
        oldColumnId,
        newColumnId
      );
      socketEventHelper.emitBoardUpdated(finalColumn.boardId, updatedBoard);

      // Send board notification for cross-column moves
      if (!sameColumn) {
        socketEventHelper.emitBoardNotification(finalColumn.boardId, {
          type: NOTIFICATION_TYPES.INFO,
          title: "Card Moved",
          message: `${req.user.name} moved card "${card.title}" to a different column`,
        });
      }

      res.status(200).json(updatedCard);
    } catch (err) {
      if (t && !["commit", "rollback"].includes(t.finished)) await t.rollback();
      console.error("Error moving card:", err);

      // Send error notification
      socketEventHelper.emitNotification(req.user.id, {
        type: NOTIFICATION_TYPES.ERROR,
        title: "Card Move Failed",
        message: "Failed to move card. Please try again.",
      });

      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ✅ Get all comments for a card
  router.get("/:id/comments", authenticate, async (req, res) => {
    try {
      const card = await Card.findByPk(req.params.id, {
        include: [
          {
            model: CardComment,
            as: "Comments",
            include: [{ model: User, as: "User" }],
            order: [["createdAt", "ASC"]],
          },
        ],
      });

      if (!card) return res.status(404).json({ error: "Card not found" });

      res.json(card.Comments);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ✅ Update card status
  router.put("/:id/status", authenticate, async (req, res) => {
    try {
      const { status } = req.body;
      const card = await Card.findByPk(req.params.id);
      if (!card) return res.status(404).json({ error: "Card not found" });

      const oldStatus = card.status;
      await card.update({ status });

      // Get updated card with associations
      const updatedCard = await Card.findByPk(card.id, {
        include: [
          { model: User, as: "Assignees" },
          {
            model: CardComment,
            as: "Comments",
            include: [{ model: User, as: "User" }],
          },
        ],
      });

      const column = await Column.findByPk(card.columnId);
      const updatedBoard = await getFullBoardData(column.boardId);

      // Emit socket events
      socketEventHelper.emitCardUpdated(column.boardId, updatedCard, [
        "status",
      ]);
      socketEventHelper.emitBoardUpdated(column.boardId, updatedBoard);

      // Send board notification
      socketEventHelper.emitBoardNotification(column.boardId, {
        type: NOTIFICATION_TYPES.SUCCESS,
        title: "Card Status Updated",
        message: `${req.user.name} changed card "${card.title}" status from "${oldStatus}" to "${status}"`,
      });

      res.json(updatedCard);
    } catch (err) {
      console.error(err);

      // Send error notification
      socketEventHelper.emitNotification(req.user.id, {
        type: NOTIFICATION_TYPES.ERROR,
        title: "Status Update Failed",
        message: "Failed to update card status. Please try again.",
      });

      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ✅ Add comment
  router.post("/:id/comments", authenticate, async (req, res) => {
    try {
      // Accept both 'comment' and 'text' field names for flexibility
      const commentText = req.body.comment || req.body.text;

      if (!commentText || !commentText.trim()) {
        return res.status(400).json({ error: "Comment cannot be empty" });
      }

      const card = await Card.findByPk(req.params.id);
      if (!card) return res.status(404).json({ error: "Card not found" });

      const newComment = await CardComment.create({
        cardId: card.id,
        userId: req.user.id,
        comment: commentText, // Store in the 'comment' field
      });

      // Return the comment with user info
      const commentWithUser = await CardComment.findByPk(newComment.id, {
        include: [{ model: User, as: "User" }],
      });

      const column = await Column.findByPk(card.columnId);
      const updatedBoard = await getFullBoardData(column.boardId);

      // Emit socket events
      socketEventHelper.emitCardCommentAdded(
        column.boardId,
        card.id,
        commentWithUser,
        req.user
      );
      socketEventHelper.emitBoardUpdated(column.boardId, updatedBoard);

      // Send board notification
      socketEventHelper.emitBoardNotification(column.boardId, {
        type: NOTIFICATION_TYPES.INFO,
        title: "New Comment",
        message: `${req.user.name} commented on card "${card.title}"`,
      });

      res.status(201).json(commentWithUser);
    } catch (err) {
      console.error(err);

      // Send error notification
      socketEventHelper.emitNotification(req.user.id, {
        type: NOTIFICATION_TYPES.ERROR,
        title: "Comment Failed",
        message: "Failed to add comment. Please try again.",
      });

      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ✅ Delete comment
  router.delete("/:id/comments/:commentId", authenticate, async (req, res) => {
    try {
      const { id: cardId, commentId } = req.params;

      const comment = await CardComment.findOne({
        where: { id: commentId, cardId },
        include: [{ model: User, as: "User" }],
      });

      if (!comment) {
        return res.status(404).json({ error: "Comment not found" });
      }

      // Only allow deletion by comment author or admin
      if (comment.userId !== req.user.id) {
        return res
          .status(403)
          .json({ error: "Not authorized to delete this comment" });
      }

      await comment.destroy();

      const card = await Card.findByPk(cardId);
      const column = await Column.findByPk(card.columnId);
      const updatedBoard = await getFullBoardData(column.boardId);

      // Emit socket events
      socketEventHelper.emitCardCommentDeleted(
        column.boardId,
        cardId,
        commentId
      );
      socketEventHelper.emitBoardUpdated(column.boardId, updatedBoard);

      res.status(204).send();
    } catch (err) {
      console.error(err);

      // Send error notification
      socketEventHelper.emitNotification(req.user.id, {
        type: NOTIFICATION_TYPES.ERROR,
        title: "Comment Deletion Failed",
        message: "Failed to delete comment. Please try again.",
      });

      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ✅ Delete card
  router.delete("/:id", authenticate, async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
      const card = await Card.findByPk(req.params.id, { transaction });
      if (!card) {
        await transaction.rollback();
        return res.status(404).json({ error: "Card not found" });
      }

      const columnId = card.columnId;
      const cardOrder = card.order;
      const cardTitle = card.title;

      // Delete the card (this will cascade delete assignments and comments)
      await card.destroy({ transaction });

      // Update order of remaining cards
      await Card.update(
        { order: sequelize.literal('"order" - 1') },
        {
          where: { columnId: columnId, order: { [Op.gt]: cardOrder } },
          transaction,
        }
      );

      await transaction.commit();

      const column = await Column.findByPk(columnId);
      const updatedBoard = await getFullBoardData(column.boardId);

      // Emit socket events
      socketEventHelper.emitCardDeleted(
        column.boardId,
        req.params.id,
        columnId
      );
      socketEventHelper.emitBoardUpdated(column.boardId, updatedBoard);

      // Send board notification
      socketEventHelper.emitBoardNotification(column.boardId, {
        type: NOTIFICATION_TYPES.WARNING,
        title: "Card Deleted",
        message: `${req.user.name} deleted card "${cardTitle}"`,
      });

      res.status(204).send();
    } catch (err) {
      if (transaction && !["commit", "rollback"].includes(transaction.finished))
        await transaction.rollback();
      console.error(err);

      // Send error notification
      socketEventHelper.emitNotification(req.user.id, {
        type: NOTIFICATION_TYPES.ERROR,
        title: "Card Deletion Failed",
        message: "Failed to delete card. Please try again.",
      });

      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}
