# Oppsett og Preview — for en nybegynner

Denne PR-en lager grunnmuren M1–M3. Du kan teste forelderinnlogging, elevprofil og Leo-lås i nettleseren. Mattegeneratorer og læringsmotor testes automatisk. KI-samtaler, matteøkter og medaljongskjermen kommer i M4–M5.

## 1. Lag to Supabase-prosjekter

1. Logg inn på [Supabase](https://supabase.com/dashboard).
2. Opprett prosjektet **leo-dev** i en EU-region (for eksempel Frankfurt). Lagre databasepassordet i passordbehandleren din.
3. Opprett et separat prosjekt **leo-prod**, også i EU. Lagre det andre databasepassordet.
4. I hvert prosjekt: åpne **Project Settings → General** og finn **Reference ID / Project ID**. Det er en kode, ikke navnet «leo-dev» eller «leo-prod». Den står også i prosjektets URL etter `/project/`.
5. Hvis du ikke har databasepassordet, bruk **Database → Settings → Reset database password**. Ikke bruk Supabase-kontopassordet, publishable key eller secret key som databasepassord.

## 2. Finn de fem GitHub-hemmelighetene

Gå til [Supabase-kontoens access tokens](https://supabase.com/dashboard/account/tokens), og lag et token med tilgang til begge prosjektene. Dette er et konto-token, ikke prosjektets API-nøkkel.

| Navn — kopier nøyaktig      | Verdi                           |
| --------------------------- | ------------------------------- |
| `SUPABASE_ACCESS_TOKEN`     | Konto-tokenet fra Access Tokens |
| `SUPABASE_PROJECT_REF_DEV`  | Reference ID for leo-dev        |
| `SUPABASE_DB_PASSWORD_DEV`  | Databasepassordet til leo-dev   |
| `SUPABASE_PROJECT_REF_PROD` | Reference ID for leo-prod       |
| `SUPABASE_DB_PASSWORD_PROD` | Databasepassordet til leo-prod  |

## 3. Legg dem inn på GitHub

1. Åpne [repoets Actions-hemmeligheter](https://github.com/sirhaugness/ki-techer/settings/secrets/actions).
2. Velg **New repository secret**.
3. Lim inn ett navn fra tabellen i **Name**.
4. Lim inn tilhørende verdi i **Secret**.
5. Trykk **Add secret**.
6. Gjenta til alle fem navnene er lagt inn. Ikke lim inn verdiene i chat, issues eller kode.
7. Åpne PR-en, velg **Checks**, og finn **Supabase-migrasjoner**. Hvis den feilet før du la inn hemmelighetene: velg **Re-run failed jobs** i Actions. Når den er grønn, er tabellene og læreplandataene installert i leo-dev.

PR-er mot `main` og mot en eventuell `leo-dev`-gren bruker dev-prosjektet. Push/merge til `main` bruker prod-prosjektet. PR-er fra forks hoppes over fordi de ikke får hemmelighetene. Dev og prod kjøres i separate køer. Manglende dev-verdi gir feil, aldri automatisk bytte til prod.

Workflowen kjører `supabase link` og `supabase db push --linked --yes` med CLI 2.75.0. Den kjører ingen reset eller sletting. En PR kan allerede ha endret dev-databasen før den merges. Migrasjoner må derfor legges til som nye filer, ikke omskrives etter at de er brukt. Parallelle PR-er med ulike migrasjonshistorikker kan kreve avklaring; CLI-feil skal ikke løses ved å resette databasen.

## 4. Koble Vercel til repoet

GitHub-hemmelighetene brukes bare av migrasjonsworkflowen. Nettsiden trenger et eget oppsett:

1. Logg inn på [Vercel](https://vercel.com), velg **Add New → Project**, importer `sirhaugness/ki-techer`, og behold Next.js som rammeverk. Hvis prosjektet allerede er koblet til Vercel, åpne det eksisterende prosjektet.
2. Under **Settings → Environment Variables**, legg inn følgende for **Preview** fra leo-dev og for **Production** fra leo-prod:

| Variabel                               | Hvor du finner verdien                                                    |
| -------------------------------------- | ------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Prosjektets API URL / Project URL                                         |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Prosjektets publishable key under API Keys                                |
| `SUPABASE_SECRET_KEY`                  | Prosjektets secret key under API Keys; kun server-side                    |
| `APP_URL`                              | Hele nettadressen til denne nettsiden, for eksempel `https://…vercel.app` |

3. Finn API-nøklene under Supabase-prosjektets **Settings → API / API Keys**. Bruk dev-nøkler i Preview og prod-nøkler i Production. Servernøkkelen skal aldri ha `NEXT_PUBLIC_` foran navnet. Ingen OpenAI-nøkkel trengs for M1–M3.
4. Vercel oppretter en **Preview** for PR-en. Åpne den og kopier hele adressen. Sett `APP_URL` for Preview til denne adressen, og velg **Redeploy** slik at endringen tas i bruk. Ved en ny Preview-adresse må `APP_URL` oppdateres igjen. Bruk gjerne en stabil grenadresse dersom Vercel-prosjektet tilbyr det.
5. I **leo-dev → Authentication → URL Configuration**, sett **Site URL** til Preview-adressen og legg inn `https://DIN-PREVIEW-ADRESSE/auth/callback` i **Redirect URLs**. Ta med den nøyaktige adressen til siden du skal teste. For leo-prod bruker du produksjonsadressen på tilsvarende måte.
6. Bruk samme nettleser for å be om og åpne e-postlenken; innloggingen bruker PKCE. Åpne fra e-postklienten i nettleseren du begynte i hvis lenken åpnes i en annen app.
7. Sjekk at både **Kvalitet** og **Supabase-migrasjoner** er grønne på PR-en. Databasemigrasjoner og Vercel-bygg er separate jobber; innlogging virker først når begge er ferdige og URL-oppsettet er riktig.

Appens serverfunksjoner er satt til Frankfurt i `vercel.json`. Supabase-regionen velges når du oppretter prosjektene.

## 5. Hva du skal teste på Preview

1. Åpne Preview-lenken i PR-en. Du skal se «Leo-læreren» og «Kom i gang som forelder».
2. Be om en innloggingslenke med din egen e-post, og åpne den i samme nettleser. Du skal komme til «Foreldresiden».
3. Opprett Leo med 4. trinn og lærerens navn. Last siden på nytt; profilen skal fortsatt være der.
4. Lagre en PIN med fire sifre. Trykk «Start Leo-modus for Leo». Du skal se en personlig hilsen med riktig fornavn og lærernavn.
5. Last siden på nytt, og prøv adressen `/forelder` manuelt. Du skal fortsatt være i Leo-modus.
6. Åpne «For forelder». Feil PIN skal gi en feilmelding. Riktig PIN skal åpne foreldresiden. Fem feil på rad gir en sperre i 15 minutter, også ved riktig PIN i sperretiden.
7. Logg ut fra foreldresiden. Du skal komme til innlogging igjen.
8. Valgfritt: logg inn med en annen foreldrekonto i et privat nettleservindu. Den kontoen skal ikke se Leos profil fra den første kontoen.

Du skal foreløpig se en beskjed om at matteeventyret bygges. Interaktive matteøkter er ikke en del av denne PR-en. Generatorene, mestringen og medaljongreglene kontrolleres gjennom testene og simuleringen.

## 6. Når du merger

Når du har testet Preview og sjekkene er grønne, kan du merge PR-en til `main`. Da kjører migrasjonene mot leo-prod, og en tilkoblet Vercel-installasjon bygger produksjonsversjonen. Kontroller begge resultatene før du bruker produksjonssiden. Ikke merge dersom prod-hemmelighetene mangler.

## Feilsøking

- «Supabase er ikke koblet til»: Vercel-variablene mangler eller krever Redeploy.
- E-postlenken sender deg feil sted: kontroller `APP_URL`, Site URL og Redirect URLs. Be om en ny lenke etter endringen.
- Lenken virker ikke: bruk samme nettleser; lenker kan være utløpt, brukt eller åpnet av en e-postskanner.
- Profilen kan ikke lagres: sjekk at Supabase-migrasjoner er grønn for dev.
- PIN kan ikke lagres: kontroller serverens `SUPABASE_SECRET_KEY` for dev. Den må tilhøre samme prosjekt som URL-en.
- Actions sier at en hemmelighet mangler: kontroller stavemåten og at du brukte **repository secrets**, ikke bare et separat GitHub Environment.

## Lokal utvikling

`npm ci`, kopier `.env.example` til `.env.local` og fyll inn dev-verdiene, deretter `npm run dev`. `npm run check` kjører lint, typecheck, Vitest/PostgreSQL, simulering, Playwright-smoke og build. Full auth-e2e krever Docker og Supabase CLI: `supabase start` og `node --import tsx scripts/e2e-local.ts`. Ikke bruk prod-nøkler i lokale tester.
