import type { ReactNode } from "react";
import { requireAccess } from "../../server/auth/session";

// The access check runs here, outside the loading.tsx boundary below, so an anonymous request is
// redirected with a real HTTP redirect before any streamed shell is sent (PBO-M3-5). Pages keep
// their own requireAccess() for the role they need.
export default async function OperationsLayout({ children }: { children: ReactNode }) {
  await requireAccess();
  return children;
}
