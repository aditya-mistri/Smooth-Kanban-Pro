import express from "express";
import { Column, Card, Board } from "../models/index.js";
import sequelize from "../config/database.js"; // Import sequelize for transactions
import { Op } from "sequelize"; // Import Op for operators

export default function (io) {
  const router = express.Router();

  // Update a column
  router.put("/:id", async (req, res) => {
    try {
      const { title } = req.body;
      const column = await Column.findByPk(req.params.id);
      if (!column) {
        return res.status(404).json({ error: "Column not found" });
      }

      await column.update({ title: title.trim() });

      // ✅ CHANGE: Fetch the full board and emit 'board_updated'
      const updatedBoard = await Board.findByPk(column.BoardId, {
        include: [
          {
            model: Column,
            as: "Columns",
            include: [{ model: Card, as: "Cards" }],
          },
        ],
        order: [
          ["Columns", "order", "ASC"],
          ["Columns", "Cards", "order", "ASC"],
        ],
      });
      io.to(column.BoardId.toString()).emit("board_updated", updatedBoard);
      io.to(column.BoardId.toString()).emit("notification", {
        type: "success",
        message: `Column "${oldTitle}" renamed to "${column.title}".`,
      });


      res.json(column);
    } catch (error) {
      console.error("Error updating column:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Add card to column
  router.post("/:id/cards", async (req, res) => {
    try {
      const { title, description } = req.body;
      const columnId = req.params.id;
      if (!title || title.trim() === "") {
        return res.status(400).json({ error: "Card title is required" });
      }
      const column = await Column.findByPk(columnId);
      if (!column) {
        return res.status(404).json({ error: "Column not found" });
      }
      const maxOrder = await Card.max("order", {
        where: { ColumnId: columnId },
      });
      const nextOrder = (maxOrder ?? -1) + 1;
      const card = await Card.create({
        title: title.trim(),
        description: description ? description.trim() : null,
        ColumnId: columnId,
        order: nextOrder,
      });

      // ✅ CHANGE: Fetch the full board and emit 'board_updated'
      const updatedBoard = await Board.findByPk(column.BoardId, {
        include: [
          {
            model: Column,
            as: "Columns",
            include: [{ model: Card, as: "Cards" }],
          },
        ],
        order: [
          ["Columns", "order", "ASC"],
          ["Columns", "Cards", "order", "ASC"],
        ],
      });
      io.to(column.BoardId.toString()).emit("board_updated", updatedBoard);
      io.to(column.BoardId.toString()).emit("notification", {
        type: "success",
        message: `New card "${card.title}" added to "${column.title}".`,
      });

      res.status(201).json(card);
    } catch (error) {
      console.error("Error creating card:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  router.delete("/:id", async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
      const column = await Column.findByPk(req.params.id, { transaction });
      if (!column) {
        await transaction.rollback();
        return res.status(404).json({ error: "Column not found" });
      }

      const { BoardId, order: deletedOrder } = column;
      await column.destroy({ transaction });

      await Column.update(
        { order: sequelize.literal('"order" - 1') },
        { where: { BoardId, order: { [Op.gt]: deletedOrder } }, transaction }
      );
      await transaction.commit();

      const updatedBoard = await Board.findByPk(BoardId, {
        include: [
          {
            model: Column,
            as: "Columns",
            include: [
              {
                model: Card,
                as: "Cards",
              },
            ],
          },
        ],
        // ✅ FINAL FIX: Use string aliases for the nested order path
        order: [
          ["Columns", "order", "ASC"],
          ["Columns", "Cards", "order", "ASC"],
        ],
      });

      io.to(BoardId.toString()).emit("board_updated", updatedBoard);
      io.to(BoardId.toString()).emit("notification", {
        type: "success",
        message: `Column "${columnTitle}" was deleted.`,
      });
      res.status(204).send();
    } catch (error) {
      if (
        transaction.finished !== "commit" &&
        transaction.finished !== "rollback"
      ) {
        await transaction.rollback();
      }
      console.error("Error deleting column:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}
