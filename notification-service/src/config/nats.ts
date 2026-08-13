import "dotenv/config";

import {
  connect,
  JetStreamClient,
  NatsConnection,
} from "nats";

let nc: NatsConnection;
let js: JetStreamClient;

export async function connectNATS() {
  nc = await connect({
    servers: process.env.NATS_URL,
    user: process.env.NATS_USER,
    pass: process.env.NATS_PASSWORD,
  });
  js = nc.jetstream();

  console.log("Connected to NATS");
}

export function getNATS() {
  return nc;
}

export function getJetStream() {
  return js;
}

export async function closeNATS() {
  if (nc) {
    await nc.drain();
    await nc.close();

    console.log("NATS connection closed");
  }
}