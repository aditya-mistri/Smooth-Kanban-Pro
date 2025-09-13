import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const User = sequelize.define("User", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { 
      notEmpty: true, 
      len: [1, 255] 
    },
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
  password_hash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM("admin", "member"),
    allowNull: false,
    defaultValue: "member",
  },
}, {
  tableName: "users",
  timestamps: true,
  indexes: [
    { unique: true, fields: ["email"] }
  ],
});

export default User;
