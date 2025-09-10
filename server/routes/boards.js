import express from "express";
import { Board, Column, Card } from "../models/index.js";

export default function(io) {
  const router = express.Router();

  // Get all boards (latest only for now)
  router.get("/", async (req, res) => {
    try {
      const boards = await Board.findAll({
        order: [["createdAt", "DESC"]],
        limit: 1,
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

      io.emit("board_created", board);

      res.status(201).json(board);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get a single board with columns and cards
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
      if (!board) return res.status(404).json({ error: "Board not found" });

      res.json(board);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Add a column to board
  router.post("/:id/columns", async (req, res) => {
    try {
      const board = await Board.findByPk(req.params.id);
      if (!board) return res.status(404).json({ error: "Board not found" });

      const column = await Column.create({ ...req.body, BoardId: board.id });

      io.to(board.id.toString()).emit("column_created", column);

      res.status(201).json(column);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  return router;
}
