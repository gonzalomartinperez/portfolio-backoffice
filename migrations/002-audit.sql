-- Append-only security audit trail. Applied after 001-access.sql in the same transaction.
-- Rows hold no email, token, IP address or user agent: actor_hash is a keyed HMAC-SHA256
-- digest computed by the application, request_id is a server-generated correlation id.
-- Every step is a no-op when already applied, so re-running takes no needless rewrites.
ALTER TABLE backoffice_access_audit ADD COLUMN IF NOT EXISTS request_id text;
ALTER TABLE backoffice_access_audit ADD COLUMN IF NOT EXISTS actor_hash text;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'backoffice_access_audit'::regclass AND attname = 'actor_id' AND attnotnull
  ) THEN
    ALTER TABLE backoffice_access_audit ALTER COLUMN actor_id DROP NOT NULL;
  END IF;
  -- 001 created an unnamed action CHECK limited to the three owner actions.
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'backoffice_access_audit'::regclass
      AND conname = 'backoffice_access_audit_action_check'
  ) THEN
    ALTER TABLE backoffice_access_audit DROP CONSTRAINT backoffice_access_audit_action_check;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'backoffice_access_audit'::regclass
      AND conname = 'backoffice_access_audit_action_v2'
  ) THEN
    ALTER TABLE backoffice_access_audit ADD CONSTRAINT backoffice_access_audit_action_v2 CHECK (
      action IN ('invite', 'revoke-invitation', 'revoke-member',
                 'sign-in', 'admission', 'denial', 'link', 'sign-out')
    );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'backoffice_access_audit'::regclass
      AND conname = 'backoffice_access_audit_actor_present'
  ) THEN
    ALTER TABLE backoffice_access_audit ADD CONSTRAINT backoffice_access_audit_actor_present CHECK (
      actor_id IS NOT NULL OR actor_hash IS NOT NULL
    );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'backoffice_access_audit'::regclass
      AND conname = 'backoffice_access_audit_actor_hash_format'
  ) THEN
    ALTER TABLE backoffice_access_audit ADD CONSTRAINT backoffice_access_audit_actor_hash_format CHECK (
      actor_hash IS NULL OR actor_hash ~ '^[a-f0-9]{64}$'
    );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'backoffice_access_audit'::regclass
      AND conname = 'backoffice_access_audit_request_id_format'
  ) THEN
    ALTER TABLE backoffice_access_audit ADD CONSTRAINT backoffice_access_audit_request_id_format CHECK (
      request_id IS NULL OR request_id ~ '^[A-Za-z0-9-]{8,64}$'
    );
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS backoffice_access_audit_actor_hash
  ON backoffice_access_audit(actor_hash) WHERE actor_hash IS NOT NULL;
-- One sign-out row per session even when sign-out requests race (subject_id is the session id).
CREATE UNIQUE INDEX IF NOT EXISTS backoffice_access_audit_sign_out_once
  ON backoffice_access_audit(subject_id) WHERE action = 'sign-out';

-- Defence in depth beside the INSERT,SELECT-only runtime grant: no role may rewrite history
-- row by row. TRUNCATE is not a row operation and stays an owner-only maintenance action.
CREATE OR REPLACE FUNCTION backoffice_access_audit_append_only() RETURNS trigger
  LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog AS $$
BEGIN
  RAISE EXCEPTION 'backoffice_access_audit is append-only' USING ERRCODE = 'insufficient_privilege';
END $$;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'backoffice_access_audit'::regclass
      AND tgname = 'backoffice_access_audit_append_only' AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER backoffice_access_audit_append_only
      BEFORE UPDATE OR DELETE ON backoffice_access_audit
      FOR EACH ROW EXECUTE FUNCTION backoffice_access_audit_append_only();
  END IF;
END $$;
