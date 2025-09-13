// models/CardComment.js
import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const CardComment = sequelize.define("CardComment", {
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
  comment: { 
    type: DataTypes.TEXT, 
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 2000]
    }
  },
  isEdited: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: "is_edited"
  }
}, {
  tableName: "card_comments",
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',     
  indexes: [
    { fields: ["card_id"] },
    { fields: ["user_id"] },
    { fields: ["created_at"] }
  ],
});

export default CardComment;
