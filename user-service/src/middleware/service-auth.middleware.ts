import type { Request, Response, NextFunction } from "express";

export function serviceAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const serviceToken = req.headers["x-service-token"];

  if (
    !serviceToken ||
    serviceToken !== process.env.SERVICE_TOKEN
  ) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized service",
    });
  }

  next();
}