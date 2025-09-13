// models/Invite.js
import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Invite = sequelize.define("Invite", {
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
  inviterId: { 
    type: DataTypes.UUID, 
    allowNull: false, 
    field: "inviter_id",
    references: {
      model: 'users',
      key: 'id'
    }
  },
  inviteeEmail: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { isEmail: true },
    field: "invitee_email",
  },
  status: {
    type: DataTypes.ENUM("pending", "accepted", "declined", "expired"),
    allowNull: false,
    defaultValue: "pending",
  },
  expiresAt: { 
    type: DataTypes.DATE, 
    allowNull: true, 
    field: "expires_at",
    defaultValue: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
  },
  token: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  }
}, {
  tableName: "invites",
  timestamps: true,
  indexes: [
    { unique: true, fields: ["board_id", "invitee_email"] },
    { fields: ["board_id"] },
    { fields: ["inviter_id"] },
    { fields: ["status"] },
    { fields: ["expires_at"] },
    { unique: true, fields: ["token"] }
  ],
});

export default Invite;