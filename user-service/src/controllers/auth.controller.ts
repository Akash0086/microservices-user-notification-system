import type { Request, Response } from "express";
import { registerSchema,loginSchema } from "../services/auth.schema.js";
import { registerUser,loginUser,getUserById } from "../services/auth.service.js";

export async function register(req: Request,res: Response){
  const result = registerSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid request data",
      errors: result.error.flatten().fieldErrors,
    });
  }

  try {
    const user = await registerUser(
      result.data.name,
      result.data.email,
      result.data.password
    );

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      user,
    });
  } catch (error) {
    console.error(error);

    if (
      error instanceof Error &&
      error.message === "User already exists"
    ) {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

export async function login(req: Request,res: Response) {
  const result = loginSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid request data",
      errors: result.error.flatten().fieldErrors,
    });
  }

  try {
    const resultData = await loginUser(
      result.data.email,
      result.data.password
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      ...resultData,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Invalid email or password"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

export async function getMe(
  req: Request,
  res: Response
) {
  try {
    const userId = Number(req.headers["x-user-id"]);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID missing",
      });
    }

    const user = await getUserById(userId);

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "User not found"
    ) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}