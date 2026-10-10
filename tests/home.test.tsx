// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('@/lib/db/server', () => ({ configured: () => false, db: vi.fn() }));
import Home from '@/app/page';
it('viser en norsk startside og tilbyr forelderinnlogging før øving er ferdig', async () => {
  render(await Home());
  expect(screen.getByRole('heading', { name: 'Leo-læreren' })).toBeVisible();
  expect(
    screen.getByRole('link', { name: 'Kom i gang som forelder' }),
  ).toHaveAttribute('href', '/login');
  expect(screen.getByText(/Matteøkter kommer senere/)).toBeVisible();
});
