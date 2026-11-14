import assert from "node:assert/strict";
import fc from "fast-check";
import { test } from "vitest";
import { parseProductSnapshot } from "../../src/features/analytics/adapters/validate.ts";
import { parseProductReport } from "../../src/features/analytics/adapters/validate-report.ts";
import { sections } from "../../src/features/analytics/domain/models.ts";
import {
  defaultReportSelection,
  eventLocales,
  type ReportSelection,
  regionsFor,
  reportPeriods,
  reportViewports,
} from "../../src/features/analytics/domain/report.ts";
import { reportSelection } from "../../src/features/analytics/presentation/selection.ts";
import {
  type AccessManagementPort,
  inviteViewer,
  revokeViewerAccess,
} from "../../src/features/auth/application/manage-access.ts";
import { type Access, validEmail } from "../../src/features/auth/domain/access.ts";
import { parseFeedback } from "../../src/features/operations/adapters/feedback-validate.ts";
import {
  OperationalPayloadError,
  parseOperationalSnapshot,
} from "../../src/features/operations/adapters/validate.ts";
import { feedbackPayload } from "../fixtures/feedback.ts";
import { operationalPayload } from "../fixtures/operations.ts";
import { productPayload } from "../fixtures/product-analytics.ts";
import { productReportPayload } from "../fixtures/product-report.ts";

// 100 runs on every PR; the nightly job sets FC_NUM_RUNS=1000 (testing.md section 2).
const numRuns = Number(process.env.FC_NUM_RUNS ?? 100);
// FC_SEED reproduces a failure reported by fast-check (it prints the seed and path).
const parameters = {
  numRuns,
  ...(process.env.FC_SEED ? { seed: Number(process.env.FC_SEED) } : {}),
};

// ---- Permission lattice -------------------------------------------------------------------

const identifier = fc.string({ minLength: 1, maxLength: 40 });
const actor = (role: Access["role"], id: string): Access => ({
  user: { id, name: "Synthetic", email: "synthetic@example.test" },
  role,
});
const anyInput = fc.oneof(
  fc.anything(),
  fc.string(),
  fc.emailAddress(),
  fc.constantFrom("member", "invitation", "owner", ""),
);

function recordingPort(options: { fail?: boolean } = {}) {
  const writes: unknown[][] = [];
  const port: AccessManagementPort = {
    async invite(...args) {
      writes.push(["invite", ...args]);
      if (options.fail) throw new Error("secret database detail");
      return "opaque-token";
    },
    async revoke(...args) {
      writes.push(["revoke", ...args]);
      if (options.fail) throw new Error("secret database detail");
    },
  };
  return { port, writes };
}

test("a viewer can never invite or revoke, whatever the input, and never reaches persistence", async () => {
  await fc.assert(
    fc.asyncProperty(identifier, anyInput, anyInput, async (id, email, kind) => {
      const { port, writes } = recordingPort();
      const viewer = actor("viewer", id);
      assert.deepEqual(await inviteViewer(viewer, email, port), {
        status: "rejected",
        reason: "forbidden",
      });
      assert.deepEqual(await revokeViewerAccess(viewer, email, kind, port), {
        status: "rejected",
        reason: "forbidden",
      });
      assert.equal(writes.length, 0);
    }),
    parameters,
  );
});

test("an owner is never rejected as forbidden: the owner role dominates the viewer role", async () => {
  await fc.assert(
    fc.asyncProperty(identifier, anyInput, anyInput, async (id, email, kind) => {
      const { port } = recordingPort();
      const results = [
        await inviteViewer(actor("owner", id), email, port),
        await revokeViewerAccess(actor("owner", id), email, kind, port),
      ];
      for (const result of results)
        if (result.status === "rejected") assert.notEqual(result.reason, "forbidden");
    }),
    parameters,
  );
});

test("invalid invitation emails never reach persistence", async () => {
  const invalid = fc.oneof(
    fc.anything().filter((value) => typeof value !== "string"),
    fc.string().filter((value) => !validEmail(value.trim())),
    fc.constant(`${"a".repeat(250)}@example.test`),
  );
  await fc.assert(
    fc.asyncProperty(identifier, invalid, async (id, email) => {
      const { port, writes } = recordingPort();
      assert.deepEqual(await inviteViewer(actor("owner", id), email, port), {
        status: "rejected",
        reason: "invalid-email",
      });
      assert.equal(writes.length, 0);
    }),
    parameters,
  );
});

test("valid invitations persist once, as the actor, with a trimmed lowercase email", async () => {
  await fc.assert(
    fc.asyncProperty(
      identifier,
      fc.emailAddress(),
      fc.constantFrom("", " ", "\t", "\n"),
      async (id, email, padding) => {
        const { port, writes } = recordingPort();
        const result = await inviteViewer(actor("owner", id), `${padding}${email}${padding}`, port);
        assert.deepEqual(result, { status: "created", token: "opaque-token" });
        assert.deepEqual(writes, [["invite", id, email.trim().toLowerCase()]]);
      },
    ),
    parameters,
  );
});

