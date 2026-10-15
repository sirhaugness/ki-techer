# Oppsett og Preview — for en nybegynner

M1–M9 gir innlogging, elevprofil, Leo-lås, KI-lærer, kartlegging, matteøkter, medaljong, tale, profilminne, foreldredashbord og budsjettgrenser. Start med oppsettet nedenfor. Har du allerede satt opp M1–M3, gå til «M7–M9: dette må være klart på Preview» nederst.

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

| Variabel                               | Hvor du finner verdien                                 |
| -------------------------------------- | ------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`             | Prosjektets API URL / Project URL                      |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Prosjektets publishable key under API Keys             |
| `SUPABASE_SECRET_KEY`                  | Prosjektets secret key under API Keys; kun server-side |

3. Finn API-nøklene under Supabase-prosjektets **Settings → API / API Keys**. Bruk dev-nøkler i Preview og prod-nøkler i Production. Servernøkkelen skal aldri ha `NEXT_PUBLIC_` foran navnet. Appen bruker også OpenAI-oppsettet nederst.
4. Vercel oppretter en **Preview** for PR-en. Åpne den og kopier hele adressen. Du trenger **ikke** legge inn `APP_URL` eller `VERCEL_URL`: innloggingen bruker automatisk adressen du åpner, med Vercels innebygde `VERCEL_URL` som reserve. Dette fungerer også med produksjonsdomene og grenadresse. Hvis du allerede har lagt inn feil `APP_URL`, fjern den for Preview og velg **Redeploy**. En eventuell overstyring må være hele nettadressen til siden du bruker, for eksempel `https://leo.example.no`, uten `/auth/callback`; den har prioritet over automatisk valg og bør normalt være tom på Preview.
5. I **leo-dev → Authentication → URL Configuration**, sett **Site URL** til Preview-adressen og legg inn `https://DIN-PREVIEW-ADRESSE/auth/callback` i **Redirect URLs**. Ta med den nøyaktige adressen til siden du skal teste. For leo-prod bruker du produksjonsadressen på tilsvarende måte.
6. Bruk samme nettleser for å be om og åpne e-postlenken; innloggingen bruker PKCE. Åpne fra e-postklienten i nettleseren du begynte i hvis lenken åpnes i en annen app.
7. Sjekk at både **Kvalitet** og **Supabase-migrasjoner** er grønne på PR-en. Databasemigrasjoner og Vercel-bygg er separate jobber; innlogging virker først når begge er ferdige og URL-oppsettet er riktig.

Appens serverfunksjoner er satt til Stockholm i `vercel.json`. Supabase-regionen velges når du oppretter prosjektene.

Kopier den nye PR-ens faktiske Preview-adresse fra Vercel-sjekken og legg til `/auth/callback` i leo-dev sine Redirect URLs. Ikke gjenbruk en tidligere PR-adresse. Hvis du åpner en annen Preview-adresse, må også den være tillatt i Supabase. En adresse som ikke er tillatt kan bli erstattet av Supabase-prosjektets Site URL, slik at nettleserens innloggingscookies ikke følger med.

## 5. Hva du skal teste på Preview

### Hvis ingen innloggings-e-post sendes

Den nye feilmeldingen skiller mellom e-postbegrensning, sendegrense, avslått innlogging og feil API-oppsett. Skjermbildet med «Kunne ikke sende lenken» alene fastslår ikke årsaken.

