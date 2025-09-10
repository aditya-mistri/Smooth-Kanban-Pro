import express from "express";
import { Column, Card } from "../models/index.js";

export default function(io) {
  const router = express.Router();

  // Update a column
  router.put("/:id", async (req, res) => {
    try {
      const column = await Column.findByPk(req.params.id);
      if (!column) return res.status(404).json({ error: "Column not found" });

      await column.update(req.body);

      io.to(column.BoardId.toString()).emit("column_updated", column);

      res.json(column);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Add card to column
  router.post("/:id/cards", async (req, res) => {
    try {
      const column = await Column.findByPk(req.params.id);
      if (!column) return res.status(404).json({ error: "Column not found" });

      const card = await Card.create({ ...req.body, ColumnId: column.id });

      io.to(column.BoardId.toString()).emit("card_created", card);

      res.status(201).json(card);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  return router;
}
