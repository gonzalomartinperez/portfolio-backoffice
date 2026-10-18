import assert from "node:assert/strict";
import test from "node:test";
import { calendarWindow } from "../../src/features/analytics/adapters/calendar.ts";
import { defaultReportSelection } from "../../src/features/analytics/domain/report.ts";
import { parseProductReport } from "../../src/features/analytics/adapters/validate-report.ts";
import { createProductReportHttp } from "../../src/features/analytics/adapters/report-http.ts";
import { reportSelection } from "../../src/features/analytics/presentation/selection.ts";
import { productReportPayload } from "../fixtures/product-report.ts";

test("calendar windows follow UTC, ISO Monday weeks and leap-year month boundaries", () => {
	assert.deepEqual(calendarWindow("2026-01-01T12:00:00Z", "week", 0), {
		start: "2025-12-29",
		end: "2026-01-05",
		partial: true,
	});
	assert.deepEqual(calendarWindow("2024-03-31T12:00:00Z", "month", 1), {
		start: "2024-02-01",
		end: "2024-03-01",
		partial: false,
	});
	assert.deepEqual(calendarWindow("2026-01-01T00:30:00+02:00", "day", 0), {
		start: "2025-12-31",
		end: "2026-01-01",
		partial: true,
	});
	assert.deepEqual(calendarWindow("2026-01-01T12:00:00Z", "month", 2), {
		start: "2025-11-01",
		end: "2025-12-01",
		partial: false,
	});
	assert.throws(() => calendarWindow("invalid", "day", 0));
});

test("validated report maps aggregate data without treating observations as unique visitors", () => {
	const parsed = parseProductReport(
		productReportPayload(),
		defaultReportSelection,
	);
	assert.deepEqual(parsed.totals, { views: 4, clicks: 4, exposures: 5 });
	assert.equal(parsed.suppressedClicks, 1);
	assert.equal(parsed.countryCollection, "disabled");
	assert.deepEqual(parsed.countries, [
		{ country: "AR", views: 3 },
		{ country: "unknown", views: 1 },
	]);
	assert.equal("schema_version" in parsed, false);
});

test("report rejects wrong calendar selections, ambiguous dimensions and privacy leaks", () => {
	const payload = productReportPayload();
	for (const candidate of [
		{ ...payload, prompt: "synthetic" },
		{
			...payload,
			selection: { ...payload.selection, region_id: "about-story" },
		},
		{ ...payload, selection: { ...payload.selection, locale: "es" } },
		{
			...payload,
			window: { start: "2026-10-02", end: "2026-11-01", partial: true },
		},
		{ ...payload, window: { ...payload.window, partial: false } },
		{ ...payload, first_observed_at: null },
		{ ...payload, last_observed_at: "2026-10-19T00:00:00Z" },
		{ ...payload, generated_at: "2026-02-31T12:00:00Z" },
		{ ...payload, generated_at: "2026-10-18T24:00:00Z" },
		{ ...payload, countries: [{ country: "ZZ", count: 4 }] },
		{
			...payload,
			countries: [
				{ country: "AR", count: 1 },
				{ country: "unknown", count: 3 },
			],
		},
		{
			...payload,
			cells: [{ x: 2, y: 3, count: 2 }],
			suppressed_cell_clicks: 2,
		},
		{ ...payload, cells: [{ x: true, y: 3, count: 3 }] },
		{ ...payload, suppressed_cell_clicks: 0 },
		{ ...payload, selected_region_exposures: 4 },
		{ ...payload, regions: payload.regions.slice(1) },
		{ ...payload, sections: [...payload.sections, payload.sections[0]] },
		{ ...payload, totals: { ...payload.totals, page_views: 5 } },
		{ ...payload, daily: [{ day: "2026-10-19", count: 4 }] },
		{
			...payload,
			actions: [
				{
					event_name: "cv_link_open",
					section: "home",
					locale: "en",
					target: "en",
					count: 1,
				},
			],
		},
		{
			...payload,
			actions: [
				{
					event_name: "page_view",
					section: "home",
					locale: "en",
					target: null,
					count: 1,
				},
			],
		},
	])
		assert.throws(() => parseProductReport(candidate, defaultReportSelection));
});

test("report selection keeps display locale separate and rejects duplicate or incompatible filters", () => {
	assert.deepEqual(reportSelection({ locale: "es" }), defaultReportSelection);
	assert.equal(reportSelection({ section: "about" })?.region, "about-story");
	assert.equal(reportSelection({ eventLocale: "es" })?.eventLocale, "es");
	for (const query of [
		{ period: ["day", "month"] },
		{ offset: "3" },
		{ offset: "01" },
		{ section: "about", region: "home-featured" },
		{ eventLocale: "fr" },
		{ viewport: "large" },
	])
		assert.equal(reportSelection(query), null);
});

test("report HTTP adapter sends only versioned private filters and never caches or retries", async () => {
	let calls = 0;
	const config = {
		enabled: true,
		origin: "http://private-api:8000",
		token: "synthetic-test-only",
		request: async (
			target: Parameters<typeof fetch>[0],
			init?: RequestInit,
		) => {
			calls++;
			const url = new URL(String(target));
			assert.equal(url.pathname, "/internal/ops/v2/product-analytics");
			assert.deepEqual(Object.fromEntries(url.searchParams), {
				period: "month",
				offset: "0",
				section: "home",
				region_id: "home-featured",
				viewport: "desktop",
				locale: "all",
			});
			assert.equal(init?.cache, "no-store");
			assert.equal(init?.credentials, "omit");
			assert.equal(init?.redirect, "error");
			assert.ok(init?.signal);
			assert.equal(
				new Headers(init?.headers).get("authorization"),
				"Bearer synthetic-test-only",
			);
			return Response.json(productReportPayload());
		},
	};
	assert.equal(
		(await createProductReportHttp(config).read(defaultReportSelection)).kind,
		"available",
	);
	assert.equal(calls, 1);
	assert.deepEqual(
		await createProductReportHttp({ ...config, enabled: false }).read(
			defaultReportSelection,
		),
		{ kind: "disabled" },
	);
	assert.equal(calls, 1);
	for (const response of [
		new Response("synthetic private error", { status: 503 }),
		Response.json({ ...productReportPayload(), transcript: "synthetic" }),
		new Response("{}", { headers: { "content-type": "text/html" } }),
		new Response("x".repeat(256001), {
			headers: { "content-type": "application/json" },
		}),
	]) {
		let attempts = 0;
		assert.deepEqual(
			await createProductReportHttp({
				...config,
				request: async () => {
					attempts++;
					return response;
				},
			}).read(defaultReportSelection),
			{ kind: "unavailable" },
		);
		assert.equal(attempts, 1);
	}
});
