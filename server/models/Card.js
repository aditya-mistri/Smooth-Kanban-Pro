// models/Card.js
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
    validate: { min: 0 }
  },
  priority: {
    type: DataTypes.ENUM("low", "medium", "high", "urgent"),
    allowNull: false,
    defaultValue: "medium"
  },
  status: {
    type: DataTypes.ENUM("todo", "in_progress", "review", "done"),
    allowNull: false,
    defaultValue: "todo"
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: "due_date"
  },
  columnId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'column_id',
    references: {
      model: 'columns',
      key: 'id'
    }
  },
}, {
  tableName: 'cards',
  timestamps: true,
  indexes: [
    { fields: ['column_id'] },
    { unique: true, fields: ['column_id', 'order'] },
    { fields: ['status'] },
    { fields: ['priority'] },
    { fields: ['due_date'] }
  ]
});

export default Card;
