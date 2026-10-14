'use client';
import { useId } from 'react';
import type { LearningView, PublicTask } from '@/lib/learning/types';
import {
  Background,
  Person,
  Asset,
  MathPanel,
  WorldProblem,
} from './world-art';

export function AdventureScene({
  adventure,
  task,
}: {
  adventure: NonNullable<LearningView['adventure']>;
  task: PublicTask;
}) {
  const id = useId().replaceAll(':', '');
  const stage = adventure.stage ?? 'forest';
  const effect = adventure.payoff?.effect ?? adventure.effect ?? 'load';
  const solved = task.resolved;
  const space =
    adventure.interest === 'Star Wars' ||
    adventure.interest === 'Verdensrommet';
  const route = adventure.route;
  const math = task.interaction?.math;
  const object = task.interaction?.object ?? 'forsyninger';
  const title = `${adventure.companion ?? 'Vennen din'} og Leo: ${adventure.scene ?? adventure.text}`;
  return (
    <section className="illustrated-chapter" aria-label="Scenen i eventyret">
      <div className="scene-heading">
        <span>
          {adventure.interest} · Kapittel {adventure.number}
        </span>
        <span>
          Oppdrag {adventure.mission ?? 1} av {adventure.total ?? 6}
        </span>
      </div>
      <div
        className="world-frame"
        data-stage={stage}
        data-effect={effect}
        data-state={solved ? 'solved' : 'waiting'}
        data-asset={route?.asset}
      >
        <svg
          className="chapter-image world-illustration"
          viewBox="0 0 960 520"
          role="img"
          aria-labelledby={`${id}-title ${id}-description`}
        >
          <title id={`${id}-title`}>{title}</title>
          <desc id={`${id}-description`}>
            {adventure.purpose}{' '}
            {solved ? adventure.outcome : 'Oppdraget venter på løsningen din.'}{' '}
            {adventure.branchScene}
          </desc>
          <defs>
            <linearGradient id={`${id}-sky`} x2="0" y2="1">
              <stop stopColor="#b5d7d7" />
              <stop offset="1" stopColor="#e9e8bf" />
            </linearGradient>
            <linearGradient id={`${id}-floor`} x2="0" y2="1">
              <stop stopColor="#3d5c70" />
              <stop offset="1" stopColor="#668693" />
            </linearGradient>
          </defs>
          <Background stage={stage} id={id} />
          <WorldProblem
            effect={effect}
            space={space}
            solved={solved}
            object={object}
            dinosaur={adventure.interest === 'Dinosaurer'}
            people={!['Dinosaurer', 'Dyr'].includes(adventure.interest ?? '')}
          />
          {space && effect === 'charge' && (
            <Person
              x={407}
              y={278}
              name={adventure.interest === 'Star Wars' ? 'Poe' : 'Nova'}
              companion
            />
          )}
          <Person x={207} y={295} name="Leo" />
          <Person
            x={95}
            y={307}
            name={adventure.companion ?? 'Vennen din'}
            companion
            robot={/BB-8|droide|robot/i.test(adventure.companion ?? '')}
          />
          {route && <Asset asset={route.asset} />}
          {route?.used &&
            (route.asset === 'pilot' || route.asset === 'companion') && (
              <Person
                x={395}
                y={270}
                name={
                  route.asset === 'pilot'
                    ? adventure.interest === 'Star Wars'
                      ? 'Poe'
                      : 'Piloten'
                    : adventure.interest === 'Fotball'
                      ? 'Gjestelaget'
                      : 'Veiviseren'
                }
                companion
              />
            )}
          {route?.used && route.asset === 'key' && (
            <path
              className="branch-link"
              d="m332 333 101-58 28 12"
              fill="none"
              stroke="#f2d18b"
              strokeWidth="5"
              strokeDasharray="8 6"
            />
          )}
          {math && (
            <MathPanel
              math={math}
              object={object}
              solved={solved}
              effect={effect}
            />
          )}
        </svg>
        <div className="scene-status">
          {solved ? 'Oppdraget er løst' : (adventure.place ?? 'På eventyr')}
        </div>
      </div>
      <div className="scene-narrative">
        <p className="adventure-scene">
          {(adventure.mission ?? 1) === 1
            ? adventure.text
            : adventure.previousOutcome}{' '}
          {adventure.payoff?.scene ?? adventure.scene}
        </p>
        {adventure.dialogue && (
          <p className="character-dialogue">{adventure.dialogue}</p>
        )}
        <p className="scene-purpose">{adventure.purpose}</p>
        <p className="chapter-goal">
          <strong>Målet:</strong> {adventure.goal ?? adventure.text}
        </p>
        {!!adventure.inventory?.length && (
          <details className="story-inventory">
            <summary>Dette har dere med videre</summary>
            <ul>
              {adventure.inventory.map((item) => (
                <li key={item.asset}>{item.description}</li>
              ))}
            </ul>
          </details>
        )}
        {adventure.branchScene && (
          <p className="branch-consequence" role="status">
            {adventure.payoff?.scene ?? adventure.branchScene}
          </p>
        )}
      </div>
    </section>
  );
}
