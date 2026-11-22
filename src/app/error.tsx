"use client";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { Button } from "../shared/ui/button";
import { ButtonLink } from "../shared/ui/button-link";
import { routeStateCopy } from "../shared/ui/route-states";

const noSubscription = () => () => {};

// The root layout sets <html lang> on the server (es-419 or en-US); the boundary follows it.
export default function RouteError({ retry }: { error: unknown; retry: () => void }) {
  const lang = useSyncExternalStore(
    noSubscription,
    () => document.documentElement.lang,
    () => "en-US",
  );
  const locale = lang.startsWith("es") ? "es" : "en";
  const t = routeStateCopy[locale];
  const heading = useRef<HTMLHeadingElement>(null);
  // The failed segment unmounted; move focus to the explanation instead of leaving it on <body>.
  useEffect(() => heading.current?.focus(), []);
  return (
    <main id="main" className="operations-shell route-state">
      <section className="operation-card">
        <h1 ref={heading} tabIndex={-1}>
          {t.errorTitle}
        </h1>
        <p role="alert">{t.errorBody}</p>
        <div className="route-state-actions">
          <Button variant="default" onClick={() => retry()}>
            {t.retry}
          </Button>
          <ButtonLink href={`/?locale=${locale}`}>{t.home}</ButtonLink>
        </div>
      </section>
    </main>
  );
}
