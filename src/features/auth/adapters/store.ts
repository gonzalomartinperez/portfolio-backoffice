import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import type { AccessManagementPort } from "../application/manage-access.ts";
import type { Access, AccessUser, RevocationKind } from "../domain/access.ts";
import type { AuditTrail } from "./audit.ts";

const digest = (token: string) => createHash("sha256").update(token).digest("hex");

async function lockOwner(client: PoolClient, actorId: string): Promise<string> {
  const actor = await client.query<{ email: string }>(
    "SELECT u.email FROM backoffice_member m JOIN \"user\" u ON u.id=m.user_id WHERE m.user_id=$1 AND m.role='owner' AND m.revoked_at IS NULL FOR UPDATE OF m",
    [actorId],
  );
  if (actor.rowCount !== 1 || !actor.rows[0]) throw new Error("Access denied");
  return actor.rows[0].email;
}

/** Returns the database identifier that was revoked, or undefined for an unknown invitation. */
async function applyRevocation(
  client: PoolClient,
  subjectId: string,
  kind: RevocationKind,
): Promise<string | undefined> {
  if (kind === "invitation") {
    const result = await client.query<{ id: string }>(
      "UPDATE backoffice_invitation SET revoked_at=now() WHERE id=$1 RETURNING id",
      [subjectId],
    );
    return result.rows[0]?.id;
  }
  const result = await client.query<{ user_id: string }>(
    "UPDATE backoffice_member SET revoked_at=now() WHERE user_id=$1 AND role='viewer' RETURNING user_id",
    [subjectId],
  );
  if (result.rowCount !== 1) throw new Error("Member cannot be revoked");
  await client.query('DELETE FROM session WHERE "userId"=$1', [subjectId]);
  return result.rows[0]?.user_id;
}

export function createAccessStore(pool: Pool, ownerEmail: string, audit: AuditTrail) {
  async function admitInTransaction(
    userId: string,
    token: string | null,
    requestId: string,
  ): Promise<boolean> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const user = await client.query<{
        email: string;
        emailVerified: boolean;
      }>('SELECT email, "emailVerified" FROM "user" WHERE id=$1 FOR UPDATE', [userId]);
      const identity = user.rows[0];
      if (!identity?.emailVerified) {
        await client.query("ROLLBACK");
        return false;
      }
      const existing = await client.query<{
        role: string;
        revoked_at: Date | null;
      }>("SELECT role, revoked_at FROM backoffice_member WHERE user_id=$1", [userId]);
      if (existing.rows[0] && !existing.rows[0].revoked_at) {
        await client.query("COMMIT");
        return true;
      }
      const isOwner = identity.email.toLowerCase() === ownerEmail;
      if (!isOwner) {
        if (!token) {
          await client.query("ROLLBACK");
          return false;
        }
        const invite = await client.query(
          "UPDATE backoffice_invitation SET consumed_at=now() WHERE token_hash=$1 AND email=$2 AND expires_at>now() AND consumed_at IS NULL AND revoked_at IS NULL RETURNING id",
          [digest(token), identity.email.toLowerCase()],
        );
        if (invite.rowCount !== 1) {
          await client.query("ROLLBACK");
          return false;
        }
      }
      await client.query(
        "INSERT INTO backoffice_member(user_id,role) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET role=EXCLUDED.role,revoked_at=NULL",
        [userId, isOwner ? "owner" : "viewer"],
      );
      await audit.record(client, {
        action: "admission",
        subjectId: userId,
        actorId: userId,
        identity: { email: identity.email },
        requestId,
      });
      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  const store = {
    async mayRegister(
      email: string,
      verified: boolean,
      token: string | null,
      requestId = audit.requestId(undefined),
    ): Promise<boolean> {
      const allowed = await (async () => {
        if (!verified) return false;
        if (email.toLowerCase() === ownerEmail) return true;
        if (!token) return false;
        const result = await pool.query(
          "SELECT id FROM backoffice_invitation WHERE token_hash=$1 AND email=$2 AND expires_at>now() AND consumed_at IS NULL AND revoked_at IS NULL",
          [digest(token), email.toLowerCase()],
        );
        return result.rowCount === 1;
      })();
      // The same generic refusal is returned whatever the reason; only the audit row differs.
      if (!allowed)
        await audit.tryRecord({
          action: "denial",
          subjectId: "registration",
          identity: { email },
          requestId,
        });
      return allowed;
    },
    async admit(
      userId: string,
      token: string | null,
      requestId = audit.requestId(undefined),
    ): Promise<boolean> {
      const admitted = await admitInTransaction(userId, token, requestId);
      if (!admitted)
        await audit.tryRecord({
          action: "denial",
          subjectId: "session",
          actorId: userId,
          identity: { email: await audit.emailOf(userId) },
          requestId,
        });
      return admitted;
    },
    async access(user: AccessUser): Promise<Access | null> {
      const result = await pool.query<{ role: unknown }>(
        "SELECT role FROM backoffice_member WHERE user_id=$1 AND revoked_at IS NULL",
        [user.id],
      );
      const role = result.rows[0]?.role;
      return role === "owner" || role === "viewer" ? { user, role } : null;
    },
    async invite(
      actorId: string,
      email: string,
      requestId = audit.requestId(undefined),
    ): Promise<string> {
      const token = randomBytes(32).toString("hex");
      const id = randomUUID();
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const actorEmail = await lockOwner(client, actorId);
        await client.query(
          "INSERT INTO backoffice_invitation(id,email,token_hash,created_by,expires_at) VALUES($1,$2,$3,$4,now()+interval '48 hours')",
          [id, email.toLowerCase(), digest(token), actorId],
        );
        await audit.record(client, {
          action: "invite",
          subjectId: id,
          actorId,
          identity: { email: actorEmail },
          requestId,
        });
        await client.query("COMMIT");
        return token;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
    async revoke(
      actorId: string,
      subjectId: string,
      kind: RevocationKind,
      requestId = audit.requestId(undefined),
    ): Promise<void> {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const actorEmail = await lockOwner(client, actorId);
        // Audit only identifiers returned by the database, never the submitted text. An
        // unknown invitation id keeps the previous silent outcome but leaves no audit row.
        const revokedId = await applyRevocation(client, subjectId, kind);
        if (revokedId)
          await audit.record(client, {
            action: kind === "member" ? "revoke-member" : "revoke-invitation",
            subjectId: revokedId,
            actorId,
            identity: { email: actorEmail },
            requestId,
          });
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
    async list() {
      const [members, invitations] = await Promise.all([
        pool.query<{
          id: string;
          email: string;
          role: string;
          revoked_at: Date | null;
        }>(
          'SELECT u.id,u.email,m.role,m.revoked_at FROM backoffice_member m JOIN "user" u ON u.id=m.user_id ORDER BY m.created_at',
        ),
        pool.query<{
          id: string;
          email: string;
          expires_at: Date;
          consumed_at: Date | null;
          revoked_at: Date | null;
        }>(
          "SELECT id,email,expires_at,consumed_at,revoked_at FROM backoffice_invitation ORDER BY created_at DESC LIMIT 100",
        ),
      ]);
      return { members: members.rows, invitations: invitations.rows };
    },
  };
  return store satisfies AccessManagementPort;
}
