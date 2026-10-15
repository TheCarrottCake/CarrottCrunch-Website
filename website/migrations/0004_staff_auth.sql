-- No staff identities or credentials are seeded by migrations.
CREATE TABLE staff_accounts (
  discord_user_id TEXT PRIMARY KEY NOT NULL CHECK (length(discord_user_id) BETWEEN 17 AND 20 AND discord_user_id NOT GLOB '*[^0-9]*'),
  role TEXT NOT NULL CHECK (role IN ('Moderator', 'Administrator', 'Owner')),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  access_version INTEGER NOT NULL DEFAULT 1 CHECK (access_version > 0),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE staff_bootstrap (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  initial_owner_id TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE staff_sessions (
  token_hash TEXT PRIMARY KEY NOT NULL CHECK (length(token_hash) = 64),
  discord_user_id TEXT NOT NULL REFERENCES staff_accounts(discord_user_id) ON DELETE CASCADE,
  access_version INTEGER NOT NULL,
  username TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL CHECK (expires_at > created_at),
  revoked_at INTEGER
);
CREATE INDEX staff_sessions_account ON staff_sessions(discord_user_id);
CREATE INDEX staff_sessions_expiry ON staff_sessions(expires_at);
CREATE TABLE staff_oauth_transactions (
  state_hash TEXT PRIMARY KEY NOT NULL CHECK (length(state_hash) = 64),
  browser_hash TEXT NOT NULL CHECK (length(browser_hash) = 64),
  verifier TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL CHECK (expires_at > created_at)
);
CREATE INDEX staff_oauth_expiry ON staff_oauth_transactions(expires_at);
CREATE INDEX staff_oauth_browser ON staff_oauth_transactions(browser_hash);
-- Role changes and disable/re-enable cycles invalidate all previous sessions.
CREATE TRIGGER staff_access_changed AFTER UPDATE OF role, active ON staff_accounts
WHEN OLD.role <> NEW.role OR OLD.active <> NEW.active
BEGIN
  UPDATE staff_accounts SET access_version = OLD.access_version + 1 WHERE discord_user_id = NEW.discord_user_id;
  DELETE FROM staff_sessions WHERE discord_user_id = NEW.discord_user_id;
END;
