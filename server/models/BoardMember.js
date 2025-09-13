// models/BoardMember.js
import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const BoardMember = sequelize.define("BoardMember", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  boardId: { 
    type: DataTypes.UUID, 
    allowNull: false, 
    field: "board_id",
    references: {
      model: 'boards',
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
  role: {
    type: DataTypes.ENUM("admin", "member"),
    allowNull: false,
    defaultValue: "member",
  },
  status: {
    type: DataTypes.ENUM("pending", "accepted", "declined"),
    allowNull: false,
    defaultValue: "pending",
  },
  joinedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: "joined_at"
  }
}, {
  tableName: "board_members",
  timestamps: true,
  indexes: [
    { unique: true, fields: ["board_id", "user_id"] },
    { fields: ["board_id"] },
    { fields: ["user_id"] },
    { fields: ["status"] }
  ],
});

export default BoardMember;
