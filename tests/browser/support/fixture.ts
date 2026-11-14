/** True for the available-mode fixture lifecycle; false for the unavailable/malformed one. */
export const available = (process.env.OPERATIONS_FIXTURE_MODE ?? "available") === "available";
