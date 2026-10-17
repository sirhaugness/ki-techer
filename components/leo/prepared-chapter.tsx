'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { ChapterView } from '@/lib/chapters/production-contracts';
import { artworkUrl } from '@/lib/chapters/artwork';
import styles from './prepared-chapter.module.css';
type Draft = { value: string; allocations: number[] };
const emptyDraft = (): Draft => ({ value: '', allocations: [] });
function Picture({
  id,
  size = 36,
  effect,
}: {
  id: string;
  size?: number;
  effect?: string;
}) {
  return (
    <span data-effect={effect}>
      <Image
        src={artworkUrl(id)}
        alt=""
        width={size}
        height={size}
        unoptimized
      />
    </span>
  );
}
export function PreparedChapter({ tutorName }: { tutorName: string }) {
  const router = useRouter();
  const [view, setView] = useState<ChapterView | null>(null),
    [loaded, setLoaded] = useState(false),
    [interest, setInterest] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [draft, setDraft] = useState<Draft>(emptyDraft);
  const nodeKey = useRef(''),
    sending = useRef(false),
    heading = useRef<HTMLHeadingElement>(null);
  function accept(next: ChapterView | null) {
    const key = next?.mission ? `${next.jobId}:${next.mission.missionId}` : '';
    if (key !== nodeKey.current) {
      nodeKey.current = key;
      let restored = next?.lastAnswer ?? emptyDraft();
      try {
        const raw = key
          ? localStorage.getItem(`leo-chapter-draft:${key}`)
          : null;
        if (raw) {
          const d = JSON.parse(raw);
          if (
            typeof d.value === 'string' &&
            /^\d{0,3}$/.test(d.value) &&
            Array.isArray(d.allocations) &&
            d.allocations.length <= 20 &&
            d.allocations.every(
              (n: unknown) =>
                Number.isInteger(n) && Number(n) >= 0 && Number(n) <= 100,
            )
          )
            restored = d;
        }
      } catch {
        /* Server progress remains available even without draft storage. */
      }
      setDraft(restored);
    }
    setView(next);
  }
  useEffect(() => {
    let active = true;
    async function restore() {
      try {
        const job = new URL(location.href).searchParams.get('job');
        const r = await fetch(
          '/api/chapters' + (job ? `?job=${encodeURIComponent(job)}` : ''),
        );
        const b = await r.json();
        if (!r.ok) throw Error(b.message);
        if (active) {
          accept(b.view);
          setInterest(b.suggestedInterest ?? '');
        }
      } catch (e) {
        if (active)
          setError(
            e instanceof Error ? e.message : 'Kapittelet kunne ikke åpnes.',
          );
      } finally {
        if (active) setLoaded(true);
      }
    }
    void restore();
    return () => {
      active = false;
    };
  }, []);
  const pollingJobId = view?.jobId,
    pollingState = view?.state;
  useEffect(() => {
    if (!pollingJobId || !['queued', 'running'].includes(pollingState ?? ''))
      return;
    let active = true;
    const jobId = pollingJobId;
    const timer = setInterval(async () => {
      try {
        const r = await fetch(`/api/chapters?job=${jobId}`);
        const b = await r.json();
        if (active && r.ok) accept(b.view);
      } catch {
        /* Keep last confirmed progress; explicit refresh remains available. */
      }
    }, 2500);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [pollingJobId, pollingState]);
  function edit(change: Partial<Draft>) {
    const next = { ...draft, ...change };
    setDraft(next);
    try {
      localStorage.setItem(
        `leo-chapter-draft:${nodeKey.current}`,
        JSON.stringify(next),
      );
    } catch {
      /* Draft only; submitted progress is server-owned. */
    }
  }
  async function request(command: string, turn?: unknown) {
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    setError('');
    const previous = nodeKey.current;
    try {
      const r = await fetch('/api/chapters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, interest, jobId: view?.jobId, turn }),
      });
      const b = await r.json();
      if (!r.ok) throw Error(b.message);
      accept(b.view);
      if (b.view?.jobId) history.replaceState(null, '', `?job=${b.view.jobId}`);
      if (nodeKey.current !== previous)
        requestAnimationFrame(() => heading.current?.focus());
      return true;
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Handlingen kunne ikke lagres. Prøv igjen.',
      );
      return false;
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  const scene = view?.mission?.scene;

  const groups =
    scene?.interaction === 'distribution'
      ? (view?.mission?.quantities.groups?.value ?? 0)
      : 0;
  const allocations =
    draft.allocations.length === groups
      ? draft.allocations
      : Array.from({ length: groups }, () => 0);
  const checked =
    !!view?.lastAnswer &&
    view.lastAnswer.value === draft.value &&
    JSON.stringify(view.lastAnswer.allocations) ===
      JSON.stringify(draft.allocations);
  const phase = view?.solved
    ? 'solved'
    : view?.failures && checked
      ? 'retry'
      : 'working';
  async function pause() {
    if (await request('pause')) router.push('/leo');
  }
  const turn = (type: string, extra: Record<string, unknown> = {}) =>
    request('turn', { type, revision: view!.revision, ...extra });
  return (
    <div className={styles.page} data-testid="prepared-player">
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Ditt eventyr</p>
          <h1>{view?.title ?? 'Hva vil du utforske?'}</h1>
        </div>
        {view?.playing ? (
          <button disabled={busy} onClick={() => void pause()}>
            Pause og hjem
          </button>
        ) : (
          <Link href="/leo">Til kartet</Link>
        )}
      </header>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {!loaded && <p role="status">Henter din lagrede fortsettelse …</p>}
      {loaded && !view && (
        <section className={styles.choose}>
          <div className={styles.chooseArt} aria-hidden="true">
            <Picture id="forest-sky" size={240} />
            <span>✦</span>
          </div>
          <div>
            <h2>Velg starten på et nytt kapittel</h2>
            <p>
              Hva skal eventyret handle om? Vi gjør hele kapittelet klart før du
              begynner.
            </p>
            <div className={styles.interests}>
              {[
                'Verdensrommet',
                'Dinosaurer',
                'Dyr',
                'Star Wars',
                'Bygging',
              ].map((label) => (
                <button
                  key={label}
                  aria-pressed={interest === label}
                  onClick={() => setInterest(label)}
                >
                  {label}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void request('prepare');
              }}
            >
              <label>
                Din interesse
                <input
                  maxLength={80}
                  value={interest}
                  onChange={(e) => setInterest(e.target.value)}
                  required
                />
              </label>
              <button
                className={styles.primary}
                disabled={busy || !interest.trim()}
              >
                {busy ? 'Starter …' : 'Gjør kapittelet klart'}
              </button>
            </form>
          </div>
        </section>
      )}
      {view && view.state !== 'ready' && (
        <section className={styles.preparation} aria-live="polite">
          <span aria-hidden="true">✦</span>
          <h2>
            {view.state === 'running' || view.state === 'queued'
              ? 'Eventyret tar form'
              : 'Vi har beholdt arbeidet ditt'}
          </h2>
          <p>{view.message}</p>
          <ol>
            {[
              ['research', 'Utforsker interessen'],
              ['draft', 'Skriver historien'],
              ['review', 'Kontrollerer oppdragene'],
              ['assets', 'Gjør bildene klare'],
            ].map(([id, label]) => (
              <li
                key={id}
                aria-current={view.phase === id ? 'step' : undefined}
              >
                {label}
              </li>
            ))}
          </ol>
          {view.canRetry && (
            <button disabled={busy} onClick={() => void request('prepare')}>
              Fortsett forberedelsen
            </button>
          )}
          <Link href="/leo">Gå hjem mens du venter</Link>
        </section>
      )}
      {view?.state === 'ready' && !view.playing && !view.ending && (
        <section className={styles.ready}>
          <p className={styles.eyebrow}>Kapittelet er klart</p>
          <h2>{view.goal}</h2>
          <p>{view.opening}</p>
          <p>Du kan stoppe underveis. Vi husker hvor du er.</p>
          <button
            className={styles.primary}
            disabled={busy}
            onClick={() => void request('start')}
          >
            Start eller fortsett kapittelet
          </button>
        </section>
      )}
      {view?.ending && (
        <section className={styles.ready}>
          <span className={styles.sun} aria-hidden="true">
            ☀
          </span>
          <h2 tabIndex={-1} ref={heading}>
            Dette fikk du til!
          </h2>
          <p>{view.ending}</p>
          <Link href="/leo">Ta pause og gå hjem</Link>
          <button
            disabled={busy}
            onClick={() => {
              history.replaceState(null, '', '/leo/kapittel');
              nodeKey.current = '';
              accept(null);
              setInterest(view.interest);
            }}
          >
            Velg et nytt kapittel
          </button>
        </section>
      )}
      {view?.playing && view.choicePrompt && (
        <section className={styles.ready}>
          <h2 tabIndex={-1} ref={heading}>
            {view.choicePrompt}
          </h2>
          {view.choices.map((c) => (
            <button
              disabled={busy}
              key={c.id}
              onClick={() => void turn('choice', { optionId: c.id })}
            >
              {c.label}
            </button>
          ))}
        </section>
      )}
      {view?.playing && view.mission && (
        <>
          <p className={styles.goal}>{view.goal}</p>
          <div className={styles.layout}>
            <section className={styles.mission} aria-busy={busy}>
              <h2 tabIndex={-1} ref={heading}>
                {view.mission.title}
              </h2>
              <p className={styles.before}>{view.mission.before}</p>
              <p className={styles.missionGoal}>{view.mission.goal}</p>
              <PreparedScene
                view={view}
                draft={draft}
                phase={phase}
                allocations={allocations}
                disabled={busy || view.solved}
                change={(i, n) =>
                  edit({
                    allocations: allocations.map((a, j) => (i === j ? n : a)),
                  })
                }
              />
              <a className={styles.teacherLink} href="#chapter-teacher">
                Spør {tutorName} om hjelp
              </a>
              <form
                className={styles.answer}
                onSubmit={(e) => {
                  e.preventDefault();
                  void turn('answer', { value: draft.value, allocations });
                }}
              >
                <p id="prepared-question">{view.mission.question}</p>
                {scene?.interaction !== 'distribution' && (
                  <label>
                    Svaret ditt
                    <input
                      aria-describedby="prepared-question"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={3}
                      disabled={busy || view.solved}
                      value={draft.value}
                      onChange={(e) =>
                        edit({ value: e.target.value.replace(/[^0-9]/g, '') })
                      }
                    />
                  </label>
                )}
                {!view.solved && (
                  <button
                    className={styles.primary}
                    disabled={
                      busy ||
                      (scene?.interaction !== 'distribution' && !draft.value)
                    }
                  >
                    {busy ? 'Kontrollerer …' : 'Sjekk svaret'}
                  </button>
                )}
              </form>
              <div
                role="status"
                className={view.solved ? styles.success : styles.feedback}
              >
                {view.outcome?.text ??
                  (phase === 'retry'
                    ? view.mission.scene.feedback.reducedMotion.incorrect
                    : '')}
              </div>
              {view.solved && (
                <button
                  className={styles.primary}
                  disabled={busy}
                  onClick={() => void turn('next')}
                >
                  Fortsett historien →
                </button>
              )}
            </section>
            <aside
              id="chapter-teacher"
              className={styles.teacher}
              aria-label="Mattelæreren"
              tabIndex={-1}
            >
              <span className={styles.teacherStar} aria-hidden="true">
                ✦
              </span>
              <h2>{tutorName}</h2>
              <p role="status">{view.teacher}</p>
              {!view.solved && (
                <>
                  <button disabled={busy} onClick={() => void turn('story')}>
                    Hva skjer i historien?
                  </button>
                  <button disabled={busy} onClick={() => void turn('hint')}>
                    Hjelp med regningen
                  </button>
                </>
              )}
            </aside>
          </div>
        </>
      )}
      {view && (
        <footer className={styles.footer}>
          <p>Kapittelet og bekreftede handlinger lagres for deg.</p>
          <p>Denne kapittelprøven gir ingen medaljong.</p>
          {view.history.length > 0 && (
            <details>
              <summary>Dette har skjedd</summary>
              {view.history.map((s, i) => (
                <p key={i}>{s}</p>
              ))}
            </details>
          )}
        </footer>
      )}
    </div>
  );
}
function PreparedScene({
  view,
  draft,
  phase,
  allocations,
  disabled,
  change,
}: {
  view: ChapterView;
  draft: Draft;
  phase: string;
  allocations: number[];
  disabled: boolean;
  change: (i: number, n: number) => void;
}) {
  const mission = view.mission!,
    scene = mission.scene,
    objects = scene.objects;
  // Keys are projected as semantic quantities by the server below. The renderer
  // does not infer which object is a container from array order or an answer.
  const q = mission.quantities!,
    get = (key: string) => objects.find((o) => o.id === q[key]?.objectId)!;
  const groups = q.groups?.value ?? 0,
    each = q.each?.value ?? 0,
    total = q.total?.value ?? 0,
    known = q.known?.value ?? 0;
  const count = Math.max(0, Math.min(60, Number(draft.value) || 0));
  const effect = (id: string) =>
    view.outcome?.effects.find((e) => e.targetId === id)?.action ?? '';
  return (
    <div
      className={styles.scene}
      data-testid="prepared-scene"
      data-phase={phase}
    >
      <div className={styles.world}>
        <Image
          src={artworkUrl(scene.backgroundAssetId)}
          alt=""
          fill
          unoptimized
          className={styles.background}
        />
        <div className={styles.place}>{mission.location.name}</div>
        <div className={styles.actors}>
          {mission.actors.map((a) => (
            <div key={a.id} data-effect={effect(a.id)} className={styles.actor}>
              <Picture id={a.assetId} size={74} />
              <span>{a.name}</span>
            </div>
          ))}
        </div>
      </div>
      <div
        className={styles.workbench}
        role="group"
        aria-label={view.outcome?.sceneText ?? mission.clue}
      >
        {scene.interaction === 'grouping' && (
          <div className={styles.groupGrid}>
            {Array.from({ length: groups }, (_, i) => (
              <div
                key={i}
                className={styles.group}
                data-effect={effect(get('groups').id)}
              >
                <div className={styles.groupName}>
                  <Picture id={get('groups').assetId} />
                  <span>
                    {get('groups').label} {i + 1}
                  </span>
                </div>
                <div className={styles.tokens}>
                  {Array.from({ length: each }, (_, j) => (
                    <span
                      key={j}
                      className={
                        view.solved || i * each + j < count
                          ? styles.filled
                          : styles.ghost
                      }
                    >
                      <Picture
                        id={get('each').assetId}
                        size={28}
                        effect={effect(get('each').id)}
                      />
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        {scene.interaction === 'quantity' && (
          <div
            className={styles.slots}
            aria-label={`${total} plasser, ${known} allerede på plass`}
          >
            {Array.from({ length: total }, (_, i) => (
              <span
                key={i}
                data-effect={effect(get(i < known ? 'known' : 'total').id)}
                className={
                  i < known
                    ? styles.existing
                    : view.solved || i < known + count
                      ? styles.filled
                      : styles.ghost
                }
              >
                <Picture id={get('total').assetId} size={38} />
              </span>
            ))}
          </div>
        )}
        {scene.interaction === 'distribution' && (
          <>
            <p className={styles.remaining}>
              {get('total').label}:{' '}
              {Math.max(0, total - allocations.reduce((s, n) => s + n, 0))}{' '}
              igjen å fordele
            </p>
            <div className={styles.groupGrid}>
              {Array.from({ length: groups }, (_, i) => (
                <div
                  className={styles.group}
                  key={i}
                  data-effect={effect(get('groups').id)}
                >
                  <div
                    className={styles.groupName}
                    role="group"
                    aria-label={`${get('groups').label} ${i + 1}`}
                  >
                    <Picture id={get('groups').assetId} />
                    <span>{i + 1}</span>
                  </div>
                  <div
                    className={
                      view.solved ? styles.deliveredTokens : styles.tokens
                    }
                    aria-label={`${allocations[i] ?? 0} i gruppe ${i + 1}`}
                  >
                    {Array.from({ length: allocations[i] ?? 0 }, (_, j) => (
                      <Picture
                        key={j}
                        id={get('total').assetId}
                        size={25}
                        effect={effect(get('total').id)}
                      />
                    ))}
                  </div>
                  {view.solved && (
                    <p className={styles.receipt}>
                      {allocations[i] ?? 0} levert
                    </p>
                  )}
                  <div className={styles.adjust}>
                    <button
                      aria-label={`Ta fra gruppe ${i + 1}`}
                      disabled={disabled || !allocations[i]}
                      onClick={() => change(i, (allocations[i] ?? 0) - 1)}
                    >
                      −
                    </button>
                    <span>{allocations[i] ?? 0}</span>
                    <button
                      aria-label={`Gi til gruppe ${i + 1}`}
                      disabled={
                        disabled ||
                        allocations.reduce((s, n) => s + n, 0) >= total
                      }
                      onClick={() => change(i, (allocations[i] ?? 0) + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      {view.outcome && (
        <p className={styles.sceneCaption}>{view.outcome.sceneText}</p>
      )}
    </div>
  );
}
