'use client';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import {
  emptyWork,
  type AdventureEvent,
  type AdventureView,
  type Work,
} from './contracts';

// Serialize writes against the latest server revision. Typing stays local and responsive;
// every explicit action first flushes those edits through the same queue.
export function useAdventure() {
  const [view, setView] = useState<AdventureView | null>(null);
  const [draft, setDraft] = useState<Work>(emptyWork);
  const [busy, setBusy] = useState(false),
    [saving, setSaving] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState(''),
    [canRetry, setCanRetry] = useState(false);
  const current = useRef<AdventureView | null>(null),
    work = useRef(draft);
  const edited = useRef(0),
    saved = useRef(0),
    failed = useRef(false),
    acting = useRef(false);
  const navigating = useRef(false);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const retry = useRef<{
    body: Record<string, unknown>;
    version: number;
  } | null>(null);

  async function accept(response: Response, version: number, force = false) {
    const data = await response.json();
    if (!response.ok)
      throw Error(data.message ?? 'Vi fikk ikke lagret. Prøv igjen.');
    const next = data.view as AdventureView;
    const changed = current.current?.itemId !== next.itemId;
    current.current = next;
    setView(next);
    if (force || changed) {
      edited.current = 0;
      saved.current = 0;
      work.current = next.work;
      setDraft(next.work);
    } else {
      saved.current = Math.max(saved.current, version);
      if (edited.current === version) {
        work.current = next.work;
        setDraft(next.work);
      }
    }
    setSaving(edited.current !== saved.current);
  }
  function enqueue<T>(run: () => Promise<T>) {
    const task = queue.current.then(run);
    queue.current = task.catch(() => {});
    return task;
  }
  async function transmit(body: Record<string, unknown>, version: number) {
    retry.current = { body, version };
    try {
      await accept(
        await fetch('/api/star-wars', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }),
        version,
      );
      retry.current = null;
      failed.current = false;
      setError('');
      setCanRetry(false);
    } catch (e) {
      failed.current = true;
      setCanRetry(true);
      setError(
        e instanceof Error ? e.message : 'Handlingen kunne ikke lagres.',
      );
      throw e;
    }
  }
  async function send(event: AdventureEvent) {
    const v = current.current;
    if (!v?.sessionId || !v.itemId)
      throw Error('Hent det lagrede arbeidet først.');
    await transmit(
      {
        command: 'turn',
        sessionId: v.sessionId,
        itemId: v.itemId,
        revision: v.revision,
        requestId: crypto.randomUUID(),
        event,
      },
      edited.current,
    );
  }
  async function flush() {
    if (failed.current) throw Error('Prøv lagring igjen først.');
    if (edited.current !== saved.current)
      await send({ type: 'work', work: work.current });
  }
  const saveLater = useEffectEvent(() => {
    void enqueue(async () => {
      if (
        !current.current?.running ||
        current.current.status === 'correct' ||
        failed.current
      )
        return;
      await flush();
    }).catch(() => {});
  });
  useEffect(() => {
    if (edited.current === saved.current) return;
    const timer = setTimeout(saveLater, 350);
    return () => clearTimeout(timer);
  }, [draft]);
  const receive = useEffectEvent((response: Response) =>
    accept(response, 0, true),
  );
  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/star-wars', {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(receive)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, []);
  function change(next: Work) {
    if (
      acting.current ||
      navigating.current ||
      failed.current ||
      !current.current?.running ||
      current.current.status === 'correct'
    )
      return;
    edited.current++;
    work.current = next;
    setDraft(next);
    setSaving(true);
  }
  async function action(event: AdventureEvent | 'start') {
    if (acting.current || navigating.current || failed.current) return false;
    acting.current = true;
    setBusy(true);
    try {
      await enqueue(async () => {
        await flush();
        if (event === 'start')
          await transmit(
            { command: 'start', switchFromPrevious: true },
            edited.current,
          );
        else await send(event);
      });
      return true;
    } catch {
      return false;
    } finally {
      acting.current = false;
      setBusy(false);
    }
  }
  async function leave() {
    if (navigating.current) return false;
    navigating.current = true;
    setLeaving(true);
    try {
      return await enqueue(async () => {
        if (failed.current) return false;
        await flush();
        if (current.current?.running) await send({ type: 'pause' });
        return true;
      });
    } catch {
      return false;
    } finally {
      navigating.current = false;
      setLeaving(false);
    }
  }
  async function recover(useRetry: boolean) {
    if (acting.current || navigating.current) return;
    acting.current = true;
    setBusy(true);
    try {
      await enqueue(async () => {
        if (useRetry && retry.current)
          await transmit(retry.current.body, retry.current.version);
        else {
          await accept(
            await fetch('/api/star-wars', { cache: 'no-store' }),
            0,
            true,
          );
          failed.current = false;
          retry.current = null;
          setCanRetry(false);
          setError('');
        }
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunne ikke hente arbeidet.');
    } finally {
      acting.current = false;
      setBusy(false);
    }
  }
  return {
    view,
    draft,
    change,
    busy: busy || leaving,
    saving,
    error,
    canRetry,
    action,
    leave,
    recover,
  };
}
