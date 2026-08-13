import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import pool from "../config/database.js";
import {createUser,findUserByEmail,findUserById} from "../models/user.model.js";
import { createOutboxEvent } from "../models/outbox.model.js";
import jwt from "jsonwebtoken";

export async function registerUser(
  name: string,
  email: string,
  password: string
){
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const existingUser = await findUserByEmail(connection,email);

    if (existingUser) {
      throw new Error("User already exists");
    }

    const hashedPassword = await bcrypt.hash(password,12);

    const result = await createUser(connection,name,email,hashedPassword);

    const userId = result.insertId;

    const eventId = randomUUID();

    await createOutboxEvent(connection,eventId,"user.created",{
        userId,
        name,
        email,
      }
    );

    await connection.commit();

    return {id: userId,name,email,};
  }catch (error) {
    await connection.rollback();

    throw error;
  } finally {
    connection.release();
  }
}

export async function loginUser(email: string,password: string) {
  const connection = await pool.getConnection();

  try {
    const user = await findUserByEmail(connection,email);

    if (!user) {
      throw new Error("Invalid email or password");
    }

    const passwordMatch = await bcrypt.compare(password,user.password
    );

    if (!passwordMatch) {
      throw new Error("Invalid email or password");
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
      },
      process.env.JWT_SECRET!,
      {
        expiresIn: "1h",
      }
    );

    return {token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    };
  } finally {
    connection.release();
  }
}

export async function getUserById(id: number) {
  const connection = await pool.getConnection();

  try {
    const user = await findUserById(connection, id);

    if (!user) {
      throw new Error("User not found");
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      created_at: user.created_at,
    };
  } finally {
    connection.release();
  }
}