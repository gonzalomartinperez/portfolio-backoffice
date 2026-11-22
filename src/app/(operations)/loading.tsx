import { getDocumentLocale } from "../../server/auth/session";
import { routeStateCopy, SectionSkeleton } from "../../shared/ui/route-states";

// Not a <main>: while the page streams in, React keeps this fallback next to the incoming page,
// whose own main#main must stay the only main landmark and skip-link target.
export default async function Loading() {
  const locale = await getDocumentLocale();
  return (
    <div className="operations-shell">
      <p role="status" className="sr-only">
        {routeStateCopy[locale].loading}
      </p>
      <SectionSkeleton locale={locale} lines={2} />
      <SectionSkeleton locale={locale} lines={4} />
    </div>
  );
}
