import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TrafficJam — Almaty traffic forecast",
  description:
    "Interactive traffic, weather, and event-aware congestion forecasting for Almaty.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
