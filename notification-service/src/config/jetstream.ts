import {
  AckPolicy,
  ConsumerConfig,
  StreamConfig,
} from "nats";

import { getNATS } from "./nats.js";

export async function ensureJetStream() {
  const nc = getNATS();

  const jsm = await nc.jetstreamManager();

  // Ensure USER_EVENTS stream exists
  try {
    await jsm.streams.info("USER_EVENTS");

    console.log("USER_EVENTS stream already exists");
  } catch {
    await jsm.streams.add({
      name: "USER_EVENTS",
      subjects: ["user.created"],
    });

    console.log("USER_EVENTS stream created");
  }

  // Ensure notification-service consumer exists
  try {
    await jsm.consumers.info(
      "USER_EVENTS",
      "notification-service"
    );

    console.log(
      "notification-service consumer already exists"
    );
  } catch {
    await jsm.consumers.add("USER_EVENTS", {
      durable_name: "notification-service",
      ack_policy: AckPolicy.Explicit,
      max_deliver: 5,
    });

    console.log(
      "notification-service consumer created"
    );
  }
}