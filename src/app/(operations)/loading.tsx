import { getDocumentLocale } from "../../server/auth/session";
import { routeStateCopy, SectionSkeleton } from "../../shared/ui/route-states";

export default async function Loading() {
  const locale = await getDocumentLocale();
  return (
    <main id="main" className="operations-shell">
      <p role="status" className="sr-only">
        {routeStateCopy[locale].loading}
      </p>
      <SectionSkeleton locale={locale} lines={2} />
      <SectionSkeleton locale={locale} lines={4} />
    </main>
  );
}
