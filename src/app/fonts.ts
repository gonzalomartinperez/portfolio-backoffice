import localFont from "next/font/local";

// Self-hosted variable fonts (latin subset, the same files Google Fonts serves), so the build needs
// no network (PBO-M3-8). Licences: public/licenses/*-OFL.txt and THIRD_PARTY_NOTICES.md.
const sans = localFont({
  src: "./_fonts/inter-latin-wght.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--font-sans",
});
const display = localFont({
  src: "./_fonts/inter-tight-latin-wght.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--font-display",
});
const mono = localFont({
  src: "./_fonts/jetbrains-mono-latin-wght.woff2",
  weight: "100 800",
  display: "swap",
  variable: "--font-mono",
});

export const fontClassName = `${sans.variable} ${display.variable} ${mono.variable}`;
