-- =============================================================================
-- 001: refresh token rotation
--
-- For a database created before refresh_tokens existed. A fresh
-- `npm run db:setup` already includes this table; running this file against
-- such a database is a no-op.
-- =============================================================================

CREATE TABLE IF NOT EXISTS refresh_tokens (
  jti           CHAR(36)        NOT NULL,
  user_id       BIGINT UNSIGNED NOT NULL,
  expires_at    DATETIME        NOT NULL,
  revoked_at    DATETIME        NULL,
  replaced_by   CHAR(36)        NULL,
  created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (jti),
  KEY idx_refresh_tokens_user (user_id, revoked_at),

  CONSTRAINT fk_refresh_tokens_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
