export const requiredJobs = [
	"workflows",
	"secrets",
	"static",
	"database",
	"container",
	"browser",
];

export function requireCiSuccess(value: unknown): void {
	if (typeof value !== "object" || value === null || Array.isArray(value))
		throw new Error("Missing validation results");
	if (Object.keys(value).length !== requiredJobs.length)
		throw new Error("Unexpected or missing validation jobs");
	for (const name of requiredJobs) {
		if (!(name in value)) throw new Error(`Missing required job: ${name}`);
		const job: unknown = Reflect.get(value, name);
		if (
			typeof job !== "object" ||
			job === null ||
			!("result" in job) ||
			job.result !== "success"
		)
			throw new Error(`Required job did not succeed: ${name}`);
	}
}

if (process.env.CI_RESULTS !== undefined)
	requireCiSuccess(JSON.parse(process.env.CI_RESULTS));
