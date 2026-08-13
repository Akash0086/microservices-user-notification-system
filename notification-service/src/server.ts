import { connectDB, closeDB } from "./config/database.js";
import {
  connectNATS,
  closeNATS,
} from "./config/nats.js";

import { ensureJetStream } from "./config/jetstream.js";

import {
  startUserEventsConsumer,
  stopUserEventsConsumer,
} from "./consumers/user-events.consumer.js";


async function startServer() {
  try {
    await connectDB();

    await connectNATS();

    await ensureJetStream();

    await startUserEventsConsumer();

  } catch (error) {
    console.error(
      "Failed to start Notification Service:",
      error
    );

    process.exit(1);
  }
}


async function gracefulShutdown(signal: string) {
  console.log(
    `${signal} received. Shutting down...`
  );

  try {
    await stopUserEventsConsumer();

    await closeNATS();

    await closeDB();

    console.log(
      "Notification Service shut down gracefully"
    );

    process.exit(0);

  } catch (error) {
    console.error(
      "Error during shutdown:",
      error
    );

    process.exit(1);
  }
}


process.on("SIGINT", () => {
  gracefulShutdown("SIGINT");
});

process.on("SIGTERM", () => {
  gracefulShutdown("SIGTERM");
});


startServer();