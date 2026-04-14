"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { MoodSelector } from "@/components/session/MoodSelector";
import { TrialLogger } from "@/components/session/TrialLogger";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { updateTargetAfterTrial } from "@/lib/srs/engine";
import { buildQueue } from "@/lib/srs/queue";
import type {
  ClientMood,
  PromptLevel,
  SessionTrial,
  Target,
} from "@/lib/types";
import { useSessionStore } from "@/store/session";
import { useSettingsStore } from "@/store/settings";
import { useTargetsStore } from "@/store/targets";

type Phase = "pre" | "active";

const linkSecondaryClass =
  "inline-flex flex-1 items-center justify-center rounded-md border border-neutral-300 bg-white px-3 py-2 text-center text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2";

function syncQueueFromStore(
  mood: ClientMood,
  cadencePerHour: number,
  setQueue: (q: Target[]) => void,
  setIndex: (n: number) => void,
  setSec: (n: number) => void
) {
  const t = useTargetsStore.getState().targets;
  const s = useSettingsStore.getState().settings;
  const q = buildQueue(t, mood, Date.now(), s);
  setQueue(q);
  setIndex(0);
  setSec(Math.max(1, Math.round(3600 / cadencePerHour)));
}

export default function SessionPage() {
  const router = useRouter();
  const targets = useTargetsStore((s) => s.targets);
  const targetsLength = targets.length;
  const loadTargets = useTargetsStore((s) => s.loadTargets);
  const updateTarget = useTargetsStore((s) => s.updateTarget);

  const settings = useSettingsStore((s) => s.settings);
  const loadSettings = useSettingsStore((s) => s.loadSettings);

  const activeSession = useSessionStore((s) => s.activeSession);
  const startSession = useSessionStore((s) => s.startSession);
  const endSession = useSessionStore((s) => s.endSession);
  const logTrial = useSessionStore((s) => s.logTrial);
  const updateMood = useSessionStore((s) => s.updateMood);

  const [phase, setPhase] = useState<Phase>("pre");
  const [preMood, setPreMood] = useState<ClientMood>("neutral");
  const [queue, setQueue] = useState<Target[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [moodModalOpen, setMoodModalOpen] = useState(false);
  const [draftMood, setDraftMood] = useState<ClientMood>("neutral");

  useLayoutEffect(() => {
    loadTargets();
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPreMood(settings.defaultMood);
  }, [settings.defaultMood]);

  const activeTargetIds = useMemo(
    () => targets.filter((t) => t.masteryStatus !== "on_hold").map((t) => t.id),
    [targets]
  );

  const cadenceSec = useMemo(() => {
    const c = activeSession?.cadencePerHour ?? settings.cadencePerHour;
    return Math.max(1, Math.round(3600 / c));
  }, [activeSession?.cadencePerHour, settings.cadencePerHour]);

  useEffect(() => {
    if (phase !== "active" || !activeSession) return;
    syncQueueFromStore(
      activeSession.clientMood,
      activeSession.cadencePerHour,
      setQueue,
      setCurrentIndex,
      setSecondsLeft
    );
    // Rebuild when session identity/mood/cadence changes or target list size changes — not on every target field update (SRS).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    phase,
    activeSession?.id,
    activeSession?.clientMood,
    activeSession?.cadencePerHour,
    targetsLength,
  ]);

  useEffect(() => {
    if (phase !== "active" || queue.length === 0) return;
    setSecondsLeft(cadenceSec);
  }, [phase, queue, cadenceSec]);

  useEffect(() => {
    if (phase !== "active" || queue.length === 0) return;
    const id = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setCurrentIndex((i) => (queue.length ? (i + 1) % queue.length : 0));
          return cadenceSec;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase, queue.length, cadenceSec]);

  const start = () => {
    if (activeTargetIds.length === 0) return;
    startSession({
      clientMood: preMood,
      cadencePerHour: settings.cadencePerHour,
      targetIds: activeTargetIds,
    });
    setPhase("active");
  };

  const applyMoodFromModal = () => {
    updateMood(draftMood);
    setMoodModalOpen(false);
  };

  const openMoodModal = () => {
    if (activeSession) setDraftMood(activeSession.clientMood);
    setMoodModalOpen(true);
  };

  const bumpAfterTrial = useCallback(() => {
    setCurrentIndex((i) => (queue.length ? (i + 1) % queue.length : 0));
    setSecondsLeft(cadenceSec);
  }, [queue.length, cadenceSec]);

  const handleLog = (
    outcome: SessionTrial["outcome"],
    promptLevel: PromptLevel
  ) => {
    if (!activeSession || queue.length === 0) return;
    const target = queue[currentIndex];
    if (!target) return;

    logTrial({
      targetId: target.id,
      outcome,
      promptLevel,
    });

    const latest = useTargetsStore.getState().targets.find((t) => t.id === target.id);
    if (latest) {
      const trialStub: Parameters<typeof updateTargetAfterTrial>[1] = {
        id: "",
        sessionId: activeSession.id,
        targetId: target.id,
        timestamp: Date.now(),
        outcome,
        promptLevel,
      };
      const next = updateTargetAfterTrial(latest, trialStub, Date.now());
      updateTarget(target.id, {
        easeFactor: next.easeFactor,
        interval: next.interval,
        repetitions: next.repetitions,
        nextDue: next.nextDue,
        lastPromptLevel: next.lastPromptLevel,
        updatedAt: next.updatedAt,
      });
    }

    bumpAfterTrial();
  };

  const finish = () => {
    if (!activeSession) return;
    const id = activeSession.id;
    endSession();
    setPhase("pre");
    router.push(`/session/summary?id=${encodeURIComponent(id)}`);
  };

  const currentTarget = useMemo(() => {
    const slot = queue[currentIndex];
    if (!slot) return null;
    return targets.find((t) => t.id === slot.id) ?? slot;
  }, [queue, currentIndex, targets]);

  const plannedTrials = useMemo(() => {
    if (!activeSession) return 0;
    return Math.round(
      (settings.sessionDurationMinutes / 60) * activeSession.cadencePerHour
    );
  }, [activeSession, settings.sessionDurationMinutes]);

  const trialsCount = activeSession?.trials.length ?? 0;
  const remainingApprox = Math.max(0, plannedTrials - trialsCount);

  if (phase === "pre" || !activeSession) {
    return (
      <main className="mx-auto min-h-screen max-w-lg p-4 sm:p-6">
        <h1 className="text-xl font-semibold text-neutral-900">Session</h1>
        <p className="mt-2 text-sm text-neutral-600">
          How is the client showing up today? Pick a mood, then start the session.
        </p>
        <div className="mt-6">
          <MoodSelector value={preMood} onChange={setPreMood} />
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            onClick={start}
            disabled={activeTargetIds.length === 0}
            className="flex-1"
          >
            Start session
          </Button>
          <Link href="/targets" className={linkSecondaryClass}>
            Manage targets
          </Link>
        </div>
        {activeTargetIds.length === 0 ? (
          <p className="mt-4 text-sm text-amber-800">
            Add at least one target that is not on hold before starting.
          </p>
        ) : null}
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-lg p-4 pb-28 sm:p-6">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Active session</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Mood:{" "}
            <span className="font-medium capitalize">{activeSession.clientMood}</span>
            {" · "}
            {activeSession.cadencePerHour} targets/hr
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={finish}>
          End session
        </Button>
      </div>

      {queue.length === 0 ? (
        <p className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          No targets in the queue. Add acquisition/maintenance targets (not on hold)
          or adjust settings.
        </p>
      ) : (
        <>
          <div className="mt-6 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm">
            <p className="font-medium text-neutral-900">
              Next target in: {secondsLeft}s
            </p>
            <p className="mt-1 text-neutral-600">
              Trials: {trialsCount} | Remaining (plan): ~{remainingApprox}
            </p>
            <Button
              type="button"
              variant="ghost"
              className="mt-2 px-0 text-sm text-neutral-700"
              onClick={() => {
                setCurrentIndex((i) => (queue.length ? (i + 1) % queue.length : 0));
                setSecondsLeft(cadenceSec);
              }}
            >
              Next target now
            </Button>
          </div>

          {currentTarget ? (
            <div className="mt-6">
              <TrialLogger
                target={currentTarget}
                onLog={handleLog}
                onSkip={() => {}}
              />
            </div>
          ) : null}
        </>
      )}

      <Button
        type="button"
        variant="secondary"
        className="fixed bottom-4 left-4 right-4 z-40 sm:left-auto sm:right-6 sm:w-auto"
        onClick={openMoodModal}
      >
        Update mood
      </Button>

      <Modal
        open={moodModalOpen}
        title="Update client mood"
        onClose={() => setMoodModalOpen(false)}
      >
        <MoodSelector value={draftMood} onChange={setDraftMood} />
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setMoodModalOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={applyMoodFromModal}>
            Apply &amp; re-sort queue
          </Button>
        </div>
      </Modal>
    </main>
  );
}
