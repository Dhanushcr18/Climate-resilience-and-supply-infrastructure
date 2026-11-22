import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ResilienceOps | Calm Logistics Utility & Disaster Relief Dispatch",
  description:
    "Autonomous predictive logistics resilience agent anticipating flooding and road blockages to reroute critical relief supply chains.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body {
                background-color: #f8f9fd !important;
                color: #191c1f !important;
                margin: 0;
                padding: 0;
                font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              }
              svg {
                max-width: 100%;
              }
            `,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-surface font-body text-on-surface antialiased">
        {children}
      </body>
    </html>
  );
}
