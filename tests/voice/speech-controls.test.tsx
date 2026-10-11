// @vitest-environment jsdom
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { SpeechControls } from '@/components/leo/speech-controls';
import type { LearningView } from '@/lib/learning/types';

const view: LearningView = {
  id: '00000000-0000-4000-8000-000000000001',
  revision: 0,
  mode: 'practice',
  task: null,
  speech: 'Vi utforsker matte sammen.',
  parts: [],
  ended: false,
  correct: null,
  hintLevel: 0,
  pauseOffered: false,
  celebration: null,
  diagnosticComplete: false,
  masterProgress: null,
};
const fetchMock = vi.fn(),
  play = vi.fn(),
  speak = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  play.mockReset().mockResolvedValue(undefined);
  speak.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal(
    'Audio',
    class {
      src = '';
      preload = '';
      play = play;
      pause = vi.fn();
      removeAttribute = vi.fn();
      load = vi.fn();
    },
  );
  vi.stubGlobal(
    'SpeechSynthesisUtterance',
    class {
      constructor(public text: string) {}
    },
  );
  vi.stubGlobal('speechSynthesis', {
    cancel: vi.fn(),
    getVoices: () => [],
    speak,
  });
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:voice');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('retries a failed TTS request when the learner presses Read aloud again', async () => {
  fetchMock
    .mockResolvedValueOnce(new Response(null, { status: 503 }))
    .mockResolvedValueOnce(new Response(new Blob(['audio']), { status: 200 }));
  render(<SpeechControls view={view} />);
  fireEvent.click(screen.getByRole('button', { name: /Les høyt/ }));
  await waitFor(() => expect(speak).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByRole('button', { name: /Les høyt/ }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(screen.getByText('Leser høyt.')).toBeVisible());
});

it('keeps the stopped message when a pending playback promise rejects after Stop', async () => {
  let rejectPlayback!: (error: Error) => void;
  play.mockResolvedValueOnce(undefined).mockImplementationOnce(
    () =>
      new Promise<void>((_, reject) => {
        rejectPlayback = reject;
      }),
  );
  fetchMock.mockResolvedValue(new Response(new Blob(['audio'])));
  render(<SpeechControls view={view} />);
  fireEvent.click(screen.getByRole('button', { name: /Les høyt/ }));
  await waitFor(() => expect(play).toHaveBeenCalledTimes(2));
  fireEvent.click(screen.getByRole('button', { name: 'Stopp opplesing' }));
  await act(async () =>
    rejectPlayback(new DOMException('paused', 'AbortError')),
  );
  expect(screen.getByText('Opplesingen er stoppet.')).toBeVisible();
});

it.each([200, 503])(
  'does not start late audio or fallback after Stop (HTTP %i)',
  async (status) => {
    let respond!: (response: Response) => void;
    fetchMock.mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          respond = resolve;
        }),
    );
    render(<SpeechControls view={view} initialAuto />);
    fireEvent.click(screen.getByRole('button', { name: /Les høyt/ }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'Stopp opplesing' }));
    await act(async () =>
      respond(new Response(new Blob(['audio']), { status })),
    );
    expect(play).toHaveBeenCalledTimes(1); // Only the user-gesture unlock, never the fetched clip.
    expect(speak).not.toHaveBeenCalled();
    expect(screen.getByText('Opplesingen er stoppet.')).toBeVisible();
  },
);

it('ignores an old session response even when the new session has the same revision', async () => {
  const responses: ((response: Response) => void)[] = [];
  fetchMock.mockImplementation(
    () => new Promise<Response>((resolve) => responses.push(resolve)),
  );
  const { rerender } = render(<SpeechControls view={view} initialAuto />);
  fireEvent.click(screen.getByRole('button', { name: /Les høyt/ }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  rerender(
    <SpeechControls
      view={{ ...view, id: '00000000-0000-4000-8000-000000000002' }}
      initialAuto
    />,
  );
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  await act(async () => responses[0](new Response(new Blob(['old audio']))));
  expect(play).toHaveBeenCalledTimes(1);
  await act(async () => responses[1](new Response(new Blob(['new audio']))));
  expect(play).toHaveBeenCalledTimes(2);
  expect(screen.getByText('Leser høyt.')).toBeVisible();
});

it('shows a useful message if the device voice fails', async () => {
  fetchMock.mockResolvedValue(new Response(null, { status: 503 }));
  render(<SpeechControls view={view} />);
  fireEvent.click(screen.getByRole('button', { name: /Les høyt/ }));
  await waitFor(() => expect(speak).toHaveBeenCalledTimes(1));
  const utterance = speak.mock.calls[0][0] as SpeechSynthesisUtterance;
  act(() => utterance.onerror?.({} as SpeechSynthesisErrorEvent));
  expect(
    screen.getByText(
      'Lyden kunne ikke starte. Prøv Les høyt igjen eller les teksten.',
    ),
  ).toBeVisible();
});

it('does not carry a manual request into the next view when auto read is off', async () => {
  const responses: ((response: Response) => void)[] = [];
  fetchMock.mockImplementation(
    () => new Promise<Response>((resolve) => responses.push(resolve)),
  );
  const { rerender } = render(<SpeechControls view={view} />);
  fireEvent.click(screen.getByRole('button', { name: /Les høyt/ }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  rerender(
    <SpeechControls
      view={{ ...view, revision: 1, speech: 'Neste oppgave.' }}
    />,
  );
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  await act(async () => responses[0](new Response(new Blob(['old audio']))));
  await act(async () => responses[1](new Response(new Blob(['new audio']))));
  expect(play).toHaveBeenCalledTimes(1);
  expect(speak).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: /Les høyt/ }));
  await waitFor(() => expect(screen.getByText('Leser høyt.')).toBeVisible());
});
