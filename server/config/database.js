import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

console.log("Database URL:", process.env.DATABASE_URL);

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
  pool: {
    max: 10,
    min: 0,
    idle: 10000,
  },
  keepAlive: true,
});

export default sequelize;
