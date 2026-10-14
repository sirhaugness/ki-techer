// @vitest-environment jsdom
import { render, screen, within, fireEvent } from '@testing-library/react';
import { it, expect, vi } from 'vitest';
import { AnswerPanel } from '../../components/leo/answer-panel';
import { generate } from '../../lib/engine/skills/generators';
import { seededRng } from '../../lib/engine/random';
import { compileInteraction, judgeTaskAnswer } from '../../lib/engine/mission';
import type { PublicTask } from '../../lib/learning/types';

it('builds a contextual division expression with touch buttons, accepts colon and retains it after refresh', () => {
  const item = generate('regneuttrykk-fra-situasjon', 1, seededRng(3));
  const task: PublicTask = {
    id: 'task',
    question: item.question,
    answerType: 'choice',
    choices: item.choices!,
    skillTitle: 'Velg et regneuttrykk',
    showVisual: true,
    resolved: false,
    visual: { type: 'grupper', count: 0, groups: 0, shape: null, steps: [] },
    interaction: compileInteraction(
      item,
      'equation',
      'energiceller',
      'kasser',
      0,
    ),
  };
  const onAnswer = vi.fn();
  const result = render(
    <AnswerPanel task={task} busy={false} onAnswer={onAnswer} />,
  );
  fireEvent.click(
    within(screen.getByRole('group', { name: 'Første tall' })).getByRole(
      'button',
      { name: String(item.params.total) },
    ),
  );
  fireEvent.click(
    within(screen.getByRole('group', { name: 'Regnetegn' })).getByRole(
      'button',
      { name: ':' },
    ),
  );
  fireEvent.click(
    within(screen.getByRole('group', { name: 'Siste tall' })).getByRole(
      'button',
      { name: String(item.params.b) },
    ),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Sjekk svaret' }));
  const answer = onAnswer.mock.calls[0][0];
  expect(answer).toBe(`${item.params.total} : ${item.params.b}`);
  expect(
    judgeTaskAnswer({ item, interaction: task.interaction }, answer).correct,
  ).toBe(true);
  result.unmount();
  render(
    <AnswerPanel
      task={{ ...task, submittedAnswer: answer, resolved: true }}
      busy={false}
      onAnswer={onAnswer}
      onNext={() => {}}
    />,
  );
  expect(screen.getByRole('status')).toHaveTextContent(answer);
  expect(
    within(screen.getByRole('group', { name: 'Regnetegn' })).getByRole(
      'button',
      { name: ':' },
    ),
  ).toHaveAttribute('aria-pressed', 'true');
});

it('uses illustrated story alternatives while preserving the independently verified answer value', () => {
  const item = generate('situasjon-fra-regneuttrykk', 1, seededRng(4));
  const onAnswer = vi.fn();
  const task: PublicTask = {
    id: 'task',
    question: item.question,
    answerType: 'choice',
    choices: item.choices!,
    skillTitle: 'Finn en passende fortelling',
    showVisual: true,
    resolved: false,
    visual: { type: 'grupper', count: 0, groups: 0, shape: null, steps: [] },
    interaction: compileInteraction(item, 'quantity', 'kort', 'grupper', 1),
  };
  render(<AnswerPanel task={task} busy={false} onAnswer={onAnswer} />);
  fireEvent.click(screen.getByRole('button', { name: String(item.answer) }));
  fireEvent.click(screen.getByRole('button', { name: 'Sjekk svaret' }));
  expect(onAnswer).toHaveBeenCalledWith(item.answer);
  expect(judgeTaskAnswer({ item }, onAnswer.mock.calls[0][0]).correct).toBe(
    true,
  );
});
