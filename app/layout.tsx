import type { Metadata } from "next";

import { AppShell } from "@/components/layout/AppShell";

import "./globals.css";

export const metadata: Metadata = {
  title: "Hivemind",
  description: "Clinical utility for ABA session target pacing",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-100 antialiased text-neutral-950">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
