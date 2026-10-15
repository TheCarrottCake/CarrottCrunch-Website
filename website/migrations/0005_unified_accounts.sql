-- Additive account foundation; staff assignments and bootstrap history are retained.
CREATE TABLE site_users (
  discord_user_id TEXT PRIMARY KEY NOT NULL CHECK (length(discord_user_id) BETWEEN 17 AND 20 AND discord_user_id NOT GLOB '*[^0-9]*'),
  username TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar_ref TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE site_sessions (
  token_hash TEXT PRIMARY KEY NOT NULL CHECK (length(token_hash) = 64),
  discord_user_id TEXT NOT NULL REFERENCES site_users(discord_user_id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL CHECK (expires_at > created_at),
  revoked_at INTEGER
);
CREATE INDEX site_sessions_user ON site_sessions(discord_user_id);
CREATE INDEX site_sessions_expiry ON site_sessions(expires_at);
-- Legacy staff sessions do not become member sessions implicitly; require fresh OAuth.
DELETE FROM staff_sessions;
DELETE FROM staff_oauth_transactions;
DROP TRIGGER staff_access_changed;
CREATE TRIGGER staff_access_changed AFTER UPDATE OF role, active ON staff_accounts
WHEN OLD.role <> NEW.role OR OLD.active <> NEW.active
BEGIN
  UPDATE staff_accounts SET access_version = OLD.access_version + 1 WHERE discord_user_id = NEW.discord_user_id;
  DELETE FROM staff_sessions WHERE discord_user_id = NEW.discord_user_id;
  DELETE FROM site_sessions WHERE discord_user_id = NEW.discord_user_id;
END;
CREATE TRIGGER staff_access_deleted AFTER DELETE ON staff_accounts
BEGIN
  DELETE FROM site_sessions WHERE discord_user_id = OLD.discord_user_id;
END;
