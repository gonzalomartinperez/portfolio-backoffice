import type { EventName, Section, ProductTarget } from "./models.ts";

export const reportPeriods = ["day", "week", "month"] as const;
export const reportViewports = ["mobile", "tablet", "desktop"] as const;
export const eventLocales = ["all", "en", "es"] as const;
export const shellRegions = ["site-header", "site-footer"] as const;
export const regionGroups = {
	home: [
		"home-featured",
		"home-experience",
		"home-about",
		"home-education",
		"home-contact",
	],
	about: [
		"about-story",
		"about-focus",
		"about-principles",
		"about-opportunities",
	],
	work: [
		"work-rampy",
		"work-teamcubation",
		"work-cooperativa",
		"work-independent",
		"work-projects",
	],
	filomena: [
		"filomena-problem",
		"filomena-approach",
		"filomena-outcomes",
		"filomena-evidence",
	],
	stack: ["stack-catalogue", "stack-scope"],
	education: [
		"education-degree",
		"education-curriculum",
		"education-credentials",
		"education-evidence",
	],
	cv: ["cv-downloads", "cv-summary"],
	contact: ["contact-channels", "contact-resume"],
} as const satisfies Record<Section, readonly string[]>;
export type Region =
	| (typeof shellRegions)[number]
	| (typeof regionGroups)[Section][number];
export type ReportPeriod = (typeof reportPeriods)[number];
export type ReportViewport = (typeof reportViewports)[number];
export type EventLocale = (typeof eventLocales)[number];
export interface ReportSelection {
	period: ReportPeriod;
	offset: 0 | 1 | 2;
	section: Section;
	region: Region;
	viewport: ReportViewport;
	eventLocale: EventLocale;
}
export const defaultReportSelection: ReportSelection = {
	period: "month",
	offset: 0,
	section: "home",
	region: "home-featured",
	viewport: "desktop",
	eventLocale: "all",
};
export function regionsFor(section: Section): readonly Region[] {
	return [...shellRegions, ...regionGroups[section]];
}
export function firstRegion(section: Section): Region {
	return regionGroups[section][0];
}
export interface ActivityCounts {
	views: number;
	clicks: number;
	exposures: number;
}
export interface ProductReport {
	selection: ReportSelection;
	window: { start: string; end: string; partial: boolean };
	generatedAt: string;
	firstObservedAt: string | null;
	lastObservedAt: string | null;
	countryCollection: "disabled" | "proxyHeader";
	totals: ActivityCounts;
	days: { day: string; views: number }[];
	countries: { country: string; views: number }[];
	sections: (ActivityCounts & { section: Section })[];
	regions: { region: Region; clicks: number; exposures: number }[];
	cells: { x: number; y: number; count: number }[];
	actions: {
		event: Exclude<EventName, "page_view">;
		section: Section;
		locale: "en" | "es";
		target: ProductTarget | null;
		count: number;
	}[];
	selectedRegionExposures: number;
	suppressedClicks: number;
}
export type ProductReportRead =
	| { kind: "disabled" }
	| { kind: "unavailable" }
	| { kind: "available"; report: ProductReport };
