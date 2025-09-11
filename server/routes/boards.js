import express from "express";
import { Board, Column, Card } from "../models/index.js";
import sequelize from "../config/database.js";

export default function (io) {
  const router = express.Router();

  // ✅ FIXED: Get all boards with correct association ordering
  router.get("/", async (req, res) => {
    try {
      const boards = await Board.findAll({
        include: [{
          model: Column,
          as: 'Columns',
          include: [{
            model: Card,
            as: 'Cards'
          }]
        }],
        order: [
            ['createdAt', 'DESC'],
            // Use string aliases for ordering included models
            ['Columns', 'order', 'ASC'],
            ['Columns', 'Cards', 'order', 'ASC']
        ]
      });
      res.json(boards);
    } catch (error) {
      console.error("Error fetching boards:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Create a new board
  router.post("/", async (req, res) => {
    try {
      const { name } = req.body;
      if (!name || name.trim() === "") {
        return res.status(400).json({ error: "Board name is required" });
      }
      const newBoard = await Board.create({ name: name.trim() });
      const boardWithAssociations = await Board.findByPk(newBoard.id, {
        include: [{
          model: Column,
          as: 'Columns',
          include: [{ model: Card, as: 'Cards' }]
        }]
      });
      io.emit("board_created", boardWithAssociations);
      res.status(201).json(boardWithAssociations);
    } catch (error) {
      console.error("Error creating board:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ✅ FIXED: Get a single board with correct association ordering
  router.get("/:id", async (req, res) => {
    try {
      const board = await Board.findByPk(req.params.id, {
        include: [{ model: Column, as: "Columns", include: [{ model: Card, as: "Cards" }] }],
        order: [
            ['Columns', 'order', 'ASC'],
            ['Columns', 'Cards', 'order', 'ASC']
        ],
      });
      if (!board) {
        return res.status(404).json({ error: "Board not found" });
      }
      res.json(board);
    } catch (error) {
      console.error("Error fetching board:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ✅ FIXED: Add a column with correct association ordering in the updated board object
  router.post("/:id/columns", async (req, res) => {
    try {
      const { title } = req.body;
      const boardId = req.params.id;
      if (!title || title.trim() === "") {
        return res.status(400).json({ error: "Column title is required" });
      }
      const board = await Board.findByPk(boardId);
      if (!board) {
        return res.status(404).json({ error: "Board not found" });
      }
      const maxOrder = await Column.max("order", { where: { BoardId: boardId } });
      const nextOrder = (maxOrder ?? -1) + 1;
      const column = await Column.create({ title: title.trim(), BoardId: boardId, order: nextOrder });
      const updatedBoard = await Board.findByPk(boardId, {
        include: [{ model: Column, as: "Columns", include: [{ model: Card, as: "Cards" }] }],
        order: [['Columns', 'order', 'ASC'], ['Columns', 'Cards', 'order', 'ASC']],
      });
      io.to(boardId).emit("board_updated", updatedBoard);
      io.to(boardId).emit("notification", { type: "success", message: `New column "${column.title}" was added.` });
      res.status(201).json(column);
    } catch (error) {
      console.error("Error creating column:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ✅ FIXED: Update board with correct association ordering in the updated board object
  router.put("/:id", async (req, res) => {
    try {
      const { name } = req.body;
      const boardId = req.params.id;
      if (!name || name.trim() === "") {
        return res.status(400).json({ error: "Board name is required" });
      }
      const board = await Board.findByPk(boardId);
      if (!board) {
        return res.status(404).json({ error: "Board not found" });
      }
      await board.update({ name: name.trim() });
      const updatedBoard = await Board.findByPk(boardId, {
        include: [{ model: Column, as: "Columns", include: [{ model: Card, as: "Cards" }] }],
        order: [['Columns', 'order', 'ASC'], ['Columns', 'Cards', 'order', 'ASC']],
      });
      io.to(boardId).emit("board_updated", updatedBoard);
      io.emit("board_updated", updatedBoard); // Also emit to dashboard listeners
      io.to(boardId).emit("notification", { type: "success", message: `Board renamed to "${updatedBoard.name}".` });
      res.json(updatedBoard);
    } catch (error) {
      console.error("Error updating board:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ✅ FIXED: Reorder columns with correct association ordering in the updated board object
  router.put("/:id/columns/reorder", async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
      const { orderedIds } = req.body;
      if (!Array.isArray(orderedIds)) {
        return res.status(400).json({ error: "orderedIds must be an array" });
      }
      await Promise.all(
        orderedIds.map((id, index) =>
          Column.update({ order: index }, { where: { id: id, BoardId: req.params.id }, transaction })
        )
      );
      await transaction.commit();
      const updatedBoard = await Board.findByPk(req.params.id, {
        include: [{ model: Column, as: "Columns", include: [{ model: Card, as: "Cards" }] }],
        order: [['Columns', 'order', 'ASC'], ['Columns', 'Cards', 'order', 'ASC']],
      });
      io.to(req.params.id).emit("board_updated", updatedBoard);
      io.to(req.params.id).emit("notification", { type: "success", message: "Columns were successfully reordered." });
      res.status(200).json({ message: "Columns reordered successfully" });
    } catch (error) {
      if (transaction.finished !== 'commit' && transaction.finished !== 'rollback') {
        await transaction.rollback();
      }
      console.error("Error reordering columns:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Delete board
  router.delete("/:id", async (req, res) => {
    try {
      const board = await Board.findByPk(req.params.id);
      if (!board) {
        return res.status(404).json({ error: "Board not found" });
      }
      await board.destroy();
      io.emit("board_deleted", { id: req.params.id });
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting board:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}
