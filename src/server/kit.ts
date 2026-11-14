// Guard of the `/__kit` component gallery (PBO-M2-2). The kit shows no data and is not part of the
// product: it is served only under `next dev` or when the test fixture sets BACKOFFICE_KIT. The
// runtime image and the deployment contract never set it. Read at request time, never inlined.
export function kitEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.BACKOFFICE_KIT === "enabled" || env.NODE_ENV === "development";
}
