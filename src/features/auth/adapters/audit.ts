import { createHmac, randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";

type AuditAction =
  | "invite"
  | "revoke-invitation"
  | "revoke-member"
  | "sign-in"
  | "admission"
  | "denial"
  | "link"
  | "sign-out";

/** Who an event is about, as far as the caller knows. Never persisted verbatim. */
interface AuditIdentity {
  email?: string | undefined;
  accountId?: string | undefined;
}

interface AuditEvent {
  action: AuditAction;
  subjectId: string;
  actorId?: string | null;
  identity?: AuditIdentity;
  requestId: string;
}

type Queryable = Pick<Pool | PoolClient, "query">;

const generated = new WeakMap<object, string>();

/**
 * Keyed, non-reversible identifier that correlates events for one identity without storing
 * the email. Email wins when known; the provider account id is the fallback. The HMAC key is
 * derived from the Better Auth secret with a fixed label, so the secret itself never keys
 * two different purposes.
 */
export function actorHash(secret: string, identity: AuditIdentity): string | null {
  const email = identity.email?.trim().toLowerCase();
  const message = email
    ? `email:${email}`
    : identity.accountId
      ? `account:${identity.accountId}`
      : null;
  if (!message) return null;
  const key = createHmac("sha256", secret).update("backoffice-audit-actor-v1").digest();
  return createHmac("sha256", key).update(message).digest("hex");
}

/**
 * Server-generated correlation id for one request. An inbound `x-request-id` is client
 * controlled and is deliberately ignored. The id is stable for the lifetime of the same
 * headers object, so every hook of one request shares it.
 */
export function requestIdFrom(headers: Headers | undefined): string {
  if (!headers) return randomUUID();
  const existing = generated.get(headers);
  if (existing) return existing;
  const created = randomUUID();
  generated.set(headers, created);
  return created;
}

export function createAuditTrail(pool: Pool, secret: string) {
  const insert = async (db: Queryable, event: AuditEvent): Promise<void> => {
    await db.query(
      "INSERT INTO backoffice_access_audit(actor_id,action,subject_id,request_id,actor_hash) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING",
      [
        event.actorId ?? null,
        event.action,
        event.subjectId,
        event.requestId,
        event.identity ? actorHash(secret, event.identity) : null,
      ],
    );
  };
  return {
    requestId: requestIdFrom,
    /** Writes inside the caller's transaction; failures roll that transaction back. */
    record: insert,
    /**
     * Best effort for events that must never change an access decision (denials, sign-in,
     * link, sign-out): a failed write is logged without detail and swallowed.
     */
    async tryRecord(event: AuditEvent): Promise<void> {
      try {
        await insert(pool, event);
      } catch {
        console.error("Backoffice audit write failed.");
      }
    },
    async emailOf(userId: string): Promise<string | undefined> {
      try {
        const result = await pool.query<{ email: string }>('SELECT email FROM "user" WHERE id=$1', [
          userId,
        ]);
        return result.rows[0]?.email;
      } catch {
        console.error("Backoffice audit identity lookup failed.");
        return undefined;
      }
    },
    /** True when the user holds a second or later account, which makes a new one a link. */
    async hasFurtherAccount(userId: string): Promise<boolean> {
      try {
        const result = await pool.query<{ total: string }>(
          'SELECT count(*) AS total FROM account WHERE "userId"=$1',
          [userId],
        );
        return Number(result.rows[0]?.total ?? 0) > 1;
      } catch {
        console.error("Backoffice audit account lookup failed.");
        return false;
      }
    },
  };
}

export type AuditTrail = ReturnType<typeof createAuditTrail>;
