import { computeUrgency } from "@/lib/srs/engine";
import type { ClientMood, Settings, Target } from "@/lib/types";

export function buildQueue(
  targets: Target[],
  mood: ClientMood,
  now: number,
  settings: Settings
): Target[] {
  const active = targets.filter((t) => t.masteryStatus !== "on_hold");

  const scored = active.map((t) => ({
    target: t,
    urgency: computeUrgency(t, mood, now),
  }));

  scored.sort((a, b) => b.urgency - a.urgency);

  const totalSlots = Math.ceil(settings.cadencePerHour / 4);
  const acqSlots = Math.round(totalSlots * settings.acquisitionWeight);
  const mntSlots = totalSlots - acqSlots;

  const acquisition = scored
    .filter((s) => s.target.category === "acquisition")
    .slice(0, acqSlots);
  const maintenance = scored
    .filter((s) => s.target.category === "maintenance")
    .slice(0, mntSlots);

  const queue: Target[] = [];
  const maxLen = Math.max(acquisition.length, maintenance.length);
  for (let i = 0; i < maxLen; i++) {
    if (maintenance[i]) queue.push(maintenance[i].target);
    if (acquisition[i]) queue.push(acquisition[i].target);
  }

  return queue;
}
