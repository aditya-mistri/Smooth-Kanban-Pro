import express from "express";
import { Card } from "../models/index.js";

const router = express.Router();

// Update a card (title, description, or move to another column)
router.put("/:id", async (req, res) => {
  try {
    const card = await Card.findByPk(req.params.id);
    if (!card) {
      return res.status(404).json({ error: "Card not found" });
    }
    await card.update(req.body);
    res.json(card);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete a card
router.delete("/:id", async (req, res) => {
  try {
    const card = await Card.findByPk(req.params.id);
    if (!card) {
      return res.status(404).json({ error: "Card not found" });
    }
    await card.destroy();
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
