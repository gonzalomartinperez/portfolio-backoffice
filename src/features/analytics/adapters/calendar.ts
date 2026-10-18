import type { ReportPeriod } from "../domain/report.ts";

export function calendarWindow(
	observedAt: string,
	period: ReportPeriod,
	offset: 0 | 1 | 2,
): { start: string; end: string; partial: boolean } {
	const observed = new Date(observedAt);
	if (!Number.isFinite(observed.getTime()))
		throw new Error("Invalid observation time");
	const today = Date.UTC(
		observed.getUTCFullYear(),
		observed.getUTCMonth(),
		observed.getUTCDate(),
	);
	const start = new Date(today);
	const end = new Date(today);
	if (period === "month") {
		start.setUTCDate(1);
		start.setUTCMonth(start.getUTCMonth() - offset);
		end.setTime(start.getTime());
		end.setUTCMonth(end.getUTCMonth() + 1);
	} else {
		const days = period === "week" ? 7 : 1;
		const weekday = period === "week" ? (start.getUTCDay() + 6) % 7 : 0;
		start.setUTCDate(start.getUTCDate() - weekday - days * offset);
		end.setTime(start.getTime());
		end.setUTCDate(end.getUTCDate() + days);
	}
	return {
		start: start.toISOString().slice(0, 10),
		end: end.toISOString().slice(0, 10),
		partial: start.getTime() <= today && today < end.getTime(),
	};
}
