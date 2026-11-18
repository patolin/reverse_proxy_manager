CREATE TABLE admin_sessions (
  session_hash TEXT PRIMARY KEY,
  admin_user_id INTEGER NOT NULL REFERENCES admin_users (id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX admin_sessions_expires_at_idx ON admin_sessions (expires_at);
