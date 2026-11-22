import { Suspense } from "react";
import { ProductOverview } from "../../features/analytics/presentation/overview";
import { Dashboard } from "../../features/operations/presentation/dashboard";
import { FeedbackOverview } from "../../features/operations/presentation/feedback";
import { loadProductAnalytics } from "../../server/analytics";
import { getAuthLocale, requireAccess } from "../../server/auth/session";
import { loadFeedback, loadGrafanaDestination, loadOperations } from "../../server/operations";
import { SectionSkeleton } from "../../shared/ui/route-states";
export const dynamic = "force-dynamic";

type Locale = "en" | "es";

// Each secondary upstream streams in its own Suspense boundary (PBO-M3-5), so a slow product or
// feedback read no longer holds the operations overview.
async function ProductSection({ locale }: { locale: Locale }) {
  return <ProductOverview result={await loadProductAnalytics()} locale={locale} />;
}

async function FeedbackSection({ locale }: { locale: Locale }) {
  return <FeedbackOverview result={await loadFeedback()} locale={locale} />;
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await requireAccess();
  const params = await searchParams;
  const locale: Locale =
    params.locale === "es" ? "es" : params.locale === "en" ? "en" : await getAuthLocale();
  const operations = await loadOperations();
  return (
    <Dashboard
      result={operations}
      projectOverview={
        <Suspense fallback={<SectionSkeleton locale={locale} lines={3} />}>
          <ProductSection locale={locale} />
        </Suspense>
      }
      assistantFeedback={
        <Suspense fallback={<SectionSkeleton locale={locale} lines={4} />}>
          <FeedbackSection locale={locale} />
        </Suspense>
      }
      role={access.role}
      locale={locale}
      fixture={process.env.OPERATIONS_SOURCE_MODE === "fixture"}
      grafanaUrl={loadGrafanaDestination()}
    />
  );
}
