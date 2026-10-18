import type { ReactNode } from "react";
import type { ProductReport } from "../domain/report";
import type { ProductTarget } from "../domain/models";
import { productCopy } from "./copy";
import { reportCopy, regionCopy } from "./report-copy";
import { DailyViewsChart } from "./report-chart";
import styles from "./report.module.css";

export function CalendarReport({
	report,
	locale,
}: {
	report: ProductReport;
	locale: "en" | "es";
}) {
	const t = reportCopy[locale];
	const common = productCopy[locale];
	const format = new Intl.NumberFormat(locale === "es" ? "es-419" : "en-US");
	const date = new Intl.DateTimeFormat(locale === "es" ? "es-419" : "en-US", {
		dateStyle: "medium",
		timeZone: "UTC",
	});
	const instant = new Intl.DateTimeFormat(
		locale === "es" ? "es-419" : "en-US",
		{ dateStyle: "medium", timeStyle: "short", timeZone: "UTC" },
	);
	const countries = new Intl.DisplayNames(
		[locale === "es" ? "es-419" : "en-US"],
		{ type: "region" },
	);
	const countryName = (code: string) =>
		code === "unknown"
			? t.unknown
			: code === "withheld"
				? t.withheld
				: (countries.of(code) ?? code);
	const targetName = (target: ProductTarget | null) =>
		target ? common.targets[target] : "—";
	const maximum = Math.max(3, ...report.cells.map((cell) => cell.count));
	return (
		<div className={styles.report}>
			<section className={styles.window} aria-label={t.calendar}>
				<div>
					<p className="eyebrow">{t.allPages}</p>
					<h2>
						{t.range(
							date.format(new Date(`${report.window.start}T00:00:00Z`)),
							date.format(new Date(`${report.window.end}T00:00:00Z`)),
						)}
					</h2>
				</div>
				<p className={styles.badge}>
					{report.window.partial ? t.partial : t.past}
				</p>
			</section>
			<div className={styles.metrics}>
				{[
					{ title: t.views, value: report.totals.views, help: t.viewsHelp },
					{ title: t.clicks, value: report.totals.clicks, help: t.clicksHelp },
					{
						title: t.exposures,
						value: report.totals.exposures,
						help: t.exposuresHelp,
					},
				].map((metric) => (
					<section
						key={metric.title}
						className={`operation-card ${styles.metric}`}
					>
						<h2>{metric.title}</h2>
						<p className="metric">{format.format(metric.value)}</p>
						<p>{metric.help}</p>
					</section>
				))}
			</div>
			{report.totals.views +
				report.totals.clicks +
				report.totals.exposures +
				report.actions.reduce((total, action) => total + action.count, 0) ===
				0 && (
				<p className="operational-notice" role="status">
					{t.empty}
				</p>
			)}
			<div className={styles.twoColumns}>
				<section className="operation-card" aria-labelledby="report-daily">
					<h2 id="report-daily">{t.daily}</h2>
					<p>{t.dailyHelp}</p>
					{report.days.length > 0 && (
						<DailyViewsChart days={report.days} locale={locale} />
					)}
					<ReportTable label={t.dailyTable}>
						<caption>{t.dailyTable}</caption>
						<thead>
							<tr>
								<th scope="col">{common.day}</th>
								<th scope="col">{t.views}</th>
							</tr>
						</thead>
						<tbody>
							{report.days.map((row) => (
								<tr key={row.day}>
									<th scope="row">
										<time dateTime={row.day}>
											{date.format(new Date(`${row.day}T00:00:00Z`))}
										</time>
									</th>
									<td>{format.format(row.views)}</td>
								</tr>
							))}
						</tbody>
					</ReportTable>
				</section>
				<section className="operation-card" aria-labelledby="report-countries">
					<h2 id="report-countries">{t.countries}</h2>
					<p>{t.countryHelp}</p>
					<p className={styles.sourceNotice}>
						{report.countryCollection === "disabled"
							? t.countryOff
							: t.countryOn}
					</p>

					<ReportTable label={t.country} bounded>
						<caption>{t.allPages}</caption>
						<thead>
							<tr>
								<th scope="col">{t.country}</th>
								<th scope="col">{t.views}</th>
							</tr>
						</thead>
						<tbody>
							{[...report.countries]
								.sort((a, b) => b.views - a.views)
								.map((row) => (
									<tr key={row.country}>
										<th scope="row">{countryName(row.country)}</th>
										<td>{format.format(row.views)}</td>
									</tr>
								))}
						</tbody>
					</ReportTable>
				</section>
			</div>
			<section className="operation-card" aria-labelledby="report-grid">
				<div className={styles.gridHeader}>
					<div>
						<p className="eyebrow">
							{common.sections[report.selection.section]} ·{" "}
							{t.viewports[report.selection.viewport]}
						</p>
						<h2 id="report-grid">{t.grid}</h2>
						<p>{regionCopy[locale][report.selection.region]}</p>
					</div>
					<dl>
						<div>
							<dt>{t.suppressed}</dt>
							<dd>{format.format(report.suppressedClicks)}</dd>
						</div>
						<div>
							<dt>{t.regionExposures}</dt>
							<dd>{format.format(report.selectedRegionExposures)}</dd>
						</div>
					</dl>
				</div>
				<p>{t.gridHelp}</p>
				<div className={styles.gridContent}>
					<svg
						className={styles.heatmap}
						viewBox="0 0 80 80"
						aria-hidden="true"
						focusable="false"
					>
						{Array.from({ length: 64 }, (_, index) => {
							const x = index % 8,
								y = Math.floor(index / 8);
							const cell = report.cells.find(
								(cell) => cell.x === x && cell.y === y,
							);
							return (
								<rect
									key={`${x}-${y}`}
									x={x * 10 + 0.5}
									y={y * 10 + 0.5}
									width="9"
									height="9"
									rx="1"
									fill={cell ? "var(--accent)" : "var(--surface-raised)"}
									fillOpacity={cell ? 0.2 + (0.8 * cell.count) / maximum : 1}
									stroke="var(--line-strong)"
									strokeWidth="0.25"
								/>
							);
						})}
					</svg>
					<div>
						{report.cells.length === 0 ? (
							<p>{t.gridEmpty}</p>
						) : (
							<ReportTable label={t.gridTable}>
								<caption>{t.gridTable}</caption>
								<thead>
									<tr>
										<th scope="col">{t.column}</th>
										<th scope="col">{t.row}</th>
										<th scope="col">{t.clicks}</th>
									</tr>
								</thead>
								<tbody>
									{report.cells.map((cell) => (
										<tr key={`${cell.x}-${cell.y}`}>
											<th scope="row">{cell.x + 1}</th>
											<td>{cell.y + 1}</td>
											<td>{format.format(cell.count)}</td>
										</tr>
									))}
								</tbody>
							</ReportTable>
						)}
					</div>
				</div>
			</section>
			<div className={styles.twoColumns}>
				<section className="operation-card">
					<h2>{t.pages}</h2>
					<ReportTable label={t.pages}>
						<caption>{t.allPages}</caption>
						<thead>
							<tr>
								<th scope="col">{common.section}</th>
								<th scope="col">{t.views}</th>
								<th scope="col">{t.clicks}</th>
								<th scope="col">{t.exposures}</th>
							</tr>
						</thead>
						<tbody>
							{report.sections.map((row) => (
								<tr key={row.section}>
									<th scope="row">{common.sections[row.section]}</th>
									<td>{format.format(row.views)}</td>
									<td>{format.format(row.clicks)}</td>
									<td>{format.format(row.exposures)}</td>
								</tr>
							))}
						</tbody>
					</ReportTable>
				</section>
				<section className="operation-card">
					<h2>{t.regions}</h2>
					<ReportTable label={t.regions}>
						<caption>
							{common.sections[report.selection.section]} ·{" "}
							{t.viewports[report.selection.viewport]}
						</caption>
						<thead>
							<tr>
								<th scope="col">{t.region}</th>
								<th scope="col">{t.clicks}</th>
								<th scope="col">{t.exposures}</th>
							</tr>
						</thead>
						<tbody>
							{report.regions.map((row) => (
								<tr key={row.region}>
									<th scope="row">{regionCopy[locale][row.region]}</th>
									<td>{format.format(row.clicks)}</td>
									<td>{format.format(row.exposures)}</td>
								</tr>
							))}
						</tbody>
					</ReportTable>
				</section>
			</div>
			<section className="operation-card">
				<h2>{t.actions}</h2>
				<p>{t.actionsHelp}</p>
				{report.actions.length === 0 ? (
					<p>{t.noActions}</p>
				) : (
					<ReportTable label={t.actions}>
						<caption>{t.allPages}</caption>
						<thead>
							<tr>
								<th scope="col">{common.metric}</th>
								<th scope="col">{common.section}</th>
								<th scope="col">{common.locale}</th>
								<th scope="col">{common.target}</th>
								<th scope="col">{common.count}</th>
							</tr>
						</thead>
						<tbody>
							{report.actions.map((row) => (
								<tr
									key={[row.event, row.section, row.locale, row.target].join(
										"|",
									)}
								>
									<th scope="row">{common.events[row.event]}</th>
									<td>{common.sections[row.section]}</td>
									<td>{t.languages[row.locale]}</td>
									<td>{targetName(row.target)}</td>
									<td>{format.format(row.count)}</td>
								</tr>
							))}
						</tbody>
					</ReportTable>
				)}
			</section>
			<details className="operation-card">
				<summary>{t.coverage}</summary>
				<p>{t.coverageHelp}</p>
				<p>{t.dedupe}</p>
				<dl className={styles.coverage}>
					<dt>{t.generated}</dt>
					<dd>
						<time dateTime={report.generatedAt}>
							{instant.format(new Date(report.generatedAt))}
						</time>
					</dd>
					<dt>{t.first}</dt>
					<dd>
						{report.firstObservedAt ? (
							<time dateTime={report.firstObservedAt}>
								{instant.format(new Date(report.firstObservedAt))}
							</time>
						) : (
							t.unobserved
						)}
					</dd>
					<dt>{t.last}</dt>
					<dd>
						{report.lastObservedAt ? (
							<time dateTime={report.lastObservedAt}>
								{instant.format(new Date(report.lastObservedAt))}
							</time>
						) : (
							t.unobserved
						)}
					</dd>
				</dl>
			</details>
		</div>
	);
}

function ReportTable({
	label,
	children,
	bounded = false,
}: {
	label: string;
	children: ReactNode;
	bounded?: boolean;
}) {
	return (
		<section
			className={`${styles.tableViewport} ${bounded ? styles.scroll : ""}`}
			// biome-ignore lint/a11y/noNoninteractiveTabindex: Safari requires focus to keyboard-scroll this named overflow region.
			tabIndex={0}
			aria-label={label}
		>
			<table className={styles.table}>{children}</table>
		</section>
	);
}
