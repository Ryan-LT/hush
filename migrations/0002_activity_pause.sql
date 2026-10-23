-- Timed pauses: autopilot turns itself back on at resume_at
ALTER TABLE users ADD COLUMN resume_at INTEGER;

-- What Hush did, for the dashboard's activity log (pruned after 14 days)
CREATE TABLE activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  at INTEGER NOT NULL,
  kind TEXT NOT NULL,          -- push | error | pause | resume
  trigger TEXT NOT NULL,       -- auto | manual
  label TEXT NOT NULL,
  emoji TEXT,
  text TEXT,
  detail TEXT
);

CREATE INDEX activity_user ON activity (user_id, at);
CREATE INDEX activity_at ON activity (at);

-- Custom emoji per workspace, cached from Slack's emoji.list
CREATE TABLE team_emoji (
  team_id TEXT PRIMARY KEY,
  emoji_json TEXT NOT NULL,
  fetched_at INTEGER NOT NULL
);
