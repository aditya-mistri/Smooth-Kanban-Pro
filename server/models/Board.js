import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Board = sequelize.define("Board", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

export default Board;
