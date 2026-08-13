import type { PoolConnection,ResultSetHeader,RowDataPacket } from "mysql2/promise";
import pool from "../config/database.js";

export interface OutboxEvent extends RowDataPacket {
  id: number;
  event_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  status: "pending" | "published";
  created_at: Date;
  published_at: Date | null;
}

export async function createOutboxEvent(
  connection: PoolConnection,
  eventId: string,
  eventType: string,
  payload: object
) {
  const [result] = await connection.execute<ResultSetHeader>(
    `
      INSERT INTO outbox_events
      (event_id, event_type, payload)
      VALUES (?, ?, ?)
    `,
    [eventId,eventType,JSON.stringify(payload),]
  );

  return result;
}

export async function getPendingOutboxEvents() {
  const [rows] = await pool.execute<OutboxEvent[]>(
    `
      SELECT *
      FROM outbox_events
      WHERE status = 'pending'
      ORDER BY id ASC
      LIMIT 10
    `
  );

  return rows;
}

export async function markEventAsPublished(id: number){
  await pool.execute(
    `
      UPDATE outbox_events
      SET status = 'published',
          published_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [id]
  );
}