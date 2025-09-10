import express from "express";
import { Column } from "../models/index.js";

const router = express.Router();

// Update a column (rename or reorder)
router.put("/:id", async (req, res) => {
  try {
    const column = await Column.findByPk(req.params.id);
    if (!column) {
      return res.status(404).json({ error: "Column not found" });
    }
    await column.update(req.body);
    res.json(column);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Add a card to a column
router.post("/:id/cards", async (req, res) => {
  try {
    const column = await Column.findByPk(req.params.id);
    if (!column) {
      return res.status(404).json({ error: "Column not found" });
    }
    const card = await column.createCard(req.body);
    res.status(201).json(card);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
