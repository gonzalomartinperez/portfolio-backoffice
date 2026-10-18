import type { ProductReportPort } from "../application/read-report.ts";
import { readProductJson, type ProductHttpConfig } from "./read-json.ts";
import { parseProductReport } from "./validate-report.ts";

export function createProductReportHttp(
	config: ProductHttpConfig,
): ProductReportPort {
	return {
		async read(selection) {
			const search = new URLSearchParams({
				period: selection.period,
				offset: String(selection.offset),
				section: selection.section,
				region_id: selection.region,
				viewport: selection.viewport,
				locale: selection.eventLocale,
			});
			const result = await readProductJson(config, "v2", search);
			if (result.kind !== "available") return result;
			try {
				return {
					kind: "available",
					report: parseProductReport(result.value, selection),
				};
			} catch {
				return { kind: "unavailable" };
			}
		},
	};
}
