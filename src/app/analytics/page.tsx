import { requireAccess, getAuthLocale } from "../../features/auth/server";
import { loadAnalyticsView } from "../../features/analytics/entry";
import { ProductMetrics } from "../../features/analytics/presentation/metrics";
import { productCopy } from "../../features/analytics/presentation/copy";
import { Preferences } from "../../features/operations/presentation/preferences";
import { ButtonLink } from "../../components/ui/button-link";
import { CalendarReport } from "../../features/analytics/presentation/report";
import { ReportFilters } from "../../features/analytics/presentation/report-filters";
import { reportCopy } from "../../features/analytics/presentation/report-copy";
import styles from "../../features/analytics/presentation/report.module.css";
export const dynamic = "force-dynamic";
export default async function Page({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	await requireAccess();
	const params = await searchParams;
	const locale =
		params.locale === "es"
			? "es"
			: params.locale === "en"
				? "en"
				: await getAuthLocale();
	const view = await loadAnalyticsView(params);
	const t = productCopy[locale];
	const reportText = reportCopy[locale];
	return (
		<main id="main" lang={locale} className="operations-shell">
			<header className="operations-header">
				<div>
					<p className="eyebrow">GMP / Backoffice</p>
					<h1>{t.title}</h1>
					<p>
						{view.kind === "legacy" ? t.description : reportText.description}
					</p>
				</div>
				<nav aria-label={t.back}>
					<ButtonLink href={`/?locale=${locale}`}>{t.back}</ButtonLink>
					<ButtonLink href={`/privacy?locale=${locale}`}>
						{t.privacy}
					</ButtonLink>
					<Preferences locale={locale} />
				</nav>
			</header>
			{process.env.OPERATIONS_SOURCE_MODE === "fixture" && (
				<p className="operational-notice">{t.fixture}</p>
			)}
			<nav
				className={`operations-toolbar ${styles.navigation}`}
				aria-label={reportText.calendar}
			>
				<ButtonLink
					href={`/analytics?locale=${locale}`}
					aria-current={view.kind === "calendar" ? "page" : undefined}
				>
					{reportText.calendar}
				</ButtonLink>
				<ButtonLink
					href={`/analytics?view=legacy&locale=${locale}`}
					aria-current={view.kind === "legacy" ? "page" : undefined}
				>
					{reportText.legacy}
				</ButtonLink>
			</nav>
			<p>{view.kind === "legacy" ? t.scope : reportText.scope}</p>
			{view.kind === "invalid" ? (
				<section className="operational-notice">
					<h2>{reportText.invalid}</h2>
					<p>{reportText.invalidBody}</p>
					<ButtonLink href={`/analytics?locale=${locale}`}>
						{reportText.reset}
					</ButtonLink>
				</section>
			) : (
				<>
					{view.kind === "calendar" && (
						<ReportFilters locale={locale} selection={view.selection} />
					)}
					{view.result.kind !== "available" ? (
						<section className="operational-notice">
							<h2>
								{view.result.kind === "disabled" ? t.disabled : t.unavailable}
							</h2>
							<p>
								{view.result.kind === "disabled"
									? t.disabledBody
									: t.unavailableBody}
							</p>
						</section>
					) : view.kind === "legacy" ? (
						<ProductMetrics snapshot={view.result.snapshot} locale={locale} />
					) : (
						<CalendarReport report={view.result.report} locale={locale} />
					)}
				</>
			)}
		</main>
	);
}
