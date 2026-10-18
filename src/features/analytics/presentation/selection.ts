import { sections } from "../domain/models.ts";
import {
	defaultReportSelection,
	eventLocales,
	firstRegion,
	regionsFor,
	reportPeriods,
	reportViewports,
	type ReportSelection,
} from "../domain/report.ts";

export function reportSelection(
	params: Record<string, string | string[] | undefined>,
): ReportSelection | null {
	const period =
		params.period === undefined
			? defaultReportSelection.period
			: reportPeriods.find((value) => value === params.period);
	const section =
		params.section === undefined
			? defaultReportSelection.section
			: sections.find((value) => value === params.section);
	const viewport =
		params.viewport === undefined
			? defaultReportSelection.viewport
			: reportViewports.find((value) => value === params.viewport);
	const eventLocale =
		params.eventLocale === undefined
			? defaultReportSelection.eventLocale
			: eventLocales.find((value) => value === params.eventLocale);
	const offset =
		params.offset === undefined || params.offset === "0"
			? 0
			: params.offset === "1"
				? 1
				: params.offset === "2"
					? 2
					: null;
	if (!period || !section || !viewport || !eventLocale || offset === null)
		return null;
	const region =
		params.region === undefined
			? firstRegion(section)
			: regionsFor(section).find((value) => value === params.region);
	return region
		? { period, section, viewport, eventLocale, offset, region }
		: null;
}
