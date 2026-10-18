import "server-only";
import { readProductAnalytics } from "../features/analytics/application/read";
import { createProductHttp } from "../features/analytics/adapters/http";
import { createProductReportHttp } from "../features/analytics/adapters/report-http";
import { readProductReport } from "../features/analytics/application/read-report";
import type { ReportSelection } from "../features/analytics/domain/report";
import type { ProductReportRead } from "../features/analytics/domain/report";
import type { ProductRead } from "../features/analytics/domain/models";
import { reportSelection } from "../features/analytics/presentation/selection";
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
