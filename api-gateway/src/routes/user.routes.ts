import { Router } from "express";
import axios from "axios";

import { services } from "../config/services.js";
import { authenticate,AuthenticatedRequest } from "../middleware/auth.middleware.js";
const router = Router();

router.post("/register", async (req, res) => {
  try {
    const response = await axios.post(
      `${services.userService}/users/register`,
      req.body,
      {
        headers: {
          "X-Service-Token": process.env.SERVICE_TOKEN,
        },
      }
    );

    return res
      .status(response.status)
      .json(response.data);

  } catch (error) {
    if (axios.isAxiosError(error)) {
      return res
        .status(error.response?.status || 500)
        .json(
          error.response?.data || {
            success: false,
            message: "User Service unavailable",
          }
        );
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});


router.post("/login", async (req, res) => {
  try {
    
    const response = await axios.post(
      `${services.userService}/users/login`,
      req.body,
      {
        headers: {
          "X-Service-Token": process.env.SERVICE_TOKEN,
        },
      }
    );

    return res
      .status(response.status)
      .json(response.data);

  } catch (error) {
    if (axios.isAxiosError(error)) {
      return res
        .status(error.response?.status || 500)
        .json(
          error.response?.data || {
            success: false,
            message: "User Service unavailable",
          }
        );
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

router.get(
  "/me",
  authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const response = await axios.get(
        `${services.userService}/users/me`,
        {
          headers: {
            "X-Service-Token":
              process.env.SERVICE_TOKEN,

            "X-User-Id":
              String(req.user!.userId),
          },
        }
      );

      return res
        .status(response.status)
        .json(response.data);

    } catch (error) {
      if (axios.isAxiosError(error)) {
        return res
          .status(error.response?.status || 500)
          .json(
            error.response?.data || {
              success: false,
              message: "User Service unavailable",
            }
          );
      }

      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

export default router;