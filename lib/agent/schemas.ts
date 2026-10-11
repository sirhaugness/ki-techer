import { z } from 'zod';

export const responseSchema = z
  .object({
    speech: z.string().trim().min(1).max(360),
    action: z.enum([
      'spør',
      'hint',
      'ros',
      'forklar',
      'ny_oppgave',
      'foreslå_pause',
      'avslutt',
    ]),
    hint_level_used: z.number().int().min(0).max(4),
    detected_misconception: z.string().nullable(),
    safety_flag: z.enum([
      'ingen',
      'trist',
      'utrygg',
      'personinfo',
      'upassende',
    ]),
  })
  .strict();
export type TutorResponse = z.infer<typeof responseSchema>;
export const representationSchema = z.enum(['konkret', 'bilde', 'tall']);
export const visualSchema = z
  .object({
    type: z.enum([
      'grupper',
      'tallinje',
      'rutenett',
      'tierblokker',
      'figur3d',
      'ingen',
    ]),
    data: z
      .object({
        count: z.number().int().min(0).max(200),
        groups: z.number().int().min(1).max(20),
      })
      .strict(),
  })
  .strict();
export const storySchema = z
  .object({
    story: z.string().max(240),
    question: z.string().min(1).max(240),
    expression: z.string().max(120),
    visual_spec: visualSchema,
  })
  .strict();
export const evaluationSchema = z
  .object({
    forstaelse: z.number().int().min(0).max(2),
    strategi: z.string().max(120),
    misoppfatning: z.string().nullable(),
    tilbakemelding: z.string().min(1).max(140),
  })
  .strict();
