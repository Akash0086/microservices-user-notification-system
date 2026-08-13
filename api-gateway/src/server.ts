import "dotenv/config";
import express from "express";
import userRoutes from "./routes/user.routes.js";

const app = express();

const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "api-gateway",
  });
});

app.use("/users", userRoutes);

const server = app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});

async function gracefulShutdown(signal: string) {
  console.log(`${signal} received. Shutting down...`);

  server.close(() => {
    console.log("API Gateway shut down gracefully");

    process.exit(0);
  });
}

process.on("SIGINT", () => {
  gracefulShutdown("SIGINT");
});

process.on("SIGTERM", () => {
  gracefulShutdown("SIGTERM");
});
