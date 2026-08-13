import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";

export interface User extends RowDataPacket {
  id: number;
  name: string;
  email: string;
  password: string;
  created_at: Date;
}

export async function findUserByEmail(
  connection: PoolConnection,
  email: string
) {
  const [rows] = await connection.execute<User[]>(
    "SELECT id, name, email, password, created_at FROM users WHERE email = ?",
    [email]
  );

  return rows[0];
}

export async function createUser(
  connection: PoolConnection,
  name: string,
  email: string,
  password: string
) {
  const [result] = await connection.execute<ResultSetHeader>(
    "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
    [name, email, password]
  );

  return result;
}

export async function findUserById(
  connection: PoolConnection,
  id: number
) {
  const [rows] = await connection.execute<User[]>(
    `
      SELECT id, name, email, created_at
      FROM users
      WHERE id = ?
    `,
    [id]
  );

  return rows[0];
}