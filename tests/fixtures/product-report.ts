import type { components } from "../../contracts/product-analytics-v2.types";
import { sections } from "../../src/features/analytics/domain/models.ts";
import { calendarWindow } from "../../src/features/analytics/adapters/calendar.ts";
import {
	defaultReportSelection,
	type ReportSelection,
} from "../../src/features/analytics/domain/report.ts";
import { regionsFor } from "../../src/features/analytics/domain/report.ts";

type Report = components["schemas"]["ProductReportSnapshot"];
export function productReportPayload(
	selection: ReportSelection = defaultReportSelection,
): Report {
	const generatedAt = "2026-10-18T12:00:00Z";
	const window = calendarWindow(
		generatedAt,
		selection.period,
		selection.offset,
	);
	const includesDay = (day: string) =>
		selection.eventLocale !== "es" && window.start <= day && day < window.end;
	const prior = includesDay("2026-10-17"),
		current = includesDay("2026-10-18");
	const views = (prior ? 3 : 0) + (current ? 1 : 0);
	const clicks = prior ? 4 : 0,
		exposures = prior ? 5 : 0;
	const regional =
		selection.section === "home" && selection.viewport === "desktop";
	const selected = regional && selection.region === "home-featured" && prior;
	const countries: Report["countries"] = [];
	const daily: Report["daily"] = [];
	if (prior) {
		countries.push({ country: "AR", count: 3 });
		daily.push({ day: "2026-10-17", count: 3 });
	}
	if (current) {
		countries.push({ country: "unknown", count: 1 });
		daily.push({ day: "2026-10-18", count: 1 });
	}
	return {
		schema_version: 2,
		project: "portfolio",
		timezone: "UTC",
		retention_days: 93,
		grid_size: 8,
		minimum_bucket: 3,
		coverage: "received_events_only",
		country_collection: "disabled",
		layout_revision: "portfolio-v1",
		selection: {
			period: selection.period,
			offset: selection.offset,
			section: selection.section,
			region_id: selection.region,
			viewport: selection.viewport,
			locale: selection.eventLocale,
		},
		window,
		generated_at: generatedAt,
		first_observed_at: "2026-10-17T12:00:00Z",
		last_observed_at: "2026-10-18T11:00:00Z",
		totals: {
			page_views: views,
			public_clicks: clicks,
			section_exposures: exposures,
		},
		daily,
		countries,
		sections: sections.map((section) => ({
			section,
			page_views: section === "home" ? views : 0,
			public_clicks: section === "home" ? clicks : 0,
			section_exposures: section === "home" ? exposures : 0,
		})),
		regions: regionsFor(selection.section).map((region_id) => ({
			region_id,
			public_clicks: regional && region_id === "home-featured" ? clicks : 0,
			section_exposures:
				regional && region_id === "home-featured" ? exposures : 0,
		})),
		cells: selected ? [{ x: 2, y: 3, count: 3 }] : [],
		actions: prior
			? [
					{
						event_name: "cv_link_open",
						section: "cv",
						locale: "en",
						target: "en",
						count: 2,
					},
				]
			: [],
		selected_region_exposures: selected ? 5 : 0,
		suppressed_cell_clicks: selected ? 1 : 0,
	};
}
