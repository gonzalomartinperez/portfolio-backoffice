"use client";

import {
	Bar,
	BarChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { reportCopy } from "./report-copy";
import styles from "./report.module.css";

export function DailyViewsChart({
	days,
	locale,
}: {
	days: { day: string; views: number }[];
	locale: "en" | "es";
}) {
	const t = reportCopy[locale];
	const format = new Intl.NumberFormat(locale === "es" ? "es-419" : "en-US");
	return (
		<div className={styles.plot}>
			<ResponsiveContainer width="100%" height="100%" minWidth={0}>
				<BarChart
					data={days}
					accessibilityLayer
					margin={{ top: 16, right: 8, bottom: 8, left: 0 }}
				>
					<CartesianGrid vertical={false} stroke="var(--line-strong)" />
					<XAxis
						dataKey="day"
						minTickGap={24}
						tickFormatter={(day) => String(day).slice(5)}
						tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
					/>
					<YAxis
						allowDecimals={false}
						width={48}
						tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
					/>
					<Tooltip
						formatter={(value) =>
							typeof value === "number" ? format.format(value) : t.unobserved
						}
						cursor={{ fill: "var(--accent-wash)" }}
						contentStyle={{
							background: "var(--surface-raised)",
							color: "var(--text-primary)",
							borderColor: "var(--line-control)",
							borderRadius: "var(--radius-sm)",
						}}
					/>
					<Bar
						dataKey="views"
						name={t.views}
						fill="var(--accent)"
						radius={[4, 4, 0, 0]}
						isAnimationActive={false}
						maxBarSize={44}
					/>
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
}