1. Test med samme e-postadresse som tilhører Supabase-prosjektets organisasjon. Supabases innebygde e-posttjeneste sender bare til organisasjonsmedlemmer; andre adresser krever egen SMTP-tjeneste.
2. Hvis du har prøvd flere ganger, kontroller sendegrensen. Den innebygde tjenesten er for tiden begrenset til to e-poster per time per prosjekt. Vent på at grensen nullstilles før et nytt forsøk; verdien kan endres av Supabase.
3. Åpne **leo-dev → Logs → Auth**, finn feilen ved siste innloggingsforsøk og se feilkoden. `email_address_not_authorized` krever organisasjonsmedlem eller egen SMTP; `over_email_send_rate_limit` betyr sendegrense. Ved serverfeil viser loggen den konkrete årsaken. Del bare en kort feilkode/melding ved feilsøking, uten nøkler, lenker eller persondata.
4. For sending til vanlige foreldreadresser: sett opp en e-postleverandør som støtter SMTP, og fyll inn vert, port, brukernavn, passord og verifisert avsender under Supabase **Authentication → Email / SMTP Settings**. Dette settes i Supabase, ikke som en ny nettadressevariabel i Vercel. Konfigurer dev og prod hver for seg.
5. Ved feil nøkkel: kontroller `NEXT_PUBLIC_SUPABASE_URL` og `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for Preview i Vercel, hent begge fra leo-dev og velg **Redeploy** etter endring.

Kilder: [Supabases e-postbegrensninger og SMTP-oppsett](https://supabase.com/docs/guides/auth/auth-smtp) og [Auth-feilkoder](https://supabase.com/docs/guides/auth/debugging/error-codes). I Vercels runtime-logger lagrer appen bare Supabase-feilkode og HTTP-status ved mislykket sending, aldri rå feilmelding, e-postadresse eller innloggingslenke.

### Test innlogging, profil og PIN

1. Åpne Preview-lenken i PR-en. Du skal se «Leo-læreren» og «Kom i gang som forelder».
2. Be om en innloggingslenke med din egen e-post, og åpne den i samme nettleser. Du skal komme til «Foreldresiden».
3. Opprett Leo med 4. trinn og lærerens navn. Last siden på nytt; profilen skal fortsatt være der.
4. Lagre en PIN med fire sifre. Trykk «Start Leo-modus for Leo». Du skal se en personlig hilsen med riktig fornavn og lærernavn.
5. Last siden på nytt, og prøv adressen `/forelder` manuelt. Du skal fortsatt være i Leo-modus.
6. Åpne «For forelder». Feil PIN skal gi en feilmelding. Riktig PIN skal åpne foreldresiden. Fem feil på rad gir en sperre i 15 minutter, også ved riktig PIN i sperretiden.
7. Logg ut fra foreldresiden. Du skal komme til innlogging igjen.
8. Valgfritt: logg inn med en annen foreldrekonto i et privat nettleservindu. Den kontoen skal ikke se Leos profil fra den første kontoen.

Start «Bli kjent» og gjennomfør ti oppgaver. Etterpå kan Leo starte matteøkter, velge interesser og avslutte med refleksjon. Åpne «Se fremgang og innstillinger» fra foreldresiden for profil, økter, budsjett og eksport. Bruk [iPad-testplanen](IPAD-TESTPLAN.md) for hele flyten.

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

`npm ci`, kopier `.env.example` til `.env.local` og fyll inn dev-verdiene, deretter `npm run dev`. `npm run check` kjører lint, typecheck, Vitest/PostgreSQL, simulering, Playwright, produksjonsbuild og Lighthouse-tilgjengelighet. Full auth-e2e krever Docker og Supabase CLI: `supabase start` og `node --import tsx scripts/e2e-local.ts`. Ikke bruk prod-nøkler i lokale tester.

## M7–M9: dette må være klart på Preview

Tekstmodeller bruker nå den valgfrie `OPENAI_MODEL_DEFAULT`. Uten denne velger koden `gpt-5-mini`; gamle TUTOR/FAST/REFLECT-variabler overstyrer ikke dette. Du har valgt å bruke OpenAI-nøkkelen du allerede har i Vercel. Ikke kopier den til chat eller kode. Kontroller at nøkkelen og modellvalgene også gjelder **Preview**, ikke bare Production:

| Variabel                | Verdi / handling                                                   |
| ----------------------- | ------------------------------------------------------------------ |
| `OPENAI_API_KEY`        | Behold eksisterende nøkkel; aktiver for Preview                    |
| `OPENAI_MODEL_DEFAULT`  | `gpt-5-mini` — alle tekstkall, også historie/kontroll/oppsummering |
| `AI_MONTHLY_BUDGET_NOK` | `100` — øvre månedsgrense per husholdning                          |
| `OPENAI_MODEL_TTS`      | `gpt-4o-mini-tts`                                                  |
| `OPENAI_TTS_VOICE`      | `marin`                                                            |
| `OPENAI_MODEL_STT`      | `gpt-4o-mini-transcribe`                                           |

Verdiene er foreslått i miljømalen, men modellen må også være tilgjengelig for OpenAI-prosjektet ditt. Felles tekstmodell og budsjettvariabel er i bruk. Hvis noen av modell-, stemme- eller budsjettvariablene mangler, legg dem inn i **Settings → Environment Variables**, velg Preview, lagre og trykk **Redeploy** på nyeste Preview. Ingen endring i Supabase-variablene eller APP_URL er nødvendig.

Alle fire nye databasemigrasjoner (profilrefleksjon, foreldredashbord, KI-grenser og anonym tilgang) må være kjørt på **leo-dev** før du starter kartlegging. Kontroller at PR-sjekken **Supabase-migrasjoner** er grønn; se GitHub-hemmelighetene ovenfor hvis den feiler. Ikke kjør en database-reset. På første opplesing oppretter serveren automatisk et **privat** Supabase Storage-lager, `leo-tts`. Du trenger ikke opprette en offentlig bøtte. Funksjonene kjører i Vercels Stockholm-region (`arn1`).

Hvis KI-en feiler, fortsetter øving med korte, regelstyrte spørsmål og hint. Egendefinerte interesser/lærernavn krever fungerende moderering. Hvis taletjenesten feiler, kan enhetens norske stemme lese teksten; tastaturet fungerer fortsatt. Lyd i mock-testene er ikke en vurdering av ekte norsk uttale.

Bruk [hele testplanen for iPad](IPAD-TESTPLAN.md). Ekte modell-evaluering (30 scenarioer, minst 95 % og ingen fasit-lekkasjer) og fysisk testing i Safari/Chrome må fortsatt gjennomføres med tilgjengelige tjenester. Automatiske tester her bruker mocks, og lager ingen KI-kostnader.

## Budsjett og opprydding

Foreldredashbordet viser anslått forbruk og varsler ved 80 % av månedsgrensen. Nye KI-kall stopper ved grensen; kontrollerte oppgaver, hint, fremgang og medaljong fortsetter. Måned følger Europe/Oslo. Den laveste elevgrensen i husholdningen gjelder, og kan aldri overstige `AI_MONTHLY_BUDGET_NOK` i Vercel. Sett elevgrensen til 0 på en testprofil for å prøve reservefunksjonen, og sett den tilbake etterpå. Da stopper også KI-refleksjon og ny taletranskripsjon; eksisterende lydcache og enhetens norske stemme kan fortsatt brukes. Fritekstforklaringer får ikke ny forståelsesgodkjenning uten fungerende KI. Tidligere mestring bevares, og en tilgjengelig mesterutfordring kan fortsatt tildele medaljongdel.

Forbruket er et konservativt kodeestimat, ikke OpenAIs faktura. Beløp reserveres før hvert betalt kall, slik at samtidige kall ikke omgår grensen. Usikkert forbruk ved timeout beholder reservasjonen. Sjekk også faktisk forbruk i OpenAI-kontoen. Grensene per låst enhet er 30 appforespørsler, 12 opplesinger og 6 transkripsjoner per minutt.

Gamle samtaler/verktøylogger og utløpte skoletema ryddes når elevens hjem eller det autoriserte foreldredashbordet åpnes. Lyd eldre enn 30 dager ryddes i grupper på inntil 100 filer per besøk. En inaktiv konto ryddes derfor ved neste besøk; det er ingen bakgrunnsjobb som lover sletting på et bestemt klokkeslett. Matematisk fremgang beholdes til appdata slettes. Se [personvern](PRIVACY.md).

## Før Leo bruker appen fast

Kontroller innlogget Preview, ekte norsk tale på iPad Safari og Chrome, og KI-kvalitet med de 30 eval-scenarioene (minst 95 % og ingen fasit i tidlige hint). Eval kjører med ekte tjeneste og kan koste penger; bruk eksisterende godkjent nøkkel i et sikkert miljø, aldri i chatten. Merge til main starter produksjonsmigrasjon og produksjonsbygg. Gjør dette først når Preview er testet og du har godkjent produksjonsendringen.
