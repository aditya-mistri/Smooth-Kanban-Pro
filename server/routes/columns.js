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
import { Decimal } from "decimal.js"; //

export default function (socketManager, socketEventHelper) {
  const router = express.Router();

  // Helper function to calculate order values
  const calculateOrderValues = (orderedIds, existingColumns) => {
    const columnMap = new Map(existingColumns.map(col => [col.id, col]));
    const orderValues = [];
    
    for (let i = 0; i < orderedIds.length; i++) {
      if (i === 0) {
        // First item gets order 1000
        orderValues.push({ id: orderedIds[i], order: 1000 });
      } else {
        // Subsequent items get previous + 1000
        orderValues.push({ 
          id: orderedIds[i], 
          order: orderValues[i - 1].order + 1000 
        });
      }
    }
    
    return orderValues;
  };

  // Alternative helper for tight spacing (if you want items closer together)
  const calculateTightOrderValues = (orderedIds) => {
    return orderedIds.map((id, index) => ({
      id,
      order: (index + 1) * 1000 // 1000, 2000, 3000, etc.
    }));
  };

  // Helper to insert between existing positions
  const calculateInsertionOrder = async (boardId, targetPosition, transaction) => {
    const columns = await Column.findAll({
      where: { boardId },
      order: [['order', 'ASC']],
      transaction
    });

    if (columns.length === 0) return 1000;
    
    if (targetPosition === 0) {
      // Insert at beginning
      const firstOrder = parseFloat(columns[0].order);
      return firstOrder / 2;
    }
    
    if (targetPosition >= columns.length) {
      // Insert at end
      const lastOrder = parseFloat(columns[columns.length - 1].order);
      return lastOrder + 1000;
    }
    
    // Insert between positions
    const prevOrder = parseFloat(columns[targetPosition - 1].order);
    const nextOrder = parseFloat(columns[targetPosition].order);
    return (prevOrder + nextOrder) / 2;
  };

  // ✅ Create Column (Admin only) - Updated for decimal
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

        // Get max order and add 1000 for spacing
        const maxOrder = await Column.max("order", {
          where: { boardId: boardId },
        });

        const newOrder = maxOrder ? parseFloat(maxOrder) + 1000 : 1000;

        const column = await Column.create({
          title,
          boardId: boardId,
          order: newOrder,
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
        
        socketEventHelper.emitNotification(req.user.id, {
          type: NOTIFICATION_TYPES.SUCCESS,
          title: 'Column Created',
          message: `Column "${title}" has been created successfully`,
          data: { boardId, columnId: column.id }
        });

        res.status(201).json(column);
      } catch (err) {
        console.error(err);
        
        socketEventHelper.emitNotification(req.user.id, {
          type: NOTIFICATION_TYPES.ERROR,
          title: 'Column Creation Failed',
          message: 'Failed to create column. Please try again.'
        });
        
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // ✅ Update Column title (unchanged)
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

      socketEventHelper.emitColumnUpdated(column.boardId, column);
      socketEventHelper.emitBoardUpdated(column.boardId, updatedBoard);
      
      socketEventHelper.emitNotification(req.user.id, {
        type: NOTIFICATION_TYPES.SUCCESS,
        title: 'Column Updated',
        message: `Column renamed from "${oldTitle}" to "${title}"`,
        data: { boardId: column.boardId, columnId: column.id }
      });

      res.json(column);
    } catch (err) {
      console.error(err);
      
      socketEventHelper.emitNotification(req.user.id, {
        type: NOTIFICATION_TYPES.ERROR,
        title: 'Column Update Failed',
        message: 'Failed to update column. Please try again.'
      });
      
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ✅ Reorder columns - DECIMAL VERSION
  router.put(
    "/reorder/:boardId",
    authenticate,
    authorize("admin"),
    async (req, res) => {
      const transaction = await sequelize.transaction();
      try {
        const { orderedIds } = req.body;
        const { boardId } = req.params;
        
        if (!Array.isArray(orderedIds)) {
          await transaction.rollback();
          return res.status(400).json({ error: "orderedIds must be an array" });
        }

        // Verify all columns belong to this board
        const existingColumns = await Column.findAll({
          where: { 
            id: orderedIds, 
            boardId: boardId 
          },
          transaction
        });

        if (existingColumns.length !== orderedIds.length) {
          await transaction.rollback();
          return res.status(400).json({ 
            error: "Some columns don't exist or don't belong to this board" 
          });
        }

        // Calculate new decimal order values with good spacing
        const orderValues = calculateTightOrderValues(orderedIds);

        // Update all columns with their new order values
        await Promise.all(
          orderValues.map(({ id, order }) =>
            Column.update(
              { order },
              { where: { id }, transaction }
            )
          )
        );

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
        socketEventHelper.emitColumnsReordered(boardId, updatedBoard.Columns);
        socketEventHelper.emitBoardUpdated(boardId, updatedBoard);
        
        socketEventHelper.emitBoardNotification(boardId, {
          type: NOTIFICATION_TYPES.INFO,
          title: 'Columns Reordered',
          message: `${req.user.name} has reordered the columns`
        });

        res.status(200).json({ 
          message: "Columns reordered successfully",
          columns: updatedBoard.Columns 
        });
        
      } catch (err) {
        if (transaction && !["commit", "rollback"].includes(transaction.finished)) {
          await transaction.rollback();
        }

        console.error("Column reorder error:", err);
        
        socketEventHelper.emitNotification(req.user.id, {
          type: NOTIFICATION_TYPES.ERROR,
          title: 'Column Reorder Failed',
          message: 'Failed to reorder columns. Please try again.'
        });
        
        res.status(500).json({ error: "Failed to reorder columns" });
      }
    }
  );

  // ✅ Delete Column (unchanged)
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

      socketEventHelper.emitColumnDeleted(boardId, req.params.id);
      socketEventHelper.emitBoardUpdated(boardId, updatedBoard);
      
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