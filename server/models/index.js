import Board from "./Board.js";
import Column from "./Column.js";
import Card from "./Card.js";

// Board has many Columns
Board.hasMany(Column, {
  foreignKey: "BoardId",
  onDelete: "CASCADE",
  as: "Columns" 
});

Column.belongsTo(Board, {
  foreignKey: "BoardId", 
  as: "Board" 
});

// Column has many Cards
Column.hasMany(Card, {
  foreignKey: "ColumnId", 
  onDelete: "CASCADE",
  as: "Cards" 
});

Card.belongsTo(Column, {
  foreignKey: "ColumnId", 
  as: "Column" 
});

export { Board, Column, Card };