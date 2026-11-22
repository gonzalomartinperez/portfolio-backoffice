import { type Access, type RevocationKind, validEmail } from "../domain/access.ts";

export interface AccessManagementPort {
  // Adapters must recheck live owner membership atomically with each write.
  // `requestId` is an opaque correlation token for the audit trail.
  invite(actorId: string, email: string, requestId?: string): Promise<string>;
  revoke(
    actorId: string,
    subjectId: string,
    kind: RevocationKind,
    requestId?: string,
  ): Promise<void>;
}

export type InvitationResult =
  | { status: "created"; token: string }
  | {
      status: "rejected";
      reason: "forbidden" | "invalid-email" | "unavailable";
    };

export async function inviteViewer(
  actor: Access,
  email: unknown,
  port: AccessManagementPort,
  requestId?: string,
): Promise<InvitationResult> {
  if (actor.role !== "owner") return { status: "rejected", reason: "forbidden" };
  if (typeof email !== "string" || !validEmail(email.trim()))
    return { status: "rejected", reason: "invalid-email" };
  try {
    const token = await port.invite(actor.user.id, email.trim().toLowerCase(), requestId);
    return { status: "created", token };
  } catch {
    return { status: "rejected", reason: "unavailable" };
  }
}

export type RevocationResult =
  | { status: "revoked" }
  | {
      status: "rejected";
      reason: "forbidden" | "invalid-target" | "unavailable";
    };

export async function revokeViewerAccess(
  actor: Access,
  subjectId: unknown,
  kind: unknown,
  port: AccessManagementPort,
  requestId?: string,
): Promise<RevocationResult> {
  if (actor.role !== "owner") return { status: "rejected", reason: "forbidden" };
  if (
    typeof subjectId !== "string" ||
    !subjectId.trim() ||
    subjectId.length > 128 ||
    (kind !== "member" && kind !== "invitation")
  )
    return { status: "rejected", reason: "invalid-target" };
  try {
    await port.revoke(actor.user.id, subjectId, kind, requestId);
    return { status: "revoked" };
  } catch {
    return { status: "rejected", reason: "unavailable" };
  }
}
