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
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  columnId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
});

export default Card;
