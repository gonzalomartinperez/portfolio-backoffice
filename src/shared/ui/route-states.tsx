// Route-level states shared by loading.tsx, error.tsx, not-found.tsx and the per-section
// Suspense fallbacks (PBO-M3-5). Typed US English and es-419 copy only.
export type RouteStateLocale = "en" | "es";

export const routeStateCopy = {
  en: {
    loading: "Loading",
    loadingSection: "Loading this section",
    errorTitle: "This page could not be displayed",
    errorBody:
      "Something failed while preparing the page. No data was changed. Try again, or return to the overview.",
    retry: "Try again",
    home: "Back to the overview",
    notFoundTitle: "Page not found",
    notFoundBody: "This address does not match any page in the backoffice.",
  },
  es: {
    loading: "Cargando",
    loadingSection: "Cargando esta sección",
    errorTitle: "No se pudo mostrar esta página",
    errorBody:
      "Algo falló al preparar la página. No se modificó ningún dato. Vuelve a intentarlo o regresa al resumen.",
    retry: "Reintentar",
    home: "Volver al resumen",
    notFoundTitle: "Página no encontrada",
    notFoundBody: "Esta dirección no corresponde a ninguna página del backoffice.",
  },
} as const satisfies Record<RouteStateLocale, Record<string, string>>;

/** A quiet placeholder with the same card frame as the section it stands in for. */
export function SectionSkeleton({
  locale,
  lines = 3,
}: {
  locale: RouteStateLocale;
  lines?: number;
}) {
  return (
    <section
      className="operation-card route-skeleton"
      aria-busy="true"
      aria-label={routeStateCopy[locale].loadingSection}
    >
      {Array.from({ length: lines }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static decorative placeholder lines.
        <span key={index} className="route-skeleton-line" aria-hidden="true" />
      ))}
    </section>
  );
}
