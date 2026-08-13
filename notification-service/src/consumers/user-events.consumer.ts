import { JSONCodec } from "nats";
import { getJetStream } from "../config/nats.js";
import { userCreatedEventSchema } from "../services/event.schema.js";
import {
  hasProcessedEvent,
  markEventAsProcessed,
} from "../models/processed-event.model.js";

const jc = JSONCodec();

let consumerMessages: any = null;

export async function startUserEventsConsumer() {
  const js = getJetStream();

  const consumer = await js.consumers.get(
    "USER_EVENTS",
    "notification-service"
  );

  console.log(
    "Connected to notification-service consumer"
  );

  consumerMessages = await consumer.consume();

  for await (const message of consumerMessages) {
    try {
      const rawEvent = jc.decode(message.data);

      const result =
        userCreatedEventSchema.safeParse(rawEvent);

      if (!result.success) {
        console.error(
          "Invalid user.created event:",
          result.error.flatten()
        );

        message.term();

        continue;
      }

      const event = result.data;

      const alreadyProcessed =
        await hasProcessedEvent(event.eventId);

      if (alreadyProcessed) {
        console.log(
          `Event ${event.eventId} already processed`
        );

        message.ack();

        continue;
      }

      console.log(
        `New user created: ${event.data.email}`
      );

      await markEventAsProcessed(event.eventId);

      message.ack();

    } catch (error) {
      console.error(
        "Failed to process message:",
        error
      );
    }
  }
}

export async function stopUserEventsConsumer() {
  if (consumerMessages) {
    consumerMessages.stop();

    console.log(
      "Notification consumer stopped"
    );
  }
}