import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Card = sequelize.define("Card", {
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
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  order: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  ColumnId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'column_id' // Database column name
  },
}, {
  tableName: 'cards',
  timestamps: true,
  indexes: [
    {
      fields: ['column_id', 'order'], // Use database column names, not model attribute names
      unique: true
    }
  ]
});

export default Card;