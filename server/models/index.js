import Board from "./Board.js";
import Column from "./Column.js";
import Card from "./Card.js";

// Board has many Columns
Board.hasMany(Column, {
  foreignKey: "BoardId", // Fixed: capital B
  onDelete: "CASCADE",
  as: "Columns" // Optional alias for clarity
});

Column.belongsTo(Board, {
  foreignKey: "BoardId", // Fixed: capital B
  as: "Board" // Optional alias for clarity
});

// Column has many Cards
Column.hasMany(Card, {
  foreignKey: "ColumnId", // Fixed: capital C
  onDelete: "CASCADE",
  as: "Cards" // Optional alias for clarity
});

Card.belongsTo(Column, {
  foreignKey: "ColumnId", // Fixed: capital C
  as: "Column" // Optional alias for clarity
});

export { Board, Column, Card };