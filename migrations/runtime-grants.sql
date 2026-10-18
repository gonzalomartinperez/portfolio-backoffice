-- Apply only after the official Better Auth and repository IAM migrations.
-- Cluster provisioning owns roles/secrets; application startup never runs this file.
DO $$ BEGIN
  IF current_database()<>'portfolio_iam' OR NOT EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname='portfolio_iam_runtime'
      AND NOT (rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls OR rolinherit)
      AND NOT EXISTS (SELECT 1 FROM pg_auth_members WHERE member=pg_roles.oid)
  ) THEN
    RAISE EXCEPTION 'restricted project IAM identity is required';
  END IF;
END $$;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO portfolio_iam_runtime;
GRANT SELECT,INSERT,UPDATE,DELETE ON "user",session,account,verification,"rateLimit",
  backoffice_member,backoffice_invitation,backoffice_access_audit TO portfolio_iam_runtime;
GRANT USAGE ON SEQUENCE backoffice_access_audit_id_seq TO portfolio_iam_runtime;
