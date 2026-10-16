import { describe, expect, it, vi } from 'vitest';
import { demoTurn } from '../../lib/chapters/demo';
import { demoChapter } from '../../lib/chapters/demo-chapter';
import {
  newDemoState,
  type DemoState,
} from '../../lib/chapters/demo-contracts';
import { materializeProblem } from '../../lib/chapters/compile';
vi.mock('server-only', () => ({}));

function solve(state: DemoState, value: string, allocations: number[] = []) {
  return demoTurn({ ...state, draft: { value, allocations } }, 'answer');
}
describe('R2 authored chapter rehearsal, no learning evidence', () => {
  it('has independently checked math for lighting, missing planks and equal delivery', () => {
    const items = demoChapter.nodes
      .filter((n) => n.kind === 'mission')
      .map((m) => materializeProblem(m.variants[0]));
    expect(items.map((i) => i.params)).toEqual([
      { a: 3, b: 4, c: 4 },
      { a: 3, b: 3, c: 3 },
      { a: 4, b: 3, total: 12 },
    ]);
    expect(items.map((i) => i.answer)).toEqual([3 * 4, 9 - 3, 12 / 3]);
  });
  it('does not disclose a key, generator seed or future outcomes before solving', () => {
    const result = demoTurn(newDemoState(), 'resume');
    const text = JSON.stringify(result);
    expect(result.view.outcome).toBeNull();
    expect(result.view.history).toEqual([]);
    for (const key of [
      '"seed"',
      '"params"',
      '"answer"',
      '"success"',
      '"next"',
      '"expression"',
    ])
      expect(text).not.toContain(key);
    expect(text).not.toContain('Postbåten følger lysene trygt');
    expect(text).not.toContain('Invitasjonene er levert');
  });
  it('keeps drafts through errors, story questions and graded mathematical help', () => {
    let result = solve(newDemoState(), '11');
    expect(result.state.solved).toBeNull();
    expect(result.view.feedback).toContain('hver lykt');
    const before = result.view.mission;
    result = demoTurn(result.state, 'story');
    expect(result.state.hintLevel).toBe(0);
    expect(result.state.draft.value).toBe('11');
    for (let level = 1; level <= 3; level++) {
      result = demoTurn(result.state, 'hint');
      expect(result.state.hintLevel).toBe(level);
      expect(result.view.mission).toEqual(before);
      expect(result.view.teacher).not.toContain('12');
    }
    result = solve(result.state, '12');
    expect(result.view.outcome?.text).toContain('følger lysene');
  });
  it('rechecks browser saves, rejects jumping ahead and never trusts a solved flag', () => {
    expect(() =>
      demoTurn(
        { ...newDemoState(), completed: [{ value: '11', allocations: [] }] },
        'resume',
      ),
    ).toThrow();
    expect(() =>
      demoTurn(
        { ...newDemoState(), solved: { value: '999', allocations: [] } },
        'resume',
      ),
    ).toThrow();
    expect(() => demoTurn(newDemoState(), 'next')).toThrow('Løs oppdraget');
    expect(() =>
      demoTurn({ ...newDemoState(), version: 2 }, 'resume'),
    ).toThrow();
  });
  it('keeps past failures without judging an edited draft during help or reload', () => {
    let result = solve(newDemoState(), '11');
    result.state.draft.value = '12';
    for (const command of ['hint', 'story', 'resume'] as const) {
      result = demoTurn(result.state, command);
      expect(result.state.failures).toBe(1);
      expect(result.state.draft.value).toBe('12');
      expect(result.state.solved).toBeNull();
      expect(result.view.feedback).toBe('');
    }
  });
  it('restores a solved consequence before advancing once and preserves the actual chain', () => {
    let result = solve(newDemoState(), '12');
    expect(
      demoTurn(JSON.parse(JSON.stringify(result.state)), 'resume'),
    ).toEqual(result);
    result = demoTurn(result.state, 'next');
    expect(result.view.mission?.missionId).toBe('gangway');
    expect(result.view.history).toHaveLength(1);
    expect(result.view.mission?.question).toContain('9 planker');
    result = solve(result.state, '6');
    result = demoTurn(result.state, 'next');
    expect(result.view.mission?.missionId).toBe('letters');
    expect(result.view.history).toHaveLength(2);
    expect(result.view.mission?.before).toContain('over landgangen');
    result = solve(result.state, '', [4, 4, 4]);
    result = demoTurn(result.state, 'next');
    expect(result.view.ending).toContain('invitasjonene er levert');
    expect(result.view.history).toHaveLength(3);
    expect(demoTurn(result.state, 'next')).toEqual(result);
  });
  it.each([
    [4, 4, 3],
    [3, 4, 5],
    [4, 4],
    [12, 0, 0],
  ])('rejects an incomplete or uneven delivery %j', (...allocations) => {
    let result = demoTurn(
      {
        ...newDemoState(),
        completed: [
          { value: '12', allocations: [] },
          { value: '6', allocations: [] },
        ],
      },
      'resume',
    );
    result = solve(result.state, '4', allocations);
    expect(result.state.solved).toBeNull();
    expect(result.view.feedback).toContain('Bruk alle');
  });
});
