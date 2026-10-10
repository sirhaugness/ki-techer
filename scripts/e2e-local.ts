// Run after `supabase start`. Never print the CLI's credential output.
import { execFileSync, spawnSync } from 'node:child_process';
const output = execFileSync('supabase', ['status', '-o', 'env'], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'inherit'],
});
const values = Object.fromEntries(
  output.split('\n').flatMap((line) => {
    const match = /^([A-Z_]+)="(.*)"$/.exec(line);
    return match ? [[match[1], match[2]]] : [];
  }),
);
if (!values.API_URL || !values.ANON_KEY || !values.SERVICE_ROLE_KEY)
  throw new Error('Lokalt Supabase-oppsett mangler.');
const result = spawnSync('npx', ['playwright', 'test'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: values.API_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: values.ANON_KEY,
    SUPABASE_SECRET_KEY: values.SERVICE_ROLE_KEY,
    APP_URL: 'http://127.0.0.1:3000',
    E2E_LOCAL_SUPABASE: '1',
  },
});
process.exit(result.status ?? 1);
