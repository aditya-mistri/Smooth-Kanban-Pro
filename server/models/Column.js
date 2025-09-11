import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Column = sequelize.define("Column", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 255]
    }
  },
  order: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  BoardId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'board_id' // Database column name
  },
}, {
  tableName: 'columns',
  timestamps: true,
  indexes: [
    {
      fields: ['board_id', 'order'], // Use database column names, not model attribute names
      unique: true
    }
  ]
});

export default Column;