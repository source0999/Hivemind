import { Suspense } from "react";

import { SessionSummaryContent } from "./SessionSummaryContent";

export default function SessionSummaryPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-lg p-4 sm:p-6">
          <p className="text-sm text-neutral-600">Loading summary…</p>
        </main>
      }
    >
      <SessionSummaryContent />
    </Suspense>
  );
}