test("invalid revocation targets never reach persistence; valid ones pass through unchanged", async () => {
  const badSubject = fc.oneof(
    fc.anything().filter((value) => typeof value !== "string"),
    fc.constantFrom("", " ", "\n\t"),
    fc.string({ minLength: 129, maxLength: 200 }),
  );
  await fc.assert(
    fc.asyncProperty(identifier, badSubject, anyInput, async (id, subject, kind) => {
      const { port, writes } = recordingPort();
      const result = await revokeViewerAccess(actor("owner", id), subject, kind, port);
      assert.deepEqual(result, { status: "rejected", reason: "invalid-target" });
      assert.equal(writes.length, 0);
    }),
    parameters,
  );
  await fc.assert(
    fc.asyncProperty(
      identifier,
      fc.string({ minLength: 1, maxLength: 128 }).filter((value) => value.trim() !== ""),
      fc.constantFrom("member" as const, "invitation" as const),
      async (id, subject, kind) => {
        const { port, writes } = recordingPort();
        const result = await revokeViewerAccess(actor("owner", id), subject, kind, port);
        assert.deepEqual(result, { status: "revoked" });
        assert.deepEqual(writes, [["revoke", id, subject, kind]]);
      },
    ),
    parameters,
  );
  await fc.assert(
    fc.asyncProperty(
      identifier,
      identifier.filter((value) => value.trim() !== ""),
      anyInput.filter((kind) => kind !== "member" && kind !== "invitation"),
      async (id, subject, kind) => {
        const { port, writes } = recordingPort();
        const result = await revokeViewerAccess(actor("owner", id), subject, kind, port);
        assert.deepEqual(result, { status: "rejected", reason: "invalid-target" });
        assert.equal(writes.length, 0);
      },
    ),
    parameters,
  );
});

test("persistence failures surface as a fixed unavailable result without leaking details", async () => {
  await fc.assert(
    // A blank id is an invalid revocation target, rejected before persistence (asserted above).
    fc.asyncProperty(
      identifier.filter((value) => value.trim() !== ""),
      fc.emailAddress(),
      async (id, email) => {
        const { port } = recordingPort({ fail: true });
        const invite = await inviteViewer(actor("owner", id), email, port);
        const revoke = await revokeViewerAccess(actor("owner", id), id, "member", port);
        assert.deepEqual(invite, { status: "rejected", reason: "unavailable" });
        assert.deepEqual(revoke, { status: "rejected", reason: "unavailable" });
      },
    ),
    parameters,
  );
});

// ---- Validators -----------------------------------------------------------------------------

/** A validator rejection, not an accidental runtime fault inside the validator. */
function rejectedBy(errorType: new (...args: never[]) => Error, error: unknown): boolean {
  return (
    error instanceof errorType &&
    !(error instanceof TypeError || error instanceof RangeError || error instanceof ReferenceError)
  );
}

type Path = (string | number)[];
const selectionDefault = defaultReportSelection;
const validators: {
  name: string;
  payload: unknown;
  parse: (value: unknown) => unknown;
  errorType: new (...args: never[]) => Error;
}[] = [
  {
    name: "parseOperationalSnapshot",
    payload: operationalPayload,
    parse: parseOperationalSnapshot,
    errorType: OperationalPayloadError,
  },
  {
    name: "parseProductSnapshot",
    payload: productPayload,
    parse: parseProductSnapshot,
    errorType: Error,
  },
  { name: "parseFeedback", payload: feedbackPayload, parse: parseFeedback, errorType: Error },
  {
    name: "parseProductReport",
    payload: productReportPayload(selectionDefault),
    parse: (value) => parseProductReport(value, selectionDefault),
    errorType: Error,
  },
];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Paths to every plain object (the root included) inside a JSON value. */
function objectPaths(value: unknown, path: Path = []): Path[] {
  if (Array.isArray(value))
    return value.flatMap((item, index) => objectPaths(item, [...path, index]));
  if (!isObject(value)) return [];
  return [
    path,
    ...Object.entries(value).flatMap(([key, item]) => objectPaths(item, [...path, key])),
  ];
}

function edit(
  value: unknown,
  path: Path,
  change: (target: Record<string, unknown>) => void,
): unknown {
  const copy: unknown = structuredClone(value);
  let target: unknown = copy;
  for (const step of path) target = (target as Record<string | number, unknown>)[step];
  change(target as Record<string, unknown>);
  return copy;
}

// The privacy invariant: no prompt, answer, credential or contact data in operational payloads.
const forbiddenKeys = fc.oneof(
  fc.constantFrom("prompt", "answer", "token", "email", "question", "message", "ip", "user_id"),
  fc.string({ minLength: 1, maxLength: 12 }),
);

for (const validator of validators) {
  test(`${validator.name} accepts the committed example payload`, () => {
    assert.doesNotThrow(() => validator.parse(structuredClone(validator.payload)));
  });

  test(`${validator.name} rejects an unexpected key (prompt, answer, token, email...) in any object`, () => {
    const paths = objectPaths(validator.payload);
    assert.ok(paths.length > 0);
    fc.assert(
      fc.property(fc.constantFrom(...paths), forbiddenKeys, fc.jsonValue(), (path, key, value) => {
        const target = path.reduce<unknown>(
          (node, step) => (node as Record<string | number, unknown>)[step],
          validator.payload,
        );
        fc.pre(isObject(target) && !Object.hasOwn(target, key));
        const mutated = edit(validator.payload, path, (object) => {
          Object.defineProperty(object, key, {
            value,
            enumerable: true,
            configurable: true,
            writable: true,
          });
        });
        assert.throws(
          () => validator.parse(mutated),
          (error) => rejectedBy(validator.errorType, error),
        );
      }),
      parameters,
    );
  });

  test(`${validator.name} rejects a payload with any object key removed`, () => {
    const keyed = objectPaths(validator.payload).flatMap((path) => {
      const target = path.reduce<unknown>(
        (node, step) => (node as Record<string | number, unknown>)[step],
        validator.payload,
      );
      return Object.keys(target as object).map((key) => ({ path, key }));
    });
    fc.assert(
      fc.property(fc.constantFrom(...keyed), ({ path, key }) => {
        const mutated = edit(validator.payload, path, (object) => {
          delete object[key];
        });
        assert.throws(
          () => validator.parse(mutated),
          (error) => rejectedBy(validator.errorType, error),
        );
      }),
      parameters,
    );
  });

  test(`${validator.name} rejects arbitrary JSON and non-JSON values with its own error type`, () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.jsonValue(), fc.anything(), fc.bigInt(), fc.constant(undefined)),
        (value) => {
          assert.throws(() => validator.parse(value), validator.errorType);
        },
      ),
      parameters,
    );
  });

  test(`${validator.name} never mutates its input`, () => {
    const input = structuredClone(validator.payload);
    validator.parse(input);
    assert.deepEqual(input, validator.payload);
  });
}

// ---- URL selection (the app has no pagination; the filter form is the URL state) -------------

const selections: fc.Arbitrary<ReportSelection> = fc
  .record({
    period: fc.constantFrom(...reportPeriods),
    offset: fc.constantFrom(0 as const, 1 as const, 2 as const),
    section: fc.constantFrom(...sections),
    viewport: fc.constantFrom(...reportViewports),
    eventLocale: fc.constantFrom(...eventLocales),
  })
  .chain((base) =>
    fc.constantFrom(...regionsFor(base.section)).map((region) => ({ ...base, region })),
  );

function serialise(selection: ReportSelection): Record<string, string> {
  return {
    period: selection.period,
    offset: String(selection.offset),
    section: selection.section,
    region: selection.region,
    viewport: selection.viewport,
    eventLocale: selection.eventLocale,
  };
}

test("report selection serialises to URL parameters and parses back unchanged", () => {
  fc.assert(
    fc.property(selections, (selection) => {
      assert.deepEqual(reportSelection(serialise(selection)), selection);
      const query = new URLSearchParams(serialise(selection));
      assert.deepEqual(reportSelection(Object.fromEntries(query)), selection);
    }),
    parameters,
  );
});

test("missing report parameters fall back to the section defaults", () => {
  fc.assert(
    fc.property(fc.constantFrom(...sections), (section) => {
      const parsed = reportSelection({ section });
      assert.equal(parsed?.section, section);
      assert.equal(parsed?.region, regionsFor(section)[2]);
    }),
    parameters,
  );
});

test("arbitrary query strings parse to a canonical selection or are rejected", () => {
  const value = fc.oneof(
    fc.string(),
    fc.constantFrom(...reportPeriods, "0", "1", "2", "3", "-1", "01", "__proto__"),
    fc.array(fc.string(), { maxLength: 2 }),
    fc.constant(undefined),
  );
  const params = fc.record(
    {
      period: value,
      offset: value,
      section: value,
      region: value,
      viewport: value,
      eventLocale: value,
    },
    { requiredKeys: [] },
  );
  fc.assert(
    fc.property(params, (query) => {
      const parsed = reportSelection(query);
      if (parsed === null) return;
      // Whatever was accepted is canonical: it round-trips and names a real region of its section.
      assert.deepEqual(reportSelection(serialise(parsed)), parsed);
      assert.ok(regionsFor(parsed.section).includes(parsed.region));
    }),
    parameters,
  );
});
