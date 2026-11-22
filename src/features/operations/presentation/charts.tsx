// Server-rendered snapshot breakdown (PBO-M3-2). The table carries the data; each row draws a
// decorative CSS bar, so `/` ships no chart library. M5 replaces this with the server SVG forms.
import type { OperationalSnapshot } from "../domain/models";
import { type OperationsLocale, operationsCopy } from "./copy";
import styles from "./workbench.module.css";

type BreakdownRow = { name: string; value: number; color: string };

export function SnapshotChart({
  executions,
  usage,
  locale,
}: {
  executions: OperationalSnapshot["executions"];
  usage: OperationalSnapshot["usage"];
  locale: OperationsLocale;
}) {
  const t = operationsCopy[locale];
  const unclassified =
    executions.total - executions.completed - executions.cancelled - executions.failed;
  const executionRows: BreakdownRow[] = [
    { name: t.completed, value: executions.completed, color: "var(--accent)" },
    { name: t.cancelled, value: executions.cancelled, color: "var(--signal-warning)" },
    { name: t.failed, value: executions.failed, color: "var(--danger)" },
    ...(unclassified > 0
      ? [{ name: t.unclassified, value: unclassified, color: "var(--text-muted)" }]
      : []),
  ];
  const tokenRows: BreakdownRow[] = [
    { name: t.input, value: usage.inputTokens, color: "var(--accent)" },
    { name: t.output, value: usage.outputTokens, color: "var(--signal-success)" },
  ];
  const format = new Intl.NumberFormat(locale === "es" ? "es-419" : "en-US");
  return (
    <section
      className={`operation-card snapshot-chart ${styles.chartPanel}`}
      aria-labelledby="snapshot-chart-title"
    >
      <h2 id="snapshot-chart-title">{t.breakdown}</h2>
      <p>{t.snapshotOnly}</p>
      <BreakdownTable caption={t.executions} rows={executionRows} format={format} t={t} />
      <BreakdownTable caption={t.tokens} rows={tokenRows} format={format} t={t} />
    </section>
  );
}

function BreakdownTable({
  caption,
  rows,
  format,
  t,
}: {
  caption: string;
  rows: BreakdownRow[];
  format: Intl.NumberFormat;
  t: (typeof operationsCopy)[OperationsLocale];
}) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <table className="snapshot-chart-table">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">{t.metricView}</th>
          <th scope="col">{t.total}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.name}>
            <th scope="row">
              {row.name}
              <span className="snapshot-chart-track" aria-hidden="true">
                <span
                  className="snapshot-chart-bar"
                  style={{
                    background: row.color,
                    transform: `scaleX(${barScale(row.value, max)})`,
                  }}
                />
              </span>
            </th>
            <td>{format.format(row.value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// A non-zero value keeps a visible sliver; the exact number is always in the value cell.
function barScale(value: number, max: number) {
  return value > 0 ? Math.max(0.02, value / max) : 0;
}
