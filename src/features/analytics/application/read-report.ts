import type { ProductReportRead, ReportSelection } from "../domain/report.ts";
export interface ProductReportPort {
	read(selection: ReportSelection): Promise<ProductReportRead>;
}
export function readProductReport(
	port: ProductReportPort,
	selection: ReportSelection,
): Promise<ProductReportRead> {
	return port.read(selection);
}
