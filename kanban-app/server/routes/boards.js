import express from "express";
import { Board, Column, Card } from "../models/index.js";

const router = express.Router();

// Get all boards
router.get("/", async (req, res) => {
  try {
    const boards = await Board.findAll({
      order: [["createdAt", "DESC"]],
      limit: 1, // We'll just get the most recent board for now
    });
    res.json(boards);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Create a new board
router.post("/", async (req, res) => {
  try {
    const board = await Board.create(req.body);
    res.status(201).json(board);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get a board with its columns and cards
router.get("/:id", async (req, res) => {
  try {
    const board = await Board.findByPk(req.params.id, {
      include: [
        {
          model: Column,
          include: [Card],
        },
      ],
      order: [
        [Column, "order", "ASC"],
        [Column, Card, "createdAt", "ASC"],
      ],
    });
    if (!board) {
      return res.status(404).json({ error: "Board not found" });
    }
    res.json(board);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Add a column to a board
router.post("/:id/columns", async (req, res) => {
  try {
    const board = await Board.findByPk(req.params.id);
    if (!board) {
      return res.status(404).json({ error: "Board not found" });
    }
    const column = await Column.create({
      ...req.body,
      boardId: board.id,
    });
    res.status(201).json(column);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
