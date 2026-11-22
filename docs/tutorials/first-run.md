# First run

This tutorial takes you from a fresh clone to a running backoffice: first with your own development OAuth applications, then as a deterministic local preview that needs no provider credentials.


## With your development OAuth applications

Use Linux/WSL, Node **24.22.3** from `.nvmrc`, npm and a dedicated PostgreSQL database.

```sh
gh repo clone gonzalomartinperez/portfolio-backoffice
cd portfolio-backoffice
nvm use
npm ci --no-audit --no-fund
npm run contract:install
cp .env.example .env.local
```

Fill the server-only placeholders, register the exact Google/GitHub callbacks and run
migration before admitting users. Node CLI commands do not load `.env.local` automatically:

```sh
node --env-file=.env.local scripts/auth-migrate.ts
npm run dev
```

The application runs at `http://localhost:3001`. Migration is explicit; startup does not
change schema. See [authentication setup](../explanation/authentication.md) for owner admission,
OAuth callbacks, invitation lifecycle and safe secret handling. Password login and public
registration are disabled.

## Deterministic local preview without provider credentials

Use a disposable database on an unused loopback port. The values below are public test
credentials, not production secrets.
Integration tests start their own digest-pinned PostgreSQL 18 container with Testcontainers
(`npm run test:auth`, Docker required). For the browser preview, run the same pinned image:

```sh
docker run -d --rm --name portfolio-readme-fixture \
  -e POSTGRES_USER=backoffice_fixture -e POSTGRES_PASSWORD=public-fixture-only \
  -e POSTGRES_DB=backoffice_test \
  -p 127.0.0.1:15432:5432 \
  postgres:18.7-trixie@sha256:9f4fd4aa918f52ae3d6f3b687f1de90d8f867cd4d520021545a9a50c120eae3b

docker exec portfolio-readme-fixture pg_isready -h 127.0.0.1 -U backoffice_fixture -d backoffice_test
npm run build
PLAYWRIGHT_SKIP_BROWSER_GC=1 npx playwright install --with-deps chromium
npm run test:browser -- --project=chromium-viewer
```

Wait until PostgreSQL reports readiness. Playwright’s managed lifecycle runs migration,
provisions private signed owner/viewer sessions and starts the synthetic operations service.
It requires ports **3107**, **3108** and **8117** to be free. Add `--headed` to the test
command to watch the real flows in a local desktop environment; headless works in CI.
No external OAuth provider or model API is contacted.
The pinned image is the one in `scripts/postgres-image.ts`, also used by the CI
service containers. Use fresh data only; production PostgreSQL is provisioned by vps-ops. See the
[shared database handoff](../reference/deployment-contract.md#shared-project-postgresql-artifact).

`npm run preview:fixture` is an optional manual server preview. Protected pages still
require a signed fixture session, so an ordinary browser initially sees sign-in. The
[fixture procedure](../verification/archive/readme-gallery.md) explains this boundary. Stop any
manual preview before running Playwright; each lifecycle owns the same isolated ports.

The browser suite starts/stops its own servers. Remove only the disposable database you
created with `docker stop portfolio-readme-fixture` (its `--rm` removes only that
owned fixture). If 15432 is occupied, select another
port and pass `BACKOFFICE_DATABASE_URL` explicitly to the fixture/test processes. Never
point fixture reset or session tooling at shared/production databases.

## Connect private API measurements

Configure server-runtime `OPERATIONS_API_ORIGIN` and `OPERATIONS_READ_TOKEN` against the
API’s [committed private contract](https://github.com/gonzalomartinperez/portfolio-assistant-api/blob/30f2d565ce38d15f5a6e69c2323c0f3e358b3eed/docs/private-observability.md).
Omit `OPERATIONS_SOURCE_MODE` in production. No `NEXT_PUBLIC_*` service configuration is
needed. Production pairing remains a separate acceptance step.

## Verify your checkout


```sh
npm run format:check
npm run lint
npm run typecheck
npm test
npm run security:check
npm run docs:check
npm run skills:check
```

For production-image/browser acceptance, install the engines and use the isolated fixture
database described above:

```sh
npm run build
PLAYWRIGHT_SKIP_BROWSER_GC=1 npx playwright install --with-deps chromium firefox webkit
npm run test:browser
```

`npm run test:auth` additionally exercises real PostgreSQL with a local OAuth provider; it
starts its own digest-pinned PostgreSQL container with Testcontainers (Docker required).
It does not contact Google/GitHub. Private session artifacts are ignored and never uploaded.

| CI job | Purpose |
| --- | --- |
| `classify` | Select jobs from the changed files through `.github/ci-profile.json`; unknown paths run everything. |
| `docs`, `security` | Shared standards jobs: markdownlint and links; zizmor, actionlint, gitleaks and dependency review. |
| `static` | `npm run check` (format, lint, types, unit/contract/boundary tests, docs, skills, secret scan), audits and contract drift. |
| `database` | Testcontainers PostgreSQL 18 (digest-pinned): IAM migrations, restricted runtime role, invitations, revocation and OAuth boundaries. |
| `build` | Build the image once as a one-day tarball artifact (SHA-256 recorded, file and secret checks before upload). |
| `scan` | Structure test, dockle, Grype (fixable HIGH/CRITICAL) and a CycloneDX SBOM of that exact image. |
| `container` | Run that exact non-root distroless image: readiness, resource bounds and shutdown. |
| `browser` | Run that exact image against the digest-pinned PostgreSQL service; verify admission, three browser engines and accessibility. |
| `ci-gate` | The single required check: fails unless every selected job succeeded. |

The primary checker is **TypeScript 7.0.2**, including generated Next route types and strict
indexed/optional checks. The official TypeScript 6 compiler API is isolated to tooling;
the frozen OpenAPI generator uses TypeScript 5.9.3. [ADR 003](../decisions/0003-typescript7-compatibility.md)
explains why. Node’s TypeScript execution is not a type check.

[Browser/authentication evidence](../verification/archive/backoffice.md) and
[container measurements](../verification/archive/container-readiness.md) distinguish fixture,
real-database and unverified production behavior. Local figures are not field performance.

## Build the runtime image


```sh
docker build -f infra/docker/app/Dockerfile --platform linux/amd64 -t portfolio-backoffice:local .
```

The standalone image runs as UID **65532**, exposes private port **3000**, has no shell/npm,
and supports read-only execution with bounded writable caches. `/api/health` checks the
process; `/api/ready` checks configuration and IAM schema/database readiness. Neither
proves live OAuth or operational-API availability.

Runtime environment changes require restart, not rebuilding the UI. Migration uses
`node scripts/auth-migrate.ts` in the tested image. Private **vps-ops** owns Coolify,
production composition, proxy/TLS, secret delivery, monitoring and recovery on Hostinger
KVM 4. The portfolio remains on Business and its assistant stays disabled.

Only separately authorized publication prepares an immutable image for vps-ops selection.
Main promotion never authorizes production deployment. Live OAuth registrations, effective
proxy headers, API pairing, backup/restore and physical-device behavior remain explicit gates.
