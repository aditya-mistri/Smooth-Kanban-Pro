import express from "express";
import { Board, Column, Card } from "../models/index.js";
import sequelize from "../config/database.js";

export default function (io) {
  const router = express.Router();

  // Get all boards (No changes)
  router.get("/", async (req, res) => {
    try {
      const boards = await Board.findAll({ order: [["createdAt", "DESC"]] });
      res.json(boards);
    } catch (error) {
      console.error("Error fetching boards:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Create a new board (No changes)
  router.post("/", async (req, res) => {
    try {
      const { name } = req.body;
      if (!name || name.trim() === "") {
        return res.status(400).json({ error: "Board name is required" });
      }
      const board = await Board.create({ name: name.trim() });
      io.emit("board_created", board);
      res.status(201).json(board);
    } catch (error) {
      console.error("Error creating board:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get a single board with columns and cards (No changes, already fixed)
  router.get("/:id", async (req, res) => {
    try {
      const board = await Board.findByPk(req.params.id, {
        include: [{ model: Column, as: "Columns", include: [{ model: Card, as: "Cards" }] }],
        order: [['Columns', 'order', 'ASC'], ['Columns', 'Cards', 'order', 'ASC']],
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

  // ✅ UPDATED: Add a column to a board
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

      const column = await Column.create({
        title: title.trim(),
        BoardId: boardId,
        order: nextOrder,
      });

      // ✅ CHANGE: Fetch the full board and emit 'board_updated'
      const updatedBoard = await Board.findByPk(boardId, {
        include: [{ model: Column, as: "Columns", include: [{ model: Card, as: "Cards" }] }],
        order: [['Columns', 'order', 'ASC'], ['Columns', 'Cards', 'order', 'ASC']],
      });
      io.to(boardId).emit("board_updated", updatedBoard);

      res.status(201).json(column);
    } catch (error) {
      console.error("Error creating column:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ✅ UPDATED: Update board name
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

      // ✅ CHANGE: Fetch the full board with associations before emitting
      const updatedBoard = await Board.findByPk(boardId, {
        include: [{ model: Column, as: "Columns", include: [{ model: Card, as: "Cards" }] }],
        order: [['Columns', 'order', 'ASC'], ['Columns', 'Cards', 'order', 'ASC']],
      });
      io.to(boardId).emit("board_updated", updatedBoard);

      res.json(updatedBoard); // Send back the full board object
    } catch (error) {
      console.error("Error updating board:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Reorder columns (No changes, already fixed)
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
      res.status(200).json({ message: "Columns reordered successfully" });
    } catch (error) {
      if (transaction.finished !== 'commit' && transaction.finished !== 'rollback') {
        await transaction.rollback();
      }
      console.error("Error reordering columns:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Delete board (No changes)
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