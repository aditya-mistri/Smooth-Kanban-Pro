import express from "express";
import { Board, Card, Column } from "../models/index.js";
import sequelize from "../config/database.js";
import { Op } from "sequelize";

export default function (io) {
  const router = express.Router();

  router.put("/:id", async (req, res) => {
    try {
      const { title, description } = req.body;
      const card = await Card.findByPk(req.params.id);
      if (!card) {
        return res.status(404).json({ error: "Card not found" });
      }
      await card.update({ title, description });
      const column = await Column.findByPk(card.ColumnId);
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
      res.json(card);
    } catch (error) {
      console.error("Error updating card:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  router.put("/:id/move", async (req, res) => {
    const t = await sequelize.transaction();
    try {
      const { id } = req.params;
      let { newColumnId, newOrder } = req.body;

      // basic validation
      if (!newColumnId || typeof newOrder === "undefined") {
        await t.rollback();
        return res
          .status(400)
          .json({ error: "newColumnId and newOrder required" });
      }
      newOrder = Number.parseInt(newOrder, 10);
      if (Number.isNaN(newOrder) || newOrder < 0) newOrder = 0;

      // lock the card row for update
      const cardToMove = await Card.findByPk(id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!cardToMove) {
        await t.rollback();
        return res.status(404).json({ error: "Card not found" });
      }

      const oldColumnId = cardToMove.ColumnId;
      const oldOrder = cardToMove.order;

      // normalize ids to strings for safe comparison (UUIDs)
      const sameColumn = String(oldColumnId) === String(newColumnId);

      if (sameColumn) {
        // count cards in this column
        const count = await Card.count({
          where: { ColumnId: oldColumnId },
          transaction: t,
        });
        // clamp newOrder to [0, count-1]
        const maxIndex = Math.max(0, count - 1);
        newOrder = Math.min(newOrder, maxIndex);

        if (oldOrder === newOrder) {
          await t.commit();
          return res.status(200).json(cardToMove);
        }

        // 1) set moved card to a temporary negative order to free up its slot
        await cardToMove.update({ order: -1 }, { transaction: t });

        if (newOrder > oldOrder) {
          // moving downward: shift intermediate cards up by 1 (order = order - 1)
          await Card.update(
            { order: sequelize.literal('"order" - 1') },
            {
              where: {
                ColumnId: oldColumnId,
                order: { [Op.gt]: oldOrder, [Op.lte]: newOrder },
              },
              transaction: t,
            }
          );
        } else {
          // moving upward: shift intermediate cards down by 1 (order = order + 1)
          await Card.update(
            { order: sequelize.literal('"order" + 1') },
            {
              where: {
                ColumnId: oldColumnId,
                order: { [Op.gte]: newOrder, [Op.lt]: oldOrder },
              },
              transaction: t,
            }
          );
        }

        // 3) place moved card into the target slot
        await cardToMove.update({ order: newOrder }, { transaction: t });
      } else {
        // moving across columns
        // validate target column exists
        const targetColumn = await Column.findByPk(newColumnId, {
          transaction: t,
        });
        if (!targetColumn) {
          await t.rollback();
          return res.status(400).json({ error: "Target column not found" });
        }

        // clamp newOrder to [0, newColumnCount]
        const newColumnCount = await Card.count({
          where: { ColumnId: newColumnId },
          transaction: t,
        });
        newOrder = Math.min(Math.max(newOrder, 0), newColumnCount);

        // set moved card to temp negative order (keeps it out of the way)
        await cardToMove.update({ order: -1 }, { transaction: t, validate: false });


        // shift down all cards after the removed position in old column
        await Card.update(
          { order: sequelize.literal('"order" - 1') },
          {
            where: { ColumnId: oldColumnId, order: { [Op.gt]: oldOrder } },
            transaction: t,
          }
        );

        // shift up all cards at/after newOrder in target column to make room
        await Card.update(
          { order: sequelize.literal('"order" + 1') },
          {
            where: { ColumnId: newColumnId, order: { [Op.gte]: newOrder } },
            transaction: t,
          }
        );

        // finally move the card to the new column + order
        await cardToMove.update(
          { ColumnId: newColumnId, order: newOrder },
          { transaction: t }
        );
      }

      await t.commit();

      // emit updated board (same pattern as your other endpoints)
      const finalColumn = await Column.findByPk(
        sameColumn ? oldColumnId : newColumnId
      );
      const boardId = finalColumn.BoardId;
      const updatedBoard = await Board.findByPk(boardId, {
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
      io.to(String(boardId)).emit("board_updated", updatedBoard);

      // return the moved card (fresh)
      const moved = await Card.findByPk(id);
      res.status(200).json(moved);
    } catch (error) {
      try {
        if (t && !["commit", "rollback"].includes(t.finished))
          await t.rollback();
      } catch (r) {}
      console.error("Error moving card:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  router.delete("/:id", async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
      const card = await Card.findByPk(req.params.id, { transaction });
      if (!card) {
        await transaction.rollback();
        return res.status(404).json({ error: "Card not found" });
      }
      const { ColumnId, order: deletedOrder } = card;
      const column = await Column.findByPk(ColumnId);
      await card.destroy({ transaction });
      await Card.update(
        { order: sequelize.literal('"order" - 1') },
        { where: { ColumnId, order: { [Op.gt]: deletedOrder } }, transaction }
      );
      await transaction.commit();
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
      res.status(204).send();
    } catch (error) {
      if (
        transaction.finished !== "commit" &&
        transaction.finished !== "rollback"
      ) {
        await transaction.rollback();
      }
      console.error("Error deleting card:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}
