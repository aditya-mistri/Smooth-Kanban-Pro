// models/Board.js
import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Board = sequelize.define("Board", {
  id: { 
    type: DataTypes.UUID, 
    defaultValue: DataTypes.UUIDV4, 
    primaryKey: true 
  },
  name: { 
    type: DataTypes.STRING, 
    allowNull: false, 
    validate: { 
      notEmpty: true,
      len: [1, 255]
    } 
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  ownerId: { 
    type: DataTypes.UUID, 
    allowNull: false, 
    field: "owner_id",
    references: {
      model: 'users',
      key: 'id'
    }
  },
  isArchived: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: "is_archived"
  }
}, {
  tableName: "boards",
  timestamps: true,
  indexes: [
    { fields: ["owner_id"] },
    { fields: ["is_archived"] }
  ],
});

export default Board;