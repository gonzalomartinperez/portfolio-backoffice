import {
  existsSync,
  lstatSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  realpathSync,
} from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { FAILSAFE_SCHEMA, load } from "js-yaml";
import { errorMessage, record } from "./json.ts";

function metadata(source: string, portable: boolean): Record<string, unknown> {
  try {
    return record(load(source, portable ? { schema: FAILSAFE_SCHEMA } : {}));
  } catch {
    throw new Error("Invalid YAML metadata");
  }
}

export function validateSkills(directoryRoot: string) {
  const root = realpathSync(directoryRoot);
  const errors: string[] = [];
  const names = new Set<string>();
  const canonical = path.join(root, ".agents/skills");
  const discovery = path.join(root, ".claude/skills");
  const packages = record(JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")));
  const commands = record(packages.scripts);
  const inside = (target: string) => target === root || target.startsWith(root + path.sep);
  const fail = (file: string, message: string) =>
    errors.push(`${path.relative(root, file)}: ${message}`);
  const folders = existsSync(canonical) ? readdirSync(canonical) : [];
  if (!folders.length) errors.push("No canonical skills found");
  for (const folder of folders) {
    const directory = path.join(canonical, folder);
    const entry = path.join(directory, "SKILL.md");
    try {
      if (!lstatSync(directory).isDirectory())
        throw new Error("Canonical skill must be a real directory");
      const source = readFileSync(entry, "utf8");
      const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]+)$/.exec(source);
      if (!match) throw new Error("Missing YAML frontmatter or skill body");
      const meta = metadata(match[1] ?? "", true);
      if (Object.keys(meta).some((key) => !["name", "description", "metadata"].includes(key)))
        throw new Error("Only portable name/description/metadata frontmatter is supported here");
      validateMetadata(meta.metadata);
      if (
        typeof meta.name !== "string" ||
        !/^web-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(meta.name) ||
        meta.name.length > 64
      )
        throw new Error("Invalid namespaced name");
      if (names.has(meta.name)) throw new Error("Duplicate discovered name");
      names.add(meta.name);
      if (meta.name !== folder) throw new Error("Directory and skill name differ");
      if (
        typeof meta.description !== "string" ||
        !meta.description.trim() ||
        meta.description.length > 1024 ||
        !/\bUse when\b[\s\S]*\beven if\b[\s\S]*\bDo not use for\b/.test(meta.description)
      )
        throw new Error(
          'Invalid description: state the job, then "Use when ... even if ... Do not use for ..."',
        );
      validateEvals(directory);
      const link = path.join(discovery, folder);
      if (
        !lstatSync(link).isSymbolicLink() ||
        path.isAbsolute(readlinkSync(link)) ||
        realpathSync(link) !== directory
      )
        throw new Error(
          "Claude discovery must be a relative directory symlink to its canonical skill",
        );
      inspect(directory);
    } catch (error) {
      fail(entry, errorMessage(error));
    }
  }
  if (!existsSync(discovery) || readdirSync(discovery).sort().join() !== folders.sort().join())
    errors.push("Client discovery catalogs differ");
  if (readFileSync(path.join(root, "CLAUDE.md"), "utf8").trim() !== "@AGENTS.md")
    errors.push("Claude entry must import the canonical AGENTS.md only");
  return { names: [...names].sort(), errors };

  function validateMetadata(value: unknown) {
    let fields: Record<string, unknown>;
    try {
      fields = record(value);
    } catch {
      throw new Error("Missing metadata: owner, last-reviewed and version");
    }
    if (
      Object.keys(fields).sort().join() !== "last-reviewed,owner,version" ||
      typeof fields.owner !== "string" ||
      !fields.owner.trim() ||
      typeof fields["last-reviewed"] !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(fields["last-reviewed"]) ||
      Number.isNaN(Date.parse(`${fields["last-reviewed"]}T00:00:00Z`)) ||
      new Date(`${fields["last-reviewed"]}T00:00:00Z`).toISOString().slice(0, 10) !==
        fields["last-reviewed"] ||
      typeof fields.version !== "string" ||
      !/^\d+\.\d+\.\d+$/.test(fields.version)
    )
      throw new Error("Invalid metadata: owner, last-reviewed (YYYY-MM-DD) and version (x.y.z)");
  }

  function validateEvals(directory: string) {
    const read = (name: string) => {
      try {
        return JSON.parse(readFileSync(path.join(directory, "evals", name), "utf8")) as unknown;
      } catch {
        throw new Error(`Missing or invalid evals/${name}`);
      }
    };
    const triggers = read("triggers.json");
    const queries = Array.isArray(triggers) ? triggers.map(record) : [];
    const count = (trigger: boolean, split: string) =>
      queries.filter(
        (query) =>
          query.should_trigger === trigger &&
          query.split === split &&
          typeof query.query === "string" &&
          query.query.trim(),
      ).length;
    const texts = queries.map((query) => String(query.query).trim().toLowerCase());
    if (
      queries.length !== 20 ||
      new Set(texts).size !== texts.length ||
      queries.some(
        (query) =>
          typeof query.should_trigger !== "boolean" ||
          !["train", "validation"].includes(String(query.split)),
      ) ||
      [true, false].some(
        (trigger) => count(trigger, "train") !== 6 || count(trigger, "validation") !== 4,
      )
    )
      throw new Error(
        "evals/triggers.json needs 20 distinct queries: 10 positives and 10 near-miss negatives, 6 train and 4 validation each",
      );
    const outputs = record(read("evals.json"));
    const cases = Array.isArray(outputs.evals) ? outputs.evals.map(record) : [];
    if (
      outputs.skill_name !== path.basename(directory) ||
      cases.length < 2 ||
      cases.some(
        (entry) =>
          typeof entry.prompt !== "string" ||
          !entry.prompt.trim() ||
          typeof entry.expected_output !== "string" ||
          !Array.isArray(entry.assertions) ||
          !entry.assertions.length ||
          entry.assertions.some(
            (assertion: unknown) => typeof assertion !== "string" || !assertion.trim(),
          ),
      )
    )
      throw new Error(
        "evals/evals.json needs the skill name and at least two prompts with expected output and string assertions",
      );
  }

  function inspect(directory: string) {
    const entries = readdirSync(directory);
    if (!entries.length) fail(directory, "Empty scaffold directory");
    for (const name of entries) {
      const file = path.join(directory, name);
      const stat = lstatSync(file);
      if (stat.isSymbolicLink()) {
        fail(file, "Canonical resources cannot be symlinks");
        continue;
      }
      if (stat.isDirectory()) {
        inspect(file);
        continue;
      }
      const source = readFileSync(file, "utf8");
      if (/\b(?:TODO|FIXME|TBD)\b|\[INSERT\b|<skill-name>/.test(source))
        fail(file, "Unfinished scaffold");
      if (/(?:\/home\/|\/Users\/|\/mnt\/[cd]\/|[A-Z]:\\Users\\|~\/|\$HOME\b)/.test(source))
        fail(file, "Machine-specific or global path");
      if (name === "openai.yaml") {
        try {
          const client = metadata(source, false);
          const policy = client.policy === undefined ? {} : record(client.policy);
          if (
            policy.allow_implicit_invocation !== undefined &&
            policy.allow_implicit_invocation !== true
          )
            throw new Error("Explicit-only skill policy");
        } catch {
          fail(file, "Automatic skill selection must remain enabled; invalid client metadata");
        }
      }
      if (!file.endsWith(".md")) continue;
      for (const match of source.matchAll(/!?\[[^\]]*\]\(([^\s)]+)\)/g)) {
        const ref = match[1];
        if (!ref) continue;
        if (/^(https?:|#)/.test(ref)) continue;
        const target = path.resolve(
          path.dirname(file),
          decodeURIComponent(ref.split("#")[0] ?? ""),
        );
        if (!inside(target) || !existsSync(target) || !inside(realpathSync(target)))
          fail(file, `Missing or external reference: ${ref}`);
      }
      for (const match of source.matchAll(/\bnpm run ([a-z][a-z0-9:-]*)/g)) {
        if (match[1] && !(match[1] in commands)) fail(file, `Unknown npm command: ${match[1]}`);
      }
      for (const match of source.matchAll(
        /`(?:(node|bash) )?((?:\.\/)?scripts\/[\w./-]+)(?:[^`]*)`/g,
      )) {
        if (!match[2]) continue;
        const target = path.resolve(root, match[2]);
        if (!inside(target) || !existsSync(target))
          fail(file, `Missing executable resource: ${match[2]}`);
        else if (!match[1] && !(lstatSync(target).mode & 0o111))
          fail(file, "Directly invoked script is not executable");
        else if (
          (match[1] === "node" && !/\.(ts|mts)$/.test(target)) ||
          (match[1] === "bash" && !target.endsWith(".sh"))
        )
          fail(file, "Unsupported script invocation");
      }
    }
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const result = validateSkills(process.argv[2] ?? process.cwd());
  for (const error of result.errors) console.error(error);
  console.log(`Skills: ${result.names.length} canonical entries, ${result.errors.length} errors.`);
  if (result.errors.length) process.exitCode = 1;
}
