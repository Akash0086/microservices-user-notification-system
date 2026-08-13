import pool from "../config/database.js";

export async function hasProcessedEvent(
  eventId: string
) {
  const [rows] = await pool.execute(
    `
      SELECT event_id
      FROM processed_events
      WHERE event_id = ?
      LIMIT 1
    `,
    [eventId]
  );

  return (rows as unknown[]).length > 0;
}

export async function markEventAsProcessed(
  eventId: string
) {
  await pool.execute(
    `
      INSERT INTO processed_events (event_id)
      VALUES (?)
    `,
    [eventId]
  );
}