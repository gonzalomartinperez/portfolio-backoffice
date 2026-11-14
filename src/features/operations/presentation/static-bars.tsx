// PBO-M2-13 spike only (never merged): a server-rendered bar list in place of the Recharts island.
import type { OperationalSnapshot } from "../domain/models";
import { type OperationsLocale, operationsCopy } from "./copy";

export function StaticBars({
  executions,
  locale,
}: {
  executions: OperationalSnapshot["executions"];
  locale: OperationsLocale;
}) {
  const t = operationsCopy[locale];
  const rows = [
    { name: t.completed, value: executions.completed, color: "var(--accent)" },
    { name: t.cancelled, value: executions.cancelled, color: "var(--signal-warning)" },
    { name: t.failed, value: executions.failed, color: "var(--danger)" },
  ];
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <section className="operation-card" aria-labelledby="snapshot-chart-title">
      <h2 id="snapshot-chart-title">{t.breakdown}</h2>
      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 8 }}>
        {rows.map((row) => (
          <li key={row.name}>
            <span>
              {row.name}: {row.value}
            </span>
            <span
              aria-hidden="true"
              style={{
                display: "block",
                height: 12,
                width: `${(100 * row.value) / max}%`,
                background: row.color,
              }}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
