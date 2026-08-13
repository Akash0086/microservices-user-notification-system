import "dotenv/config";

export const services = {
  userService: process.env.USER_SERVICE_URL || "http://localhost:3001",
};