-- 004 — Session timeouts (inactivity + absolute limit)
--
-- last_seen_at         last time the user did something (a request from a click, or the browser's activity
--                      heartbeat). A session idle for longer than SESSION_IDLE_MINUTES is ended.
-- absolute_expires_at  hard end of the sign-in, whatever the activity (12 h users / 8 h admins by default).
--                      Carried over unchanged when the refresh token rotates, so refreshing never extends it.
-- end_reason           why the session ended: rotated | logout | logout_all | password_reset | idle |
--                      absolute | reuse | suspended | password_change. Only 'rotated' and 'logout' sessions trigger refresh-token
--                      reuse detection, so replaying a cookie from a timed-out session does not sign out other devices.
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_seen_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS absolute_expires_at timestamptz;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS end_reason text;
UPDATE sessions SET absolute_expires_at = expires_at WHERE absolute_expires_at IS NULL;
ALTER TABLE sessions ALTER COLUMN absolute_expires_at SET NOT NULL;
CREATE INDEX IF NOT EXISTS sessions_user_open_idx ON sessions (user_id) WHERE revoked_at IS NULL;
