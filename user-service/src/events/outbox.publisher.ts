import { JSONCodec } from "nats";

import {getPendingOutboxEvents,markEventAsPublished} from "../models/outbox.model.js";

import { getJetStream } from "../config/nats.js";

const jc = JSONCodec();

export async function processOutboxEvents() {
  const events = await getPendingOutboxEvents();

  for (const event of events) {
    try {
      const js = getJetStream();

      await js.publish(
        event.event_type,
        jc.encode({
          eventId: event.event_id,
          eventType: event.event_type,
          data: event.payload,
        })
      );

      await markEventAsPublished(event.id);

      console.log(
        `Published outbox event: ${event.event_id}`
      );
    } catch (error) {
      console.error(
        `Failed to publish event ${event.event_id}:`,
        error
      );
    }
  }
}