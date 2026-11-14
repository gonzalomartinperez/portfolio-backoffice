import { notFound } from "next/navigation";
import { kitEnabled } from "../../server/kit.ts";
import { Button } from "../../shared/ui/button.tsx";

export const metadata = {
  title: "Component kit — Portfolio backoffice",
  robots: { index: false, follow: false },
};
// The guard reads the environment per request; it must never be decided at build time.
export const dynamic = "force-dynamic";

const variants = ["default", "outline", "ghost"] as const;

export default function KitPage() {
  if (!kitEnabled()) notFound();
  return (
    <main id="main">
      <h1>Component kit</h1>
      <section id="button" aria-labelledby="button-heading">
        <h2 id="button-heading">Button</h2>
        <ul style={{ listStyle: "none", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          {variants.map((variant) => (
            <li key={variant}>
              <Button variant={variant}>{variant}</Button>
            </li>
          ))}
          <li>
            <Button variant="default" disabled>
              disabled
            </Button>
          </li>
          <li>
            <Button size="icon" aria-label="Icon button">
              +
            </Button>
          </li>
        </ul>
      </section>
    </main>
  );
}
