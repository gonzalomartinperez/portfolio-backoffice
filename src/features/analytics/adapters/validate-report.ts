import schema from "../../../../contracts/product-analytics-v2.schema.json" with {
	type: "json",
};
import type { components } from "../../../../contracts/product-analytics-v2.types";
import { calendarWindow } from "./calendar.ts";
import {
	eventNames,
	productTargets,
	sections,
	validSemanticDimensions,
} from "../domain/models.ts";
import {
	eventLocales,
	regionsFor,
	reportPeriods,
	reportViewports,
	type ProductReport,
	type ReportSelection,
} from "../domain/report.ts";
import {
	day,
	integer,
	member,
	object,
	rows,
	timestamp,
	unique,
} from "./report-values.ts";

type WireCountry = components["schemas"]["ReportCountry"]["country"];
function knownCountry(value: unknown): value is WireCountry {
	return (
		typeof value === "string" &&
		schema.$defs.ReportCountry.properties.country.enum.some(
			(country) => country === value,
		)
	);
}
function counts(value: unknown) {
	const row = object(value, [
		"page_views",
		"public_clicks",
		"section_exposures",
	]);
	return {
		views: integer(row.page_views),
		clicks: integer(row.public_clicks),
		exposures: integer(row.section_exposures),
	};
}
export function parseProductReport(
	value: unknown,
	expected: ReportSelection,
): ProductReport {
	const root = object(value, [
		"schema_version",
		"project",
		"timezone",
		"retention_days",
		"grid_size",
		"minimum_bucket",
		"coverage",
		"country_collection",
		"layout_revision",
		"selection",
		"window",
		"generated_at",
		"first_observed_at",
		"last_observed_at",
		"totals",
		"daily",
		"countries",
		"sections",
		"regions",
		"cells",
		"actions",
		"selected_region_exposures",
		"suppressed_cell_clicks",
	]);
	if (
		root.schema_version !== 2 ||
		root.project !== "portfolio" ||
		root.timezone !== "UTC" ||
		root.retention_days !== 93 ||
		root.grid_size !== 8 ||
		root.minimum_bucket !== 3 ||
		root.coverage !== "received_events_only" ||
		root.layout_revision !== "portfolio-v1"
	)
		throw new Error("Invalid aggregate contract");
	const rawSelection = object(root.selection, [
		"period",
		"offset",
		"section",
		"region_id",
		"viewport",
		"locale",
	]);
	const section = member(sections, rawSelection.section);
	const offset = integer(rawSelection.offset, 0, 2);
	if (offset !== 0 && offset !== 1 && offset !== 2)
		throw new Error("Invalid calendar offset");
	const wireSelection: components["schemas"]["ReportSelection"] = {
		period: member(reportPeriods, rawSelection.period),
		offset,
		section,
		region_id: member(regionsFor(section), rawSelection.region_id),
		viewport: member(reportViewports, rawSelection.viewport),
		locale: member(eventLocales, rawSelection.locale),
	};
	const selection: ReportSelection = {
		period: wireSelection.period,
		offset,
		section,
		region: wireSelection.region_id,
		viewport: wireSelection.viewport,
		eventLocale: wireSelection.locale,
	};
	if (
		selection.period !== expected.period ||
		selection.offset !== expected.offset ||
		selection.section !== expected.section ||
		selection.region !== expected.region ||
		selection.viewport !== expected.viewport ||
		selection.eventLocale !== expected.eventLocale
	)
		throw new Error("Unexpected aggregate selection");
	const rawWindow = object(root.window, ["start", "end", "partial"]);
	const start = day(rawWindow.start),
		end = day(rawWindow.end);
	if (
		start >= end ||
		(Date.parse(end) - Date.parse(start)) / 86400000 > 31 ||
		typeof rawWindow.partial !== "boolean"
	)
		throw new Error("Invalid calendar window");
	const generatedAt = timestamp(root.generated_at);
	const firstObservedAt = timestamp(root.first_observed_at),
		lastObservedAt = timestamp(root.last_observed_at);
	if (
		!generatedAt ||
		(firstObservedAt === null) !== (lastObservedAt === null) ||
		(firstObservedAt &&
			lastObservedAt &&
			(Date.parse(firstObservedAt) > Date.parse(lastObservedAt) ||
				Date.parse(lastObservedAt) > Date.parse(generatedAt)))
	)
		throw new Error("Invalid observation timeline");
	const calendar = calendarWindow(
		generatedAt,
		selection.period,
		selection.offset,
	);
	if (
		start !== calendar.start ||
		end !== calendar.end ||
		rawWindow.partial !== calendar.partial
	)
		throw new Error("Unexpected calendar window");
	const observedDay = new Date(generatedAt).toISOString().slice(0, 10);
	const totals = counts(root.totals);
	const days = unique(
		rows(root.daily, 31).map((value) => {
			const row = object(value, ["day", "count"]);
			const date = day(row.day);
			if (date < start || date >= end || date > observedDay)
				throw new Error("Date outside aggregate window");
			return { day: date, views: integer(row.count, 1, 10000) };
		}),
		(row) => row.day,
	);
	const countries = unique(
		rows(root.countries, 251).map((value) => {
			const row = object(value, ["country", "count"]);
			if (!knownCountry(row.country)) throw new Error("Invalid country label");
			const views = integer(row.count, 1);
			if (row.country !== "unknown" && row.country !== "withheld" && views < 3)
				throw new Error("Unsuppressed country bucket");
			return { country: row.country, views };
		}),
		(row) => row.country,
	);
	const sectionCounts = unique(
		rows(root.sections, 8).map((value) => {
			const row = object(value, [
				"section",
				"page_views",
				"public_clicks",
				"section_exposures",
			]);
			return {
				section: member(sections, row.section),
				views: integer(row.page_views),
				clicks: integer(row.public_clicks),
				exposures: integer(row.section_exposures),
			};
		}),
		(row) => row.section,
	);
	if (sectionCounts.length !== sections.length)
		throw new Error("Incomplete section aggregates");
	const regions = unique(
		rows(root.regions, 7).map((value) => {
			const row = object(value, [
				"region_id",
				"public_clicks",
				"section_exposures",
			]);
			return {
				region: member(regionsFor(section), row.region_id),
				clicks: integer(row.public_clicks),
				exposures: integer(row.section_exposures),
			};
		}),
		(row) => row.region,
	);
	if (regions.length !== regionsFor(section).length)
		throw new Error("Incomplete region aggregates");
	const cells = unique(
		rows(root.cells, 64).map((value) => {
			const row = object(value, ["x", "y", "count"]);
			return {
				x: integer(row.x, 0, 7),
				y: integer(row.y, 0, 7),
				count: integer(row.count, 3),
			};
		}),
		(row) => `${row.x}|${row.y}`,
	);
	const actions = unique(
		rows(root.actions, 128).map((value) => {
			const row = object(value, [
				"event_name",
				"section",
				"locale",
				"target",
				"count",
			]);
			const event = member(eventNames, row.event_name),
				section = member(sections, row.section);
			const target =
				row.target === null ? null : member(productTargets, row.target);
			if (
				event === "page_view" ||
				!validSemanticDimensions(event, section, target ?? "")
			)
				throw new Error("Invalid semantic aggregate");
			return {
				event,
				section,
				locale: member(["en", "es"], row.locale),
				target,
				count: integer(row.count, 1),
			};
		}),
		(row) => [row.event, row.section, row.locale, row.target].join("|"),
	);
	const selectedRegionExposures = integer(root.selected_region_exposures),
		suppressedClicks = integer(root.suppressed_cell_clicks);
	const selectedRegion = regions.find((row) => row.region === selection.region);
	if (
		!selectedRegion ||
		selectedRegion.exposures !== selectedRegionExposures ||
		selectedRegion.clicks !==
			suppressedClicks + cells.reduce((sum, row) => sum + row.count, 0)
	)
		throw new Error("Inconsistent heatmap aggregates");
	if (
		days.reduce((sum, row) => sum + row.views, 0) !== totals.views ||
		countries.reduce((sum, row) => sum + row.views, 0) !== totals.views ||
		sectionCounts.reduce((sum, row) => sum + row.views, 0) !== totals.views ||
		sectionCounts.reduce((sum, row) => sum + row.clicks, 0) !== totals.clicks ||
		sectionCounts.reduce((sum, row) => sum + row.exposures, 0) !==
			totals.exposures ||
		totals.views +
			totals.clicks +
			totals.exposures +
			actions.reduce((sum, row) => sum + row.count, 0) >
			310000
	)
		throw new Error("Inconsistent aggregate totals");
	return {
		selection,
		window: { start, end, partial: rawWindow.partial },
		generatedAt,
		firstObservedAt,
		lastObservedAt,
		countryCollection:
			member(["disabled", "trusted_proxy_header"], root.country_collection) ===
			"disabled"
				? "disabled"
				: "proxyHeader",
		totals,
		days,
		countries,
		sections: sectionCounts,
		regions,
		cells,
		actions,
		selectedRegionExposures,
		suppressedClicks,
	};
}
