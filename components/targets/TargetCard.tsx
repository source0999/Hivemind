import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { categoryFromMastery } from "@/lib/targetCategory";
import type { Target } from "@/lib/types";

export type TargetCardProps = {
  target: Target;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  showSRSInfo?: boolean;
};

function formatPromptLevel(level: Target["lastPromptLevel"]): string {
  return level.replace(/_/g, " ");
}

function formatDomain(domain: Target["domain"]): string {
  return domain.replace(/_/g, " ");
}

export function TargetCard({
  target,
  onEdit,
  onDelete,
  showSRSInfo,
}: TargetCardProps) {
  const category = categoryFromMastery(target.masteryStatus);
  const categoryTone =
    category === "maintenance" ? ("success" as const) : ("neutral" as const);

  return (
    <Card className="border-2 border-neutral-900 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <h3 className="font-medium text-neutral-900">{target.label}</h3>
          <div className="flex flex-wrap gap-2">
            <Badge tone="muted" className="capitalize">
              {formatDomain(target.domain)}
            </Badge>
            <Badge tone={categoryTone} className="capitalize">
              {category === "acquisition" ? "Acquisition" : "Maintenance"}
            </Badge>
            <Badge tone="warning" className="normal-case">
              Prompt: {formatPromptLevel(target.lastPromptLevel)}
            </Badge>
          </div>
          {target.notes ? (
            <div className="rounded-md border-2 border-neutral-200 bg-neutral-50 p-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-700">
                BIP notes
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-800">
                {target.notes}
              </p>
            </div>
          ) : null}
          {showSRSInfo ? (
            <p className="text-xs text-neutral-500">
              SRS: interval {target.interval} · EF {target.easeFactor.toFixed(2)} · reps{" "}
              {target.repetitions}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-2 sm:flex-col">
          <Button
            type="button"
            variant="secondary"
            className="flex-1 sm:flex-none"
            onClick={() => onEdit(target.id)}
          >
            Edit
          </Button>
          <Button
            type="button"
            variant="danger"
            className="flex-1 sm:flex-none"
            onClick={() => onDelete(target.id)}
          >
            Delete
          </Button>
        </div>
      </div>
    </Card>
  );
}
