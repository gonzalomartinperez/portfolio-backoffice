import { getDocumentLocale } from "../server/auth/session";
import { ButtonLink } from "../shared/ui/button-link";
import { routeStateCopy } from "../shared/ui/route-states";

export default async function NotFound() {
  const locale = await getDocumentLocale();
  const t = routeStateCopy[locale];
  return (
    <main id="main" className="operations-shell route-state">
      <section className="operation-card">
        <h1>{t.notFoundTitle}</h1>
        <p>{t.notFoundBody}</p>
        <ButtonLink href={`/?locale=${locale}`}>{t.home}</ButtonLink>
      </section>
    </main>
  );
}
