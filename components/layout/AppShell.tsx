"use client";

import { Navbar } from "@/components/layout/Navbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="min-h-screen pb-[calc(5rem+env(safe-area-inset-bottom,0px))]">
        {children}
      </div>
      <Navbar />
    </>
  );
}
