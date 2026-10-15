-- Times are integer UTC milliseconds. IDs are application-generated UUIDs.
CREATE TABLE content_items (
  id TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('announcement', 'event')),
  slug TEXT NOT NULL UNIQUE CHECK (length(slug) > 0),
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  body_text TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'draft' CHECK (state IN ('draft', 'review', 'scheduled', 'published', 'archived')),
  is_fixture INTEGER NOT NULL DEFAULT 0 CHECK (is_fixture IN (0, 1)),
  created_at INTEGER NOT NULL CHECK (typeof(created_at) = 'integer' AND created_at >= 0),
  updated_at INTEGER NOT NULL CHECK (typeof(updated_at) = 'integer' AND updated_at >= created_at),
  published_at INTEGER CHECK (published_at IS NULL OR (typeof(published_at) = 'integer' AND published_at >= 0)),
  CHECK (state NOT IN ('scheduled', 'published') OR published_at IS NOT NULL),
  UNIQUE (id, kind)
);
CREATE TABLE announcements (
  content_id TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL DEFAULT 'announcement' CHECK (kind = 'announcement'),
  FOREIGN KEY (content_id, kind) REFERENCES content_items(id, kind) ON DELETE RESTRICT
);
CREATE TABLE events (
  content_id TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL DEFAULT 'event' CHECK (kind = 'event'),
  starts_at INTEGER NOT NULL CHECK (typeof(starts_at) = 'integer' AND starts_at >= 0),
  ends_at INTEGER NOT NULL CHECK (typeof(ends_at) = 'integer' AND ends_at > starts_at),
  timezone TEXT NOT NULL CHECK (length(trim(timezone)) > 0),
  FOREIGN KEY (content_id, kind) REFERENCES content_items(id, kind) ON DELETE RESTRICT
);
CREATE INDEX content_publication ON content_items(kind, state, is_fixture, published_at DESC, id);
CREATE INDEX events_start ON events(starts_at, content_id);

CREATE TABLE content_revisions (
  id TEXT PRIMARY KEY NOT NULL,
  content_id TEXT NOT NULL REFERENCES content_items(id) ON DELETE RESTRICT,
  revision INTEGER NOT NULL CHECK (revision > 0),
  snapshot_json TEXT NOT NULL CHECK (json_valid(snapshot_json) AND json_type(snapshot_json) = 'object'),
  actor_id TEXT NOT NULL CHECK (length(trim(actor_id)) > 0),
  created_at INTEGER NOT NULL CHECK (typeof(created_at) = 'integer' AND created_at >= 0),
  UNIQUE(content_id, revision)
);
CREATE TABLE audit_records (
  id TEXT PRIMARY KEY NOT NULL,
  content_id TEXT REFERENCES content_items(id) ON DELETE RESTRICT,
  actor_id TEXT NOT NULL CHECK (length(trim(actor_id)) > 0),
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'state_changed')),
  details_json TEXT NOT NULL CHECK (json_valid(details_json) AND json_type(details_json) = 'object'),
  created_at INTEGER NOT NULL CHECK (typeof(created_at) = 'integer' AND created_at >= 0)
);
CREATE INDEX audit_content_time ON audit_records(content_id, created_at DESC);
CREATE INDEX audit_time ON audit_records(created_at DESC);
