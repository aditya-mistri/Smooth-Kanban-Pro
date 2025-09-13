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
import { authenticate, authorize } from "../middleware/auth.js";
import { SOCKET_EVENTS, NOTIFICATION_TYPES } from "../socket/events.js";

export default function (socketManager, socketEventHelper) {
  const router = express.Router();

  // ✅ Create Column (Admin only)
  router.post(
    "/:boardId",
    authenticate,
    authorize("admin"),
    async (req, res) => {
      try {
        const { title } = req.body;
        const { boardId } = req.params;

        const board = await Board.findByPk(boardId);
        if (!board) return res.status(404).json({ error: "Board not found" });

        const maxOrder = await Column.max("order", {
          where: { boardId: boardId },
        });

        const column = await Column.create({
          title,
          boardId: boardId,
          order: (maxOrder ?? -1) + 1,
        });

        const updatedBoard = await Board.findByPk(boardId, {
          include: [
            {
              model: Column,
              as: "Columns",
              include: [{ 
                model: Card, 
                as: "Cards",
                include: [
                  { model: User, as: "Assignees" },
                  { 
                    model: CardComment, 
                    as: "Comments",
                    include: [{ model: User, as: "User" }]
                  },
                ]
              }],
            },
          ],
          order: [
            ["Columns", "order", "ASC"],
            ["Columns", "Cards", "order", "ASC"],
          ],
        });

        // Emit socket events
        socketEventHelper.emitColumnCreated(boardId, column);
        socketEventHelper.emitBoardUpdated(boardId, updatedBoard);
        
        // Send success notification
        socketEventHelper.emitNotification(req.user.id, {
          type: NOTIFICATION_TYPES.SUCCESS,
          title: 'Column Created',
          message: `Column "${title}" has been created successfully`,
          data: { boardId, columnId: column.id }
        });

        res.status(201).json(column);
      } catch (err) {
        console.error(err);
        
        // Send error notification
        socketEventHelper.emitNotification(req.user.id, {
          type: NOTIFICATION_TYPES.ERROR,
          title: 'Column Creation Failed',
          message: 'Failed to create column. Please try again.'
        });
        
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // ✅ Update Column title
  router.put("/:id", authenticate, authorize("admin"), async (req, res) => {
    try {
      const { title } = req.body;
      const column = await Column.findByPk(req.params.id);
      if (!column) return res.status(404).json({ error: "Column not found" });

      const oldTitle = column.title;
      await column.update({ title });

      const updatedBoard = await Board.findByPk(column.boardId, {
        include: [
          {
            model: Column,
            as: "Columns",
            include: [{ 
              model: Card, 
              as: "Cards",
              include: [
                { model: User, as: "Assignees" },
                { 
                  model: CardComment, 
                  as: "Comments",
                  include: [{ model: User, as: "User" }]
                },
              ]
            }],
          },
        ],
        order: [
          ["Columns", "order", "ASC"],
          ["Columns", "Cards", "order", "ASC"],
        ],
      });

      // Emit socket events
      socketEventHelper.emitColumnUpdated(column.boardId, column);
      socketEventHelper.emitBoardUpdated(column.boardId, updatedBoard);
      
      // Send success notification
      socketEventHelper.emitNotification(req.user.id, {
        type: NOTIFICATION_TYPES.SUCCESS,
        title: 'Column Updated',
        message: `Column renamed from "${oldTitle}" to "${title}"`,
        data: { boardId: column.boardId, columnId: column.id }
      });

      res.json(column);
    } catch (err) {
      console.error(err);
      
      // Send error notification
      socketEventHelper.emitNotification(req.user.id, {
        type: NOTIFICATION_TYPES.ERROR,
        title: 'Column Update Failed',
        message: 'Failed to update column. Please try again.'
      });
      
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ✅ Reorder columns
  router.put(
    "/reorder/:boardId",
    authenticate,
    authorize("admin"),
    async (req, res) => {
      const transaction = await sequelize.transaction();
      try {
        const { orderedIds } = req.body;
        if (!Array.isArray(orderedIds))
          return res.status(400).json({ error: "orderedIds must be an array" });

        await Promise.all(
          orderedIds.map((id, index) =>
            Column.update({ order: index }, { where: { id }, transaction })
          )
        );

        await transaction.commit();

        const updatedBoard = await Board.findByPk(req.params.boardId, {
          include: [
            {
              model: Column,
              as: "Columns",
              include: [{ 
                model: Card, 
                as: "Cards",
                include: [
                  { model: User, as: "Assignees" },
                  { 
                    model: CardComment, 
                    as: "Comments",
                    include: [{ model: User, as: "User" }]
                  },
                ]
              }],
            },
          ],
          order: [
            ["Columns", "order", "ASC"],
            ["Columns", "Cards", "order", "ASC"],
          ],
        });

        // Emit socket events
        socketEventHelper.emitColumnsReordered(req.params.boardId, updatedBoard.Columns);
        socketEventHelper.emitBoardUpdated(req.params.boardId, updatedBoard);
        
        // Send board notification
        socketEventHelper.emitBoardNotification(req.params.boardId, {
          type: NOTIFICATION_TYPES.INFO,
          title: 'Columns Reordered',
          message: `${req.user.name} has reordered the columns`
        });

        res.status(200).json({ message: "Columns reordered successfully" });
      } catch (err) {
        if (
          transaction &&
          !["commit", "rollback"].includes(transaction.finished)
        )
          await transaction.rollback();

        console.error(err);
        
        // Send error notification
        socketEventHelper.emitNotification(req.user.id, {
          type: NOTIFICATION_TYPES.ERROR,
          title: 'Column Reorder Failed',
          message: 'Failed to reorder columns. Please try again.'
        });
        
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // ✅ Delete Column
  router.delete("/:id", authenticate, authorize("admin"), async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
      const column = await Column.findByPk(req.params.id, { transaction });
      if (!column) return res.status(404).json({ error: "Column not found" });

      const boardId = column.boardId;
      const columnTitle = column.title;

      await column.destroy({ transaction });
      await transaction.commit();

      const updatedBoard = await Board.findByPk(boardId, {
        include: [
          {
            model: Column,
            as: "Columns",
            include: [{ 
              model: Card, 
              as: "Cards",
              include: [
                { model: User, as: "Assignees" },
                { 
                  model: CardComment, 
                  as: "Comments",
                  include: [{ model: User, as: "User" }]
                },
              ]
            }],
          },
        ],
        order: [
          ["Columns", "order", "ASC"],
          ["Columns", "Cards", "order", "ASC"],
        ],
      });

      // Emit socket events
      socketEventHelper.emitColumnDeleted(boardId, req.params.id);
      socketEventHelper.emitBoardUpdated(boardId, updatedBoard);
      
      // Send notifications
      socketEventHelper.emitBoardNotification(boardId, {
        type: NOTIFICATION_TYPES.WARNING,
        title: 'Column Deleted',
        message: `Column "${columnTitle}" has been deleted by ${req.user.name}`
      });

      res.status(204).send();
    } catch (err) {
      if (!["commit", "rollback"].includes(transaction.finished))
        await transaction.rollback();

      console.error(err);
      
      // Send error notification
      socketEventHelper.emitNotification(req.user.id, {
        type: NOTIFICATION_TYPES.ERROR,
        title: 'Column Deletion Failed',
        message: 'Failed to delete column. Please try again.'
      });
      
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}