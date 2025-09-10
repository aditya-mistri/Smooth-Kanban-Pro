import express from "express";
import { Card, Column } from "../models/index.js";

export default function(io) {
  const router = express.Router();

  // Update a card
  router.put("/:id", async (req, res) => {
    try {
      const card = await Card.findByPk(req.params.id);
      if (!card) return res.status(404).json({ error: "Card not found" });

      await card.update(req.body);

      const column = await Column.findByPk(card.ColumnId);

      io.to(column.BoardId.toString()).emit("card_updated", card);

      res.json(card);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Delete a card
  router.delete("/:id", async (req, res) => {
    try {
      const card = await Card.findByPk(req.params.id);
      if (!card) return res.status(404).json({ error: "Card not found" });

      const column = await Column.findByPk(card.ColumnId);

      await card.destroy();

      io.to(column.BoardId.toString()).emit("card_deleted", { id: card.id });

      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  return router;
}
