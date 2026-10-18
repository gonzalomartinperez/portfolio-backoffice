import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { load } from "js-yaml";
import { field, list, record, text } from "../../scripts/json.ts";

const app = "infra/docker/app/Dockerfile";
const postgres = "infra/docker/postgres/Dockerfile";
function rules(file: string) {
	return readFileSync(file, "utf8")
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line && !line.startsWith("#"));
}

// Deliberately checks this catalog's limited grammar, not a general Docker ignore parser.
function admitted(file: string, policy: string[]) {
	let allowed = true;
	for (const rule of policy) {
		const include = rule.startsWith("!");
		const pattern = include ? rule.slice(1) : rule;
		assert.match(
			pattern,
			/^(?:\*{1,2}|\*\*\/(?:\.env\*|\*\.(?:pem|key|p12|pfx))|[\w./-]+(?:\*\*)?)$/,
		);
		const match =
			pattern === "*" || pattern === "**"
				? true
				: pattern.startsWith("**/")
					? pattern === "**/.env*"
						? file.split("/").some((part) => part.startsWith(".env"))
						: file.endsWith(pattern.slice(4))
					: pattern.endsWith("/**")
						? file.startsWith(pattern.slice(0, -2))
						: pattern.endsWith("/")
							? file === pattern.slice(0, -1)
							: file === pattern;
		if (match) allowed = include;
	}
	return allowed;
}
function filesIn(path: string): string[] {
	return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
		const name = `${path}/${entry.name}`;
		return entry.isDirectory() ? filesIn(name) : [name];
	});
}

test("only canonical recipes exist and app COPY inputs remain in root context", () => {
	assert.equal(existsSync("Dockerfile"), false);
	assert.equal(existsSync("Dockerfile.postgres"), false);
	assert.ok(existsSync(app));
	assert.ok(existsSync(postgres));
	const policy = rules(`${app}.dockerignore`);
	const recipe = readFileSync(app, "utf8");
	for (const line of recipe.split("\n")) {
		if (!line.startsWith("COPY ") || line.includes("--from=")) continue;
		const sources = line.split(/\s+/).slice(1, -1);
		for (const source of sources) {
			assert.ok(
				existsSync(source),
				`Missing root-context COPY input: ${source}`,
			);
			const candidates = policy.includes(`!${source}/**`)
				? filesIn(source)
				: [source];
			for (const file of candidates)
				assert.ok(admitted(file, policy), `Excluded COPY input: ${file}`);
		}
	}
	assert.doesNotMatch(readFileSync(postgres, "utf8"), /^\s*(COPY|ADD)\s/m);
});

test("each context fails closed for private, unrelated and secret-shaped inputs", () => {
	const appPolicy = rules(`${app}.dockerignore`);
	const postgresPolicy = rules(`${postgres}.dockerignore`);
	const fallback = rules(".dockerignore");
	assert.deepEqual(fallback, ["**"]);
	assert.deepEqual(postgresPolicy, ["**"]);
	for (const file of [
		".env.local",
		"src/.env.production",
		"public/private.key",
		"src/nested/private.pem",
		"public/identity.p12",
		"src/identity.pfx",
		".git/config",
		".artifacts/session.json",
		"tests/fixture.ts",
		"docs/notes.md",
		"node_modules/tool/index.js",
		"infra/docker/postgres/Dockerfile",
	]) {
		assert.equal(admitted(file, appPolicy), false, file);
		assert.equal(admitted(file, postgresPolicy), false, file);
		assert.equal(admitted(file, fallback), false, file);
	}
	for (const file of [
		"package.json",
		"package-lock.json",
		"src/app/page.tsx",
		"scripts/auth-migrate.ts",
		"migrations/001-access.sql",
	]) {
		assert.ok(admitted(file, appPolicy), file);
		assert.equal(admitted(file, postgresPolicy), false, file);
	}
});

test("CI and dependency discovery select owned recipes and preserve pinned foreign exception", () => {
	const workflow = record(
		load(readFileSync(".github/workflows/quality.yml", "utf8")),
	);
	const steps = list(field(workflow, "jobs", "browser", "steps"));
	const build = steps.find((step) =>
		text(field(step, "uses") ?? "").startsWith("docker/build-push-action@"),
	);
	assert.equal(field(build, "with", "context"), ".");
	assert.equal(field(build, "with", "file"), app);
	const databaseSteps = list(field(workflow, "jobs", "database", "steps"));
	const ownedDatabase = databaseSteps.find(
		(step) =>
			field(step, "name") ===
			"Verify the project-owned PostgreSQL18.6 IAM artifact",
	);
	assert.match(
		text(field(ownedDatabase, "run")),
		/docker build -f infra\/docker\/postgres\/Dockerfile .+ \./,
	);
	const checkout = databaseSteps.find(
		(step) =>
			field(step, "name") ===
			"Read the committed project-engine application handoff",
	);
	assert.equal(
		field(checkout, "with", "ref"),
		"defe16a855a13401292257d337ce5dd937b00d23",
	);
	const foreign = databaseSteps.find(
		(step) =>
			field(step, "name") ===
			"Verify restricted IAM with both real applications and this exact image",
	);
	assert.equal(
		field(foreign, "working-directory"),
		".artifacts/api-compatibility",
	);
	assert.match(
		text(field(foreign, "run")),
		/docker build -f Dockerfile\.postgres -t portfolio-assistant-postgres:project-ci \./,
	);
	const dependabot = record(
		load(readFileSync(".github/dependabot.yml", "utf8")),
	);
	const directories = list(dependabot.updates)
		.filter((entry) => field(entry, "package-ecosystem") === "docker")
		.map((entry) => field(entry, "directory"));
	assert.deepEqual(directories.sort(), [
		"/infra/docker/app",
		"/infra/docker/postgres",
	]);
	const release = record(
		load(readFileSync(".github/workflows/release.yml", "utf8")),
	);
	assert.match(
		text(field(release, "jobs", "publish", "if")),
		/^\$\{\{\s*false\s*\}\}$/,
	);
});

test("current documented builds use explicit recipes and root context", () => {
	for (const file of ["README.md", "docs/deployment-contract.md"]) {
		const commands = [
			...readFileSync(file, "utf8").matchAll(
				/docker build(?:x build)?[^`\n]+/g,
			),
		];
		assert.ok(commands.length > 0, file);
		for (const [command] of commands) {
			assert.ok(
				command.includes(`-f ${app}`) || command.includes(`-f ${postgres}`),
				`${file}: ${command}`,
			);
			assert.ok(
				command.trimEnd().endsWith(" ."),
				`${file}: root context required`,
			);
		}
	}
});
