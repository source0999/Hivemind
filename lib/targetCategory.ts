import type { Target, TargetCategory } from "@/lib/types";

/** Spec: mastered → maintenance; otherwise acquisition (includes in_progress, on_hold). */
export function categoryFromMastery(
  masteryStatus: Target["masteryStatus"]
): TargetCategory {
  return masteryStatus === "mastered" ? "maintenance" : "acquisition";
}
