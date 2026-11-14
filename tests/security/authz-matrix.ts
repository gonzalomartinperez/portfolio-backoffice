// Authorization matrix (docs/master-plan/testing.md section 4), corrected to what the code does.
// `tests/unit/authz-matrix.test.ts` enumerates the real surface and fails on any difference.
// Outcomes: redirects come from `requireAccess`/`requireOwner` (there is no typed 401/403 page).
export type Outcome =
  | "public"
  | "provider-flow"
  | "unauthorized"
  | "redirect-sign-in"
  | "redirect-home"
  | "not-found"
  | "allowed";
export type Guard = "none" | "getAccess" | "requireAccess" | "requireOwner";

export interface MatrixRow {
  surface: string;
  guard: Guard;
  anonymous: Outcome;
  viewer: Outcome;
  owner: Outcome;
}

const signedIn = (guard: Guard): Omit<MatrixRow, "surface"> => ({
  guard,
  anonymous: "redirect-sign-in",
  viewer: "allowed",
  owner: "allowed",
});
const ownerOnly = (guard: Guard): Omit<MatrixRow, "surface"> => ({
  guard,
  anonymous: "redirect-sign-in",
  viewer: "redirect-home",
  owner: "allowed",
});
const open = (outcome: Outcome): Omit<MatrixRow, "surface"> => ({
  guard: "none",
  anonymous: outcome,
  viewer: outcome,
  owner: outcome,
});

export const authzMatrix: readonly MatrixRow[] = [
  { surface: "page /", ...signedIn("requireAccess") },
  { surface: "page /analytics", ...signedIn("requireAccess") },
  { surface: "page /access", ...ownerOnly("requireOwner") },
  { surface: "page /privacy", ...open("public") },
  { surface: "page /sign-in", ...open("public") },
  // Component gallery: notFound() unless `kitEnabled()` (dev or fixture only).
  { surface: "page /__kit", ...open("not-found") },
  {
    surface: "route GET /api/operations",
    guard: "getAccess",
    anonymous: "unauthorized",
    viewer: "allowed",
    owner: "allowed",
  },
  { surface: "route GET /api/health", ...open("public") },
  { surface: "route GET /api/ready", ...open("public") },
  { surface: "route GET /access/invitation", ...open("public") },
  { surface: "route GET /api/auth/[...all]", ...open("provider-flow") },
  { surface: "route POST /api/auth/[...all]", ...open("provider-flow") },
  { surface: "action src/server/auth/actions.ts#inviteUser", ...ownerOnly("requireOwner") },
  { surface: "action src/server/auth/actions.ts#revokeAccess", ...ownerOnly("requireOwner") },
];
