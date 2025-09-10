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
  },
  order: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  boardId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
});

export default Column;
