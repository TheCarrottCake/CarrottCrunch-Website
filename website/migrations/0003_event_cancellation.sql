-- Cancellation does not unpublish an event: visitors should see the cancellation.
ALTER TABLE events ADD COLUMN event_state TEXT NOT NULL DEFAULT 'active'
  CHECK (event_state IN ('active', 'cancelled'));
CREATE INDEX events_state_start ON events(event_state, starts_at, content_id);
