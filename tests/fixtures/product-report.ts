import type { components } from "../../contracts/product-analytics-v2.types";
import { sections } from "../../src/features/analytics/domain/models.ts";
import { regionsFor } from "../../src/features/analytics/domain/report.ts";

export function productReportPayload(): components["schemas"]["ProductReportSnapshot"] {
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
			period: "month",
			offset: 0,
			section: "home",
			region_id: "home-featured",
			viewport: "desktop",
			locale: "all",
		},
		window: { start: "2026-10-01", end: "2026-11-01", partial: true },
		generated_at: "2026-10-18T12:00:00Z",
		first_observed_at: "2026-10-17T12:00:00Z",
		last_observed_at: "2026-10-18T11:00:00Z",
		totals: { page_views: 4, public_clicks: 4, section_exposures: 5 },
		daily: [
			{ day: "2026-10-17", count: 3 },
			{ day: "2026-10-18", count: 1 },
		],
		countries: [
			{ country: "AR", count: 3 },
			{ country: "unknown", count: 1 },
		],
		sections: sections.map((section) => ({
			section,
			page_views: section === "home" ? 4 : 0,
			public_clicks: section === "home" ? 4 : 0,
			section_exposures: section === "home" ? 5 : 0,
		})),
		regions: regionsFor("home").map((region_id) => ({
			region_id,
			public_clicks: region_id === "home-featured" ? 4 : 0,
			section_exposures: region_id === "home-featured" ? 5 : 0,
		})),
		cells: [{ x: 2, y: 3, count: 3 }],
		actions: [
			{
				event_name: "cv_link_open",
				section: "cv",
				locale: "en",
				target: "en",
				count: 2,
			},
		],
		selected_region_exposures: 5,
		suppressed_cell_clicks: 1,
	};
}
