import "dotenv/config";
import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

export async function connectDB() {
  const connection = await pool.getConnection();

  console.log("Connected to Notification MySQL");

  connection.release();
}

export async function closeDB() {
  await pool.end();

  console.log("Notification MySQL connection pool closed");
}

export default pool;