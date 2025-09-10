import Board from "./Board.js";
import Column from "./Column.js";
import Card from "./Card.js";

// Board has many Columns
Board.hasMany(Column, {
  foreignKey: "boardId",
  onDelete: "CASCADE",
});
Column.belongsTo(Board, {
  foreignKey: "boardId",
});

// Column has many Cards
Column.hasMany(Card, {
  foreignKey: "columnId",
  onDelete: "CASCADE",
});
Card.belongsTo(Column, {
  foreignKey: "columnId",
});

export { Board, Column, Card };
