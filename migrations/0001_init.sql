-- One row per Slack user (per workspace)
CREATE TABLE users (
  id TEXT PRIMARY KEY,                 -- "<team_id>:<user_id>"
  slack_team_id TEXT NOT NULL,
  slack_user_id TEXT NOT NULL,
  team_name TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT NOT NULL DEFAULT '',
  token_enc TEXT NOT NULL,             -- AES-GCM encrypted Slack user token
  settings_json TEXT NOT NULL,
  applied_json TEXT,                   -- last state pushed to Slack
  paused INTEGER NOT NULL DEFAULT 1,   -- new users start paused until they turn autopilot on
  next_check_at INTEGER,               -- when the cron should next look at this user
  last_sync_at INTEGER,
  last_error TEXT,
  sessions_valid_after INTEGER NOT NULL DEFAULT 0, -- sessions issued before this are rejected (sign out)
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX users_due ON users (paused, next_check_at);

CREATE TABLE overrides (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  state_json TEXT NOT NULL,
  start_at INTEGER NOT NULL,
  end_at INTEGER,                      -- NULL = until cleared
  created_at INTEGER NOT NULL
);

CREATE INDEX overrides_user ON overrides (user_id, end_at);

-- Connected calendar accounts (Google)
CREATE TABLE calendar_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  email TEXT NOT NULL,
  refresh_token_enc TEXT NOT NULL,
  access_token_enc TEXT,
  access_expires_at INTEGER,
  calendars_json TEXT NOT NULL DEFAULT '[]',
  events_json TEXT NOT NULL DEFAULT '[]', -- busy events from yesterday to a week ahead
  fetched_at INTEGER,
  error TEXT,
  created_at INTEGER NOT NULL,
  UNIQUE (user_id, provider, email)
);

CREATE INDEX calendar_accounts_fetch ON calendar_accounts (fetched_at);
