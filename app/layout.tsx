import type { Metadata } from "next";
import { Analytics } from '@vercel/analytics/next';

import "./globals.css";

export const metadata: Metadata = {
  title: "Persona Panel",
  description: "Decision support interface for persona-based evaluations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body
        className="min-h-full font-sans text-foreground"
        suppressHydrationWarning
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
