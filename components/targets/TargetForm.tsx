"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { categoryFromMastery } from "@/lib/targetCategory";
import type { Target, TargetDomain } from "@/lib/types";

export type TargetFormSavePayload = Omit<
  Target,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "easeFactor"
  | "interval"
  | "repetitions"
  | "nextDue"
>;

const DOMAINS: TargetDomain[] = [
  "communication",
  "social",
  "adaptive",
  "motor",
  "academic",
  "behavior_reduction",
  "other",
];

function formatDomainLabel(d: TargetDomain): string {
  return d.replace(/_/g, " ");
}

export type TargetFormProps = {
  initialTarget?: Target | null;
  onSave: (payload: TargetFormSavePayload) => void;
  onCancel: () => void;
  submitLabel?: string;
};

export function TargetForm({
  initialTarget,
  onSave,
  onCancel,
  submitLabel = "Save target",
}: TargetFormProps) {
  const [label, setLabel] = useState(initialTarget?.label ?? "");
  const [domain, setDomain] = useState<TargetDomain>(
    initialTarget?.domain ?? "communication"
  );
  const [masteryStatus, setMasteryStatus] = useState<
    Target["masteryStatus"]
  >(initialTarget?.masteryStatus ?? "in_progress");
  const [notes, setNotes] = useState(initialTarget?.notes ?? "");

  useEffect(() => {
    if (!initialTarget) return;
    setLabel(initialTarget.label);
    setDomain(initialTarget.domain);
    setMasteryStatus(initialTarget.masteryStatus);
    setNotes(initialTarget.notes ?? "");
  }, [initialTarget]);

  const handleSave = () => {
    const trimmed = label.trim();
    if (!trimmed) return;
    onSave({
      label: trimmed,
      domain,
      masteryStatus,
      category: categoryFromMastery(masteryStatus),
      lastPromptLevel: initialTarget?.lastPromptLevel ?? "full_physical",
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <Input
        label="Label"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="e.g. Identifies colors: red, blue, green"
      />
      <Select
        label="Domain"
        value={domain}
        onChange={(e) => setDomain(e.target.value as TargetDomain)}
      >
        {DOMAINS.map((d) => (
          <option key={d} value={d}>
            {formatDomainLabel(d)}
          </option>
        ))}
      </Select>
      <Select
        label="Mastery status"
        value={masteryStatus}
        onChange={(e) =>
          setMasteryStatus(e.target.value as Target["masteryStatus"])
        }
      >
        <option value="in_progress">In progress</option>
        <option value="mastered">Mastered</option>
        <option value="on_hold">On hold</option>
      </Select>
      <Textarea
        label="Notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Optional context from the BIP…"
      />
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={handleSave} disabled={!label.trim()}>
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
