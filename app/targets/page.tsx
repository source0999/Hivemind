"use client";

import { useLayoutEffect, useMemo, useState } from "react";

import { TargetCard } from "@/components/targets/TargetCard";
import { TargetForm } from "@/components/targets/TargetForm";
import type { TargetFormSavePayload } from "@/components/targets/TargetForm";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import type { Target, TargetCategory, TargetDomain } from "@/lib/types";
import { useTargetsStore } from "@/store/targets";

const ALL = "all";

const DOMAIN_OPTIONS: (TargetDomain | typeof ALL)[] = [
  ALL,
  "communication",
  "social",
  "adaptive",
  "motor",
  "academic",
  "behavior_reduction",
  "other",
];

function formatDomainLabel(d: TargetDomain | typeof ALL): string {
  if (d === ALL) return "All domains";
  return d.replace(/_/g, " ");
}

export default function TargetsPage() {
  // Subscribe to `targets` explicitly so re-renders run when the list changes.
  // Selecting only stable action refs (e.g. `s => s.addTarget`) would *not*
  // re-render when targets update (useSyncExternalStore sees the same snapshot).
  const targets = useTargetsStore((s) => s.targets);
  const loadTargets = useTargetsStore((s) => s.loadTargets);
  const addTarget = useTargetsStore((s) => s.addTarget);
  const updateTarget = useTargetsStore((s) => s.updateTarget);
  const deleteTarget = useTargetsStore((s) => s.deleteTarget);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Target | null>(null);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<
    TargetCategory | typeof ALL
  >(ALL);
  const [filterDomain, setFilterDomain] = useState<TargetDomain | typeof ALL>(
    ALL
  );

  // useLayoutEffect: hydrate from localStorage before paint so a full refresh
  // does not flash an empty list (useEffect runs too late).
  useLayoutEffect(() => {
    loadTargets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return targets.filter((t) => {
      if (filterCategory !== ALL && t.category !== filterCategory) return false;
      if (filterDomain !== ALL && t.domain !== filterDomain) return false;
      if (!q) return true;
      const inLabel = t.label.toLowerCase().includes(q);
      const inNotes = (t.notes ?? "").toLowerCase().includes(q);
      return inLabel || inNotes;
    });
  }, [targets, search, filterCategory, filterDomain]);

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (id: string) => {
    const t = targets.find((x) => x.id === id);
    if (!t) return;
    setEditing(t);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleSave = (payload: TargetFormSavePayload) => {
    if (editing) {
      updateTarget(editing.id, {
        label: payload.label,
        domain: payload.domain,
        masteryStatus: payload.masteryStatus,
        notes: payload.notes,
        lastPromptLevel: payload.lastPromptLevel,
      });
    } else {
      addTarget(payload);
    }
    closeModal();
  };

  const handleDelete = (id: string) => {
    if (
      typeof window !== "undefined" &&
      !window.confirm("Delete this target? This cannot be undone.")
    ) {
      return;
    }
    deleteTarget(id);
  };

  return (
    <main className="mx-auto min-h-screen max-w-3xl p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Targets</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Manage BIP targets. Category follows mastery: mastered → maintenance;
            otherwise acquisition.
          </p>
        </div>
        <Button type="button" onClick={openAdd}>
          Add target
        </Button>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-0 flex-1 sm:max-w-xs">
          <Input
            label="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Label or notes…"
          />
        </div>
        <Select
          label="Category"
          value={filterCategory}
          onChange={(e) =>
            setFilterCategory(e.target.value as TargetCategory | typeof ALL)
          }
          className="sm:w-40"
        >
          <option value={ALL}>All categories</option>
          <option value="acquisition">Acquisition</option>
          <option value="maintenance">Maintenance</option>
        </Select>
        <Select
          label="Domain"
          value={filterDomain}
          onChange={(e) =>
            setFilterDomain(e.target.value as TargetDomain | typeof ALL)
          }
          className="sm:w-48"
        >
          {DOMAIN_OPTIONS.map((d) => (
            <option key={d} value={d}>
              {formatDomainLabel(d)}
            </option>
          ))}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 px-4 py-8 text-center text-sm text-neutral-600">
          {targets.length === 0
            ? "No targets yet. Add one to get started."
            : "No targets match your filters."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((t) => (
            <li key={t.id}>
              <TargetCard
                target={t}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={modalOpen}
        title={editing ? "Edit target" : "Add target"}
        onClose={closeModal}
      >
        <TargetForm
          key={editing?.id ?? "new"}
          initialTarget={editing}
          onSave={handleSave}
          onCancel={closeModal}
          submitLabel={editing ? "Save changes" : "Add target"}
        />
      </Modal>
    </main>
  );
}
