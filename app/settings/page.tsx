"use client";

import { useLayoutEffect, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { localStore } from "@/lib/storage/localStorage";
import { useSettingsStore } from "@/store/settings";

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SettingsPage() {
  const settings = useSettingsStore((s) => s.settings);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  const [cadenceInput, setCadenceInput] = useState(String(settings.cadencePerHour));
  const [acqInput, setAcqInput] = useState(
    String(Math.round(settings.acquisitionWeight * 100))
  );
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useLayoutEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    setCadenceInput(String(settings.cadencePerHour));
  }, [settings.cadencePerHour]);
  useLayoutEffect(() => {
    setAcqInput(String(Math.round(settings.acquisitionWeight * 100)));
  }, [settings.acquisitionWeight]);

  const showSaved = (msg: string) => {
    setSaveMessage(msg);
    window.setTimeout(() => setSaveMessage(null), 1800);
  };

  const applyCadence = () => {
    const n = Number(cadenceInput);
    if (!Number.isFinite(n)) return;
    const clamped = Math.min(60, Math.max(6, Math.round(n)));
    updateSettings({ cadencePerHour: clamped });
    setCadenceInput(String(clamped));
    showSaved("Cadence saved");
  };

  const applyAcquisitionWeight = () => {
    const n = Number(acqInput);
    if (!Number.isFinite(n)) return;
    const clampedPct = Math.min(100, Math.max(0, Math.round(n)));
    const acq = clampedPct / 100;
    const mnt = 1 - acq;
    updateSettings({
      acquisitionWeight: acq,
      maintenanceWeight: mnt,
    });
    setAcqInput(String(clampedPct));
    showSaved("Acquisition weight saved");
  };

  const exportData = () => {
    const snapshot = localStore.exportSnapshot();
    const stamp = new Date().toISOString().slice(0, 10);
    downloadJson(`hivemind-export-${stamp}.json`, snapshot);
  };

  return (
    <main className="mx-auto max-w-lg px-4 py-6 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-neutral-950">Settings</h1>
        <Link
          href="/"
          className="text-sm font-bold text-neutral-900 underline decoration-2 underline-offset-2"
        >
          Home
        </Link>
      </div>

      <Card className="mt-6 border-2 border-neutral-900 bg-white p-4 shadow-md">
        <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-950">
          Session cadence
        </h2>
        <p className="mt-2 text-sm font-medium text-neutral-800">
          Targets per hour (session prompts). Range 6–60.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input
              label="Cadence (targets / hour)"
              type="number"
              min={6}
              max={60}
              value={cadenceInput}
              onChange={(e) => setCadenceInput(e.target.value)}
              className="border-2 border-neutral-900 font-semibold"
            />
          </div>
          <Button
            type="button"
            onClick={applyCadence}
            className="border-2 border-black sm:shrink-0"
          >
            Save
          </Button>
        </div>
        <p className="mt-3 text-xs font-semibold text-neutral-700">
          Current: {settings.cadencePerHour} / hr (~{" "}
          {Math.max(1, Math.round(3600 / settings.cadencePerHour))}s between prompts)
        </p>
      </Card>

      <Card className="mt-4 border-2 border-neutral-900 bg-white p-4 shadow-md">
        <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-950">
          Target mix
        </h2>
        <p className="mt-2 text-sm font-medium text-neutral-800">
          Acquisition weight (0-100%). Maintenance is auto-set to the remainder.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input
              label="Acquisition weight (%)"
              type="number"
              min={0}
              max={100}
              value={acqInput}
              onChange={(e) => setAcqInput(e.target.value)}
              className="border-2 border-neutral-900 font-semibold"
            />
          </div>
          <Button
            type="button"
            onClick={applyAcquisitionWeight}
            className="border-2 border-black sm:shrink-0"
          >
            Save
          </Button>
        </div>
        <p className="mt-3 text-xs font-semibold text-neutral-700">
          Current mix: {Math.round(settings.acquisitionWeight * 100)}% acquisition /{" "}
          {Math.round(settings.maintenanceWeight * 100)}% maintenance
        </p>
      </Card>

      {saveMessage ? (
        <div className="mt-4 rounded-md border-2 border-emerald-900 bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-950">
          {saveMessage}
        </div>
      ) : null}

      <Card className="mt-4 border-2 border-neutral-900 bg-white p-4 shadow-md">
        <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-950">
          Data export
        </h2>
        <p className="mt-2 text-sm font-medium text-neutral-800">
          Download everything stored in this browser: targets, sessions, and settings
          as one JSON file.
        </p>
        <Button
          type="button"
          variant="secondary"
          className="mt-4 w-full border-2 border-neutral-900 font-semibold"
          onClick={exportData}
        >
          Export all data (.json)
        </Button>
      </Card>

      <p className="mt-8 text-center text-xs font-medium text-neutral-700">
        Storage: localStorage on this device. PostgreSQL / Spirit sync is not enabled.
      </p>
    </main>
  );
}
