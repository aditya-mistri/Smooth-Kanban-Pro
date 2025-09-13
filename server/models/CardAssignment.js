// models/CardAssignment.js
import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const CardAssignment = sequelize.define("CardAssignment", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  cardId: { 
    type: DataTypes.UUID, 
    allowNull: false, 
    field: "card_id",
    references: {
      model: 'cards',
      key: 'id'
    }
  },
  userId: { 
    type: DataTypes.UUID, 
    allowNull: false, 
    field: "user_id",
    references: {
      model: 'users',
      key: 'id'
    }
  },
  assignedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: "assigned_at"
  }
}, {
  tableName: "card_assignments",
  timestamps: true,
  indexes: [
    { unique: true, fields: ["card_id", "user_id"] },
    { fields: ["card_id"] },
    { fields: ["user_id"] }
  ],
});

export default CardAssignment;
