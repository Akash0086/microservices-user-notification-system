USE notification_db;

CREATE TABLE IF NOT EXISTS processed_events (
    event_id CHAR(36) PRIMARY KEY,
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);