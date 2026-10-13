'use client';
import { useState } from 'react';
import Image from 'next/image';
import type { LearningView } from '@/lib/learning/types';
const images: Record<string, string> = {
  'Star Wars': 'star-wars.jpg',
  Dinosaurer: 'dinosaurs.jpg',
  Fotball: 'football.jpg',
  Verdensrommet: 'space.jpg',
  Dyr: 'animals.jpg',
  Bygging: 'building.jpg',
};
export function AdventureScene({
  adventure,
}: {
  adventure: NonNullable<LearningView['adventure']>;
}) {
  const [failed, setFailed] = useState(false);
  const file = images[adventure.interest ?? ''];
  const url = adventure.image?.url ?? (file ? `/adventure/${file}` : undefined);
  return (
    <div className="chapter-scene">
      {url && !failed ? (
        <Image
          className="chapter-image"
          src={url}
          alt={adventure.image?.alt ?? `Fra eventyret om ${adventure.interest}`}
          width={300}
          height={170}
          unoptimized
          onError={() => setFailed(true)}
        />
      ) : (
        <div
          className="chapter-image scene-fallback"
          aria-label={`Eventyret om ${adventure.interest}`}
        >
          <span aria-hidden="true">{adventure.icon}</span>
          <p>{adventure.interest}</p>
        </div>
      )}
      <div>
        <p className="chapter-goal">
          <strong>Målet:</strong> {adventure.goal ?? adventure.text}
        </p>
        {adventure.mission && (
          <>
            <label htmlFor="chapter-progress">
              Oppdrag {adventure.mission} av {adventure.total}
            </label>
            <progress
              id="chapter-progress"
              max={adventure.total}
              value={adventure.mission - 1}
            />
          </>
        )}
      </div>
    </div>
  );
}
