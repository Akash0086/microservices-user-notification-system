import "dotenv/config";
import express from "express";
import {connectDB} from "./config/database.js";
import { connectNATS } from "./config/nats.js";
import authRoutes from "./routes/auth.routes.js";
import { processOutboxEvents } from "./events/outbox.publisher.js";
import { serviceAuth } from "./middleware/service-auth.middleware.js";
import { closeDB } from "./config/database.js";
import { closeNATS } from "./config/nats.js";

const app = express();

app.use(express.json());

const PORT = Number(process.env.PORT) || 3001;

async function startServer() {
  try {
    // Test MySQL connection
    await connectDB();

    // Connect to NATS
    await connectNATS();

    await processOutboxEvents();
    
    setInterval(() => {
      processOutboxEvents().catch((error) => {
      console.error("Outbox processing error:", error);
      });
    },5000);

    app.get("/health", (_req, res) => {
      res.json({
        status: "ok",
        service: "user-service",
      });
    });

    app.use("/users",serviceAuth,authRoutes);
    
    const server = app.listen(PORT, () => {
      console.log(`User Service running on port ${PORT}`);
    });
    
    async function gracefulShutdown(signal: string) {
      console.log(`${signal} received. Shutting down...`);

      server.close(async () => {
      try {
        await closeNATS();
        await closeDB();

        console.log("User Service shut down gracefully");

        process.exit(0);
      } catch(error) {
          console.error(
          "Error during shutdown:",
          error
        );

        process.exit(1);
      }
    });
  }

  process.on("SIGINT", () => {
    gracefulShutdown("SIGINT");
  });

  process.on("SIGTERM", () => {
    gracefulShutdown("SIGTERM");
  });
  } catch(error) {
      console.error("Failed to start User Service:", error);

      process.exit(1);
    }
  }

startServer();