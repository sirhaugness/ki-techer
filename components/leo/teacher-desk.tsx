'use client';
import { useState } from 'react';
import type { LearningView } from '@/lib/learning/types';
import { helpShortcuts } from '@/lib/learning/help-options';
import { Tutor } from './art';
import { Manipulatives } from './manipulatives';
import { RecordButton } from './record-button';
export function TeacherDesk({
  view,
  busy,
  name,
  voice,
  onAsk,
}: {
  view: LearningView;
  busy: boolean;
  name: string;
  voice: boolean;
  onAsk: (text: string) => void;
}) {
  const [open, setOpen] = useState(false),
    [text, setText] = useState('');
  const sentences = view.speech.match(/[^.!?]+[.!?]?/g) ?? [view.speech];
  const short = sentences.slice(0, 2).join('').trim();
  const history =
    view.helpHistory?.filter((h) => h.itemId === view.task?.id) ?? [];
  return (
    <aside
      className={`teacher-desk ${open ? 'teacher-open' : ''}`}
      aria-label="Læreren ved pulten"
    >
      <div className="teacher-message">
        <Tutor thinking={busy} />
        <div>
          <strong>{name}</strong>
          <p role="status" aria-live="polite">
            {busy ? 'Jeg tenker …' : short}
          </p>
        </div>
      </div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="teacher-help"
        onClick={() => setOpen(!open)}
      >
        {open ? 'Lukk lærerhjelpen' : 'Spør læreren'}
      </button>
      <div id="teacher-help" className="teacher-help" hidden={!open}>
        {view.mode === 'master' && (
          <p className="home-note">
            Du kan få hjelp. Oppgaver med hjelp teller som øving i denne
            utfordringen.
          </p>
        )}
        <div className="help-shortcuts">
          {helpShortcuts.map((option) => (
            <button
              type="button"
              key={option}
              disabled={busy}
              onClick={() => onAsk(option)}
            >
              {option}
            </button>
          ))}
        </div>
        {sentences.length > 2 && <p>{view.speech}</p>}
        {history.some((h) => h.question === 'Vis meg med en tegning') &&
          view.task && (
            <Manipulatives
              visual={view.task.visual}
              disabled={true}
              onAnswer={() => {}}
            />
          )}
        {history.map((h, i) => (
          <div key={i} className="help-exchange">
            <p>
              <strong>Du:</strong> {h.question}
            </p>
            <p>
              <strong>{name}:</strong> {h.reply}
            </p>
          </div>
        ))}
        <label>
          Spørsmål til læreren
          <input
            value={text}
            maxLength={600}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (!busy && text.trim()) {
                  onAsk(text);
                  setText('');
                }
              }
            }}
            placeholder="Hvorfor skal jeg gange?"
          />
        </label>
        {voice && (
          <RecordButton
            label="Hold for å spørre læreren"
            disabled={busy}
            onText={setText}
          />
        )}
        <button
          type="button"
          disabled={busy || !text.trim()}
          onClick={() => {
            onAsk(text);
            setText('');
          }}
        >
          Send spørsmålet
        </button>
      </div>
    </aside>
  );
}
