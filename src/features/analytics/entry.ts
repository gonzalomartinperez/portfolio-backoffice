import "server-only";
import { readProductAnalytics } from "./application/read";
import { createProductHttp } from "./adapters/http";
import { createProductReportHttp } from "./adapters/report-http";
import { readProductReport } from "./application/read-report";
import type { ReportSelection } from "./domain/report";
import type { ProductReportRead } from "./domain/report";
import type { ProductRead } from "./domain/models";
import { reportSelection } from "./presentation/selection";
export function loadProductAnalytics() {
	return readProductAnalytics(
		createProductHttp({
			enabled: process.env.PRODUCT_ANALYTICS_ENABLED === "true",
			origin: process.env.OPERATIONS_API_ORIGIN,
			token: process.env.OPERATIONS_READ_TOKEN,
		}),
	);
}
export function loadProductReport(selection: ReportSelection) {
	return readProductReport(
		createProductReportHttp({
			enabled: process.env.PRODUCT_ANALYTICS_ENABLED === "true",
			origin: process.env.OPERATIONS_API_ORIGIN,
			token: process.env.OPERATIONS_READ_TOKEN,
		}),
		selection,
	);
}

export type AnalyticsView =
	| { kind: "invalid" }
	| { kind: "legacy"; result: ProductRead }
	| { kind: "calendar"; selection: ReportSelection; result: ProductReportRead };

export async function loadAnalyticsView(
	params: Record<string, string | string[] | undefined>,
): Promise<AnalyticsView> {
	if (params.view === "legacy")
		return { kind: "legacy", result: await loadProductAnalytics() };
	if (params.view !== undefined && params.view !== "calendar")
		return { kind: "invalid" };
	const selection = reportSelection(params);
	if (!selection) return { kind: "invalid" };
	return {
		kind: "calendar",
		selection,
		result: await loadProductReport(selection),
	};
}
