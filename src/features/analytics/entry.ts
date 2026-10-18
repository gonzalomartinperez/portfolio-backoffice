import "server-only";
import { readProductAnalytics } from "./application/read";
import { createProductHttp } from "./adapters/http";
import { createProductReportHttp } from "./adapters/report-http";
import { readProductReport } from "./application/read-report";
import type { ReportSelection } from "./domain/report";
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
