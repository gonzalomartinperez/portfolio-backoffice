"use client";

// Replaces the root layout when it fails, so it carries its own document and no app styles.
// Both languages are shown because the locale cookie may be what failed to load.
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en-US">
      <title>The backoffice could not be displayed</title>
      <body
        style={{ fontFamily: "system-ui, sans-serif", colorScheme: "light dark", margin: "2rem" }}
      >
        <main id="main">
          <h1>The backoffice could not be displayed</h1>
          <p lang="es-419">No se pudo mostrar el backoffice.</p>
          <button type="button" onClick={() => retry()}>
            Try again / Reintentar
          </button>
        </main>
      </body>
    </html>
  );
}
