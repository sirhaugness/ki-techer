# Leo-læreren – spesifikasjon (v2)

## 1. Rolle og mål

Du er senior fullstack-utvikler og læringsteknolog. Du skal bygge **Leo-læreren**, en nettside der en 9 år gammel gutt (Leo, 4. trinn, Oslo) øver på matematikk med en KI-lærer.

**Hovedmål:** Leo skal kunne sette seg ned og øve pedagogisk på matte **til han har mestret alle kompetansemålene for 4. trinn**. Fremgangen synliggjøres med en **medaljong i fire deler** (seksjon 7.9). Hver del tildeles når en fjerdedel av årets pensum er mestret. Til slutt blir de fire delene til en hel «4. trinns mattemedaljong».

Løsningen skal:
1. Ta utgangspunkt i **LK20, matematikk (MAT01-06)**, og i en løpende vurdering av Leos **ferdighetsnivå, interesser og læringspreferanser**.
2. **Maksimere læringsutbytte og engasjement.** Oppgaver og eksempler settes i sammenhenger fra Leos interesser, som han selv kan legge inn.
3. Følge **beste praksis fra pedagogikk**, slik at Leo forstår og ikke bare pugger.
4. **Bli stadig bedre kjent med Leo** gjennom erfaring: hva han kan, hvordan han lærer best, og hva som engasjerer ham. Dette lagres i databasen og brukes aktivt.
5. Kreve **minimalt arbeid fra forelder**. Ingen opplasting av ukeplaner eller lærebøker. Systemet skal fungere godt helt av seg selv.

Løsningen skal være produksjonsklar og gjennomtenkt fra start, men bygges i milepæler (seksjon 12) med tester for hver milepæl.

## 2. Ikke-forhandlbare designprinsipper

1. **Modellen bestemmer, koden husker og sikrer (agentmønster).** KI-læreren er den pedagogiske beslutningstakeren. Den velger aktivitet, rekkefølge, representasjon og forklaringsstil, bestemmer når den skal bytte strategi, lager oppgaver og vurderer forståelse. Den gjør dette gjennom **verktøy** (function calling) mot en deterministisk læringsmotor. Koden har ansvaret for:
   - **Hukommelse:** all tilstand ligger i databasen.
   - **Fasitkontroll:** hvert regnestykke beregnes eller verifiseres i kode.
   - **Harde grenser:** hint-nivå, tidsgrenser, sikkerhet og kostnad.
   - **Mestringsregnskapet:** dataene må bekrefte det modellen tror.
   - **Langsiktig plan:** motoren foreslår kandidater, og modellen velger blant dem.
2. **Fasit kommer aldri fra språkmodellen alene.** Tall og riktig svar kommer fra generatorer, eller modellens egne oppgaveforslag verifiseres med `mathjs` før de vises.
3. **Sokratisk veiledning håndheves i kode.** Serveren bestemmer hvilket hint-nivå som er tillatt. KI-svar som avslører fasit før det er tillatt, blir avvist og regenerert.
4. **Mestring krever både vurdering og data.** Modellen kan *foreslå* at en ferdighet er mestret. Motoren godkjenner bare hvis datakriteriene i 7.1 er oppfylt. Medaljongbiter tildeles bare av motoren.
5. **Barnesikkerhet og personvern først.** Minst mulig persondata til tredjepart, moderering av inn- og utdata, foreldrekontroll og innsyn.
6. **Læring vektes over moro.** Tilpasningen optimaliserer for faktisk læring (riktig uten hjelp, også etter noen dager), med engasjement som viktig, men sekundært signal.
7. **Alt brukervendt innhold er på norsk bokmål**, tilpasset en 9-åring: korte setninger, konkrete ord, varm og rolig tone.
8. **Fagnøytral arkitektur.** Matte er første fag, men agent, verktøy og datamodell skal kunne utvides til andre fag (f.eks. naturfag) ved å legge til ferdighetsgraf, verktøy og valideringsregler per fag.

## 3. Teknologistabel

- **Frontend/backend:** Next.js (nyeste stabile, App Router) + TypeScript (strict) + Tailwind CSS + shadcn/ui
- **Database/auth/lagring:** Supabase (Postgres, Auth, Storage), **EU-region**, gratisplan. SQL-migrasjoner i `supabase/migrations`. Row Level Security på alle tabeller. To prosjekter: dev og prod.
- **Validering:** Zod på alle API-grenser, alle verktøykall og alle KI-svar
- **KI:** OpenAI API via offisiell `openai` npm-SDK, Responses API med **function calling** og **Structured Outputs (JSON Schema)**. Modellnavn **kun via miljøvariabler**:
  - `OPENAI_MODEL_TUTOR` (sterk modell, agent/dialog)
  - `OPENAI_MODEL_FAST` (rask/billig: kontekstualisering, klassifisering, tolkning)
  - `OPENAI_MODEL_REFLECT` (sterk modell, refleksjon etter økt)
  - `OPENAI_MODEL_TTS`, `OPENAI_TTS_VOICE`, `OPENAI_MODEL_STT`
- **Matte:** `mathjs` for å evaluere og verifisere regneuttrykk
- **Repetisjon:** `ts-fsrs` (FSRS-algoritmen)
- **Test:** Vitest (enhet/integrasjon), Playwright (e2e)
- **Hosting:** Vercel Hobby (gratis, funksjoner i EU-region) + Supabase EU. Bruk strømming av KI-svar for rask respons.
- All KI-kode kjører server-side. API-nøkler eksponeres aldri til klienten.

Lag et tynt abstraksjonslag (`lib/ai/provider.ts`) slik at KI-leverandør kan byttes uten å endre resten av koden.

## 4. Arkitektur

```
app/
  (leo)/            Leo-modus: hjem med medaljong og kart, økt, mine interesser
  (forelder)/       Foreldredashbord, innstillinger, innsyn, diplom-utskrift
  api/              Route handlers (økt/agent-tur, svar, tale, refleksjon)
lib/
  engine/           DETERMINISTISK læringsmotor (ingen I/O, 100 % enhetstestet)
    skills/         Ferdighetsgraf + oppgavegeneratorer per ferdighet
    mastery.ts      Logistisk ferdighetsmodell + mestringskriterier
    scheduler.ts    FSRS-repetisjon
    candidates.ts   Kandidatforslag til agenten (ZPD-målretting)
    hints.ts        Hint-tilstandsmaskin
    bandit.ts       Thompson sampling over pedagogiske strategier
    session.ts      Øktfaser og harde rammer
    medallion.ts    Medaljongdeler, fremgang, mesterprøve, tildeling
    misconceptions.ts  Katalog + deteksjon
    validate.ts     Validering av modellens egne oppgaveforslag
  agent/
    loop.ts         Agent-løkke: modell ↔ verktøy, maks antall kall per tur
    tools.ts        Verktøydefinisjoner (Zod + JSON Schema) og håndterere
    context.ts      Bygger kompakt kontekst per tur
    guards.ts       Fasit-lekkasjesjekk, lengde, språk, verktøyregler
    prompts/        Versjonerte systemprompter (.md)
  ai/
    provider.ts     Leverandørabstraksjon
    contextualize.ts  Oppgave → interessebasert fortelling
    evaluate.ts     Vurdering av Leos forklaringer
    reflect.ts      Refleksjon etter økt → profiloppdatering
    moderation.ts   Moderering inn/ut
  db/               Typede spørringer
  voice/            TTS (med cache) og STT
supabase/migrations/
scripts/simulate.ts Simulert elev for å teste motoren
scripts/eval-agent.ts  Scenarioevaluering av agenten
docs/curriculum/    Kompetansemål og kjerneelementer (fra udir.no)
tests/
docs/SPEC.md, docs/DECISIONS.md, docs/PROGRESS.md, docs/PRIVACY.md, docs/DEPLOY.md
```

**Én agent-tur (forenklet):**
1. Leo gjør noe (svarer, ber om hint, sier noe).
2. Svar på oppgaver sjekkes **i kode først** (`sjekk_svar` kjøres automatisk av serveren). Resultat, misoppfatningstreff og tillatt hint-nivå legges i konteksten.
3. `context.ts` bygger en kompakt kontekst: øktfase, gjenstående tid, aktiv oppgave, forsøkshistorikk, `allowedHintLevel`, profilsammendrag, medaljongstatus og siste meldinger.
4. Modellen kaller 0–5 verktøy (f.eks. `hent_kandidater` → `lag_oppgave`) og returnerer en strukturert respons til Leo.
5. `guards.ts` validerer responsen. Ved brudd regenereres den (maks 2 ganger), ellers brukes en deterministisk fallback.
6. Motoren oppdaterer mestring, repetisjon, bandit og medaljong. Alt logges.

## 5. Datamodell (Postgres)

Lag migrasjoner for minst disse tabellene (tilpass felt ved behov, dokumenter avvik i DECISIONS.md):

- `households` – id, created_at
- `parents` – id (= auth.users.id), household_id, display_name
- `learners` – id, household_id, first_name, grade, birth_year, tutor_name (navnet Leo gir læreren), avatar, settings jsonb (øktlengde, daglig maks, tillatte klokkeslett, tale av/på, auto-opplesing)
- `devices` – id, learner_id, parent_id, leo_mode_locked bool, created_at
- `subjects` – id ('matte'), title (forberedt for flere fag)
- `skills` – id (slug), subject_id, title, description, lk20_aim_code, lk20_aim_text, grade, medallion_part (1–4 eller null for forkunnskaper), prerequisites text[], generator_key, difficulty_levels int, order_index
- `skill_states` – learner_id, skill_id, theta (logit), attempts, correct_no_hint, distinct_days_correct, model_mastery_claim_at, mastered_at, fsrs_card jsonb, next_review_at, last_seen_at
- `medallion_parts` – id (1–4), subject_id, grade, title, description, symbol, color
- `medallion_progress` – learner_id, part_id, status ('låst'|'tilgjengelig'|'pågår'|'klar_for_mesterprøve'|'tildelt'), skills_mastered int, skills_total int, master_test_attempts int, awarded_at, parent_seen bool
- `master_tests` – id, learner_id, part_id, session_id, item_ids text[], score float, passed bool, created_at
- `interests` – id, learner_id, label, source ('leo'|'forelder'|'foreslått'), weight float, active bool, times_used, engagement_avg
- `school_topics` – id, learner_id, raw_text (det Leo sa), mapped_skill_ids text[], confidence float, expires_at (7 dager), created_at
- `sessions` – id, learner_id, started_at, ended_at, planned_minutes, mood_start, mood_end, wanted_more bool, summary, stats jsonb
- `items` – id, skill_id, origin ('generator'|'modell'), difficulty, params jsonb, answer jsonb, expression, representation, strategy jsonb, interest_id, story_text, visual_spec jsonb, prompt_version, validated bool, reused_count
- `attempts` – id, session_id, item_id, learner_id, answer_raw, answer_parsed, correct bool, credit float, hint_level_used, time_ms, input_mode ('tastatur'|'tale'|'manipulativ'), misconception_code, explanation_text, explanation_score jsonb, is_master_test bool
- `messages` – id, session_id, role ('leo'|'lærer'|'system'), text, meta jsonb, created_at
- `tool_calls` – id, session_id, message_id, tool, args jsonb, result jsonb, ok bool, latency_ms, created_at
- `misconceptions` – id, learner_id, skill_id, code, description, evidence_count, last_seen_at, status ('aktiv'|'løst')
- `learner_profile_observations` – id, learner_id, category ('interesse'|'læringspreferanse'|'motivasjon'|'styrke'|'utfordring'|'misoppfatning'|'skolemetode'), text, evidence jsonb (session_ids), confidence float, status ('aktiv'|'låst'|'avvist'), updated_by ('system'|'forelder'), updated_at
- `strategy_arms` – learner_id, dimension, arm, alpha float, beta float, pulls int, updated_at
- `safety_flags` – id, learner_id, session_id, type, excerpt, created_at, reviewed bool
- `ai_calls` – id, purpose, model, input_tokens, output_tokens, cost_estimate, latency_ms, ok bool, created_at
- `tts_cache` – text_hash, voice, storage_path

RLS: en forelder ser bare data i egen husholdning. Leo-modus bruker forelderens sesjon, men UI-et er låst (seksjon 9.1).

## 6. Læreplan og ferdighetsgraf

### 6.1 Kompetansemål (MAT01-06, gjeldende fra 1.8.2026, nynorsk original)

Lagre også fullstendig tekst i `docs/curriculum/mat01-06.md`.

**Etter 3. trinn (forkunnskaper, utvalg):**
- beskrive og utforske multiplikasjon ved teljing og gruppering
- bruke dobling og halvering i hovudrekning og skriftleg rekning
- bruke multiplikasjon og divisjon til å lage og løyse problem frå leik og kvardag
- bruke talsymbol, tekst, tabellar, teikning og konkret til å representere multiplikasjon på ulike måtar og omsetje mellom dei ulike representasjonane
- bruke kommutative, assosiative og distributive eigenskapar ved multiplikasjon i hovudrekning og skriftleg rekning
- bruke likskaps- og ulikskapsteikn som relasjonelle symbol for å samanlikne storleikar, mengder, uttrykk og tal

**Etter 4. trinn (målet for medaljongen):**
- utforske og bruke målings- og delingsdivisjon i praktiske situasjonar
- representere divisjon på ulike måtar og omsetje mellom dei ulike representasjonane
- utforske, bruke og beskrive ulike divisjonsstrategiar
- utforske og forklare samanhengar mellom dei fire rekneartane og bruke samanhengane formålstenleg i utrekningar
- modellere situasjonar frå sin eigen kvardag og forklare tenkjemåtane sine
- lage rekneuttrykk til praktiske situasjonar og finne praktiske situasjonar som passar til oppgitte rekneuttrykk
- utforske, beskrive og samanlikne eigenskapar ved to- og tredimensjonale figurar
- lage algoritmar og uttrykkje dei ved bruk av variablar, vilkår og lykkjer

*(Kontroller mot udir.no om målene om areal/volum med ikke-standardiserte måleenheter og om strukturer og mønster i lek og spill også er med i MAT01-06 for 4. trinn. Er de med, legges de i del 4.)*

**Etter 5. trinn (videre etter medaljongen, utvalg):**
- beskrive brøk som del av ein heil, som del av ei mengd, som ein divisjon og som tal på tallinja
- bruke tal, tekst, teikning, konkret og praktiske situasjonar for å representere brøkar og kunne omsetje mellom dei ulike representasjonane

Legg kompetansemålene i `lib/engine/skills/curriculum.ts` med kode og ordlyd. Merk filen med `// VERIFISER MOT udir.no/lk20/mat01-06`.

### 6.2 Ferdighetsgraf og medaljongdeler

Bryt kompetansemålene ned i **25–40 små, testbare delferdigheter** med forkunnskapskrav (DAG). Hver ferdighet har en generator med 5 vanskegrader og tilhører én medaljongdel:

| Del | Arbeidstittel | Kompetansemål | Eksempler på ferdigheter |
|---|---|---|---|
| **Basecamp** (ikke del av medaljongen) | Forkunnskaper fra 3. trinn | Multiplikasjon, dobling/halvering, likhetstegn | `mult-telling-grupper`, `mult-tabell-2-5-10`, `mult-tabell-3-4`, `mult-tabell-6-9`, `mult-kommutativ-strategi` |
| **1** | Forstå divisjon | Målings- og delingsdivisjon; representere divisjon | `div-deling-konkret`, `div-maaling-konkret`, `div-representasjoner`, `div-som-omvendt-mult` |
| **2** | Regnestrategier | Divisjonsstrategier; sammenhenger mellom de fire regneartene | `div-med-rest`, `div-strategier-hoderegning`, `fire-regnearter-sammenheng`, `omvendt-operasjon-kontroll` |
| **3** | Matte i hverdagen | Modellere hverdagssituasjoner; regneuttrykk ↔ situasjon | `regneuttrykk-fra-situasjon`, `situasjon-fra-regneuttrykk`, `tekstoppgaver-flertrinn`, `forklare-tenkemaate` |
| **4** | Former og algoritmer | 2D/3D-figurer; algoritmer med variabler, vilkår og løkker | `figur-2d-egenskaper`, `figur-3d-kanter-hjorner-flater`, `algoritme-folg-instruksjon`, `algoritme-lag-med-lokke`, `algoritme-vilkaar` |

Rekkefølge: Basecamp → del 1 → del 2. Del 3 krever del 1. Del 4 har ingen forkunnskapskrav og kan gjøres når som helst. Når flere deler er tilgjengelige, får **Leo velge** hvilken han vil jobbe med (autonomi). Delene skal være omtrent like store målt i antall ferdigheter.

### 6.3 Oppgavegeneratorer

Hver generator er en ren funksjon `generate(difficulty: 1-5, rng) → { params, answer, answerType, expression, representationHints, commonWrongAnswers: {value, misconceptionCode}[] }`.

- Bruk seedet RNG for reproduserbarhet.
- Unngå trivielle oppgaver og like oppgaver to ganger på rad.
- `commonWrongAnswers` brukes til automatisk misoppfatningsdeteksjon (f.eks. 24 : 4 → svar 28 = «adderte i stedet for å dele»; 7 · 8 → 54 = «nabofakta-forveksling»).
- Ferdigheter i geometri og algoritmer kan ha ikke-numeriske svar (flervalg, rekkefølge, sti på et rutenett). `answerType` skal støtte dette.
- Enhetstest: 1000 tilfeldige oppgaver per generator og vanskegrad; fasit verifiseres uavhengig.

## 7. Læringsmotoren (`lib/engine`)

### 7.1 Ferdighetsmodell og mestring (`mastery.ts`)
- Logistisk modell per ferdighet: `p(riktig) = σ(θ_ferdighet − b_vanskegrad)`, b for nivå 1–5 = [−2, −1, 0, 1, 2].
- Oppdatering: `θ += K · (kreditt − p)`, der K = 0,6 de første 5 forsøkene, deretter gradvis ned til 0,2.
- Kreditt: riktig uten hint = 1,0; etter hint 1 = 0,7; hint 2 = 0,4; etter gjennomgått eksempel (nivå 3) = 0,1; etter full løsning (nivå 4) eller feil = 0.
- **Datakriterium for mestring:** p(nivå 3) ≥ 0,85, minst 4 av de siste 5 riktige, og riktig uten hint på minst 2 ulike dager.
- **Doble krav:** en ferdighet markeres som mestret når datakriteriet er oppfylt **og** enten (a) agenten har kalt `foreslå_mestring` med en begrunnelse, eller (b) Leo har gitt en forklaring med `forstaelse = 2` (8.3) på denne ferdigheten. Hvis datakriteriet ikke er oppfylt, svarer `foreslå_mestring` med hva som gjenstår.
- Initial θ settes fra kartleggingen (7.6).

### 7.2 Repetisjon (`scheduler.ts`)
- Mestrede ferdigheter får et FSRS-kort (`ts-fsrs`). Rating fra resultat: feil → Again, hint → Hard, riktig → Good, riktig og raskt (under median tid) → Easy.
- Forfalte repetisjoner prioriteres i oppvarmingen. Ferdigheter i allerede tildelte medaljongdeler repeteres videre. Bitene tas aldri fra Leo.

### 7.3 Kandidatforslag (`candidates.ts`)
Motoren gir agenten en rangert liste med 3–6 kandidater: `{skill_id, foreslått_vanskegrad, grunn, anbefalt_strategi}`. Grunn er én av: `forfalt_repetisjon`, `frontferdighet` (forkunnskaper mestret, selv ikke mestret), `aktiv_misoppfatning`, `skoletema` (fra `school_topics`, vekt × 1,3), `valgt_medaljongdel`.

- Foreslått vanskegrad gir **predikert mestring 0,70–0,85** (nærmeste utviklingssone).
- **Blandet øving:** etter at en ferdighet er introdusert, skal minst 30 % av oppgavene i hovedøkta komme fra andre ferdigheter. Motoren håndhever dette ved å avvise `lag_oppgave` som bryter regelen, med forklaring.
- **Frustrasjonsvern (hard regel):** etter 2 feil på rad krever motoren lavere vanskegrad eller ny representasjon på neste oppgave. Etter 3 feil på rad: en lett mestringsoppgave, deretter tilbud om pause eller en morsom gåte.
- Agenten velger fritt blant kandidatene. Den kan velge en ferdighet utenfor listen bare hvis forkunnskapene er mestret, og den må oppgi en begrunnelse som logges.

### 7.4 Hint-tilstandsmaskin (`hints.ts`)
Nivåer per oppgave:
- **0:** Leo prøver selv. Ved feil: oppmuntring + et åpent spørsmål («Hvordan tenkte du?»).
- **1:** Strategi-hint («Kan du tegne det som grupper?»).
- **2:** Konkret delsteg («Hvor mange grupper på 4 får du av 12?»).
- **3:** Gjennomgått eksempel med en *lignende* oppgave (andre tall), og deretter samme oppgave på nytt.
- **4:** Full løsning forklart, etterfulgt av en ny, lignende oppgave som Leo løser selv.

Regler: nivået øker bare etter et nytt feilforsøk eller når Leo trykker «Jeg vil ha et hint». Serveren sender `allowedHintLevel` i konteksten hver tur. `guards.ts` avviser svar som inneholder fasit (som tall eller ord) før nivå 4.

### 7.5 Preferanselæring (`bandit.ts`)
Thompson sampling med Beta-fordelinger per strategidimensjon. Banditten gir agenten en `anbefalt_strategi` per kandidat. Agenten kan følge eller overstyre anbefalingen, men må oppgi grunn, og alt logges.

| Dimensjon | Armer |
|---|---|
| `kontekst` | interessefortelling, ren oppgave, spill-/utfordringsformat |
| `representasjon` | konkret/manipulativ, bilde/tegning, tall/symbol |
| `forklaringsstil` | eksempel først, prøv først, still spørsmål |
| `tempo` | korte runder (3 oppgaver), lengre fokusrunder (6 oppgaver) |

- **Belønning (0–1)** per runde: 0,5 × læringssignal (kreditt på *neste* oppgave i samme ferdighet + senere repetisjonsresultat) + 0,3 × engasjementssignal (fullførte runden, svarte uten tegn på gjetting, valgte «én til») + 0,2 × Leos egen vurdering (emoji etter runden).
- **Glemsel:** alpha og beta skaleres mot prioren med faktor 0,97 per økt, slik at modellen tilpasser seg når Leo endrer seg.
- **Minimum 10 % utforskning.** Nye ferdigheter introduseres alltid konkret → bilde → abstrakt, uavhengig av banditten.

### 7.6 Kartlegging (første økt, «Bli kjent»)
- 10–15 minutter, framstilt som et eventyr og ikke en prøve. Adaptiv vandring gjennom ferdighetsgrafen med start midt i Basecamp/del 1.
- Ferdigheter Leo tydelig behersker, får høy θ, men markeres ikke som mestret før de er bekreftet på en dag til. Slik unngås at han får medaljongbiter «gratis» på en enkelt god dag.
- Samtidig: læreren spør om interesser (velg fra bilder + fritekst/tale) og lar Leo navngi læreren og velge avatar.
- Kan kjøres på nytt fra foreldredashbordet.

### 7.7 Øktfaser (`session.ts`)
Fasene og tidsrammene håndheves av koden. Innenfor hver fase bestemmer agenten. Standard økt (lengde fra innstillinger, default 15 minutter):
1. **Innsjekk:** humør (3 emojier) + kort hilsen som husker noe fra sist. **Av og til** (maks én gang per uke, og aldri første økt) spør læreren lett: *«Hva har dere hatt om i matte på skolen nå?»* Svaret tolkes av `noter_skoletema`. «Vet ikke» eller et uklart svar er helt greit: læreren går videre uten å spørre igjen, og ingenting lagres.
2. **Oppvarming (2–3 minutter):** forfalte repetisjoner.
3. **Hovedøkt:** ferdigheter fra valgt medaljongdel. Ny ferdighet introduseres med gjennomgått eksempel og konkret representasjon.
4. **Blandet utfordring:** 2–3 blandede oppgaver, gjerne som et kapittel i fortellingen. Er en mesterprøve tilgjengelig, kan den tilbys her (7.9).
5. **Avslutning:** «Hva lærte du i dag?» (tale eller tekst, vurderes av `evaluate.ts`), humør, visning av fremgang i medaljongen, og valget «Én oppgave til?» eller «Ferdig for i dag».

Økta avsluttes vennlig når tiden er ute, også midt i en runde. Daglig maks håndheves.

### 7.8 Misoppfatninger (`misconceptions.ts`)
Katalog med kode, beskrivelse og avhjelpende strategi, f.eks.:
- `DIV_KOMMUTATIV` (tror 3 : 12 = 12 : 3)
- `DIV_REST_IGNORERT`
- `DELING_VS_MAALING` (forveksler «fordele på» og «hvor mange grupper»)
- `MULT_SOM_ADD` (5 · 3 → 8)
- `NABOFAKTA` (7 · 8 → 54/63)
- `PLASSVERDI_FEIL`
- `FIGUR_KANT_HJORNE` (forveksler kanter og hjørner)

Deteksjon: match mot `commonWrongAnswers` + klassifisering av Leos forklaringer. Aktive misoppfatninger blir kandidater med grunn `aktiv_misoppfatning`.

### 7.9 Medaljongen (`medallion.ts`)
- Fire deler som til sammen blir en hel medaljong. Hver del har eget symbol og egen farge.
- **Fremgang innenfor en del:** hver ferdighet i delen er en liten «stein» i biten som lyser opp når ferdigheten er mestret. Fremgangen vises på hjemskjermen og etter hver økt.
- **Mesterprøve:** når alle ferdigheter i en del er mestret, blir status `klar_for_mesterprøve`. Prøven består av 8–10 blandede oppgaver fra hele delen, uten hint, på predikert vanskegrad 3. Den tas tidligst dagen etter at siste ferdighet i delen ble mestret. Prøven framstilles som en spennende «mesterutfordring», ikke som en prøve.
- **Bestått** (≥ 80 % riktig): biten tildeles med en feiringsanimasjon, og forelder får beskjed i dashbordet.
- **Ikke bestått:** vennlig tilbakemelding som fremhever det han fikk til. Motoren lager målrettet øving på det som var vanskelig, og prøven kan tas igjen neste dag.
- **Når alle fire delene er tildelt:** delene smelter sammen til «4. trinns mattemedaljong» med en egen avslutningsfeiring. Deretter fortsetter appen i vedlikeholdsmodus (repetisjon) og kan åpne 5. trinn.
- Delene tas aldri fra Leo.
- Medaljongen tegnes som en egendesignet, original SVG (ingen kjente figurer eller merkevarer).

## 8. Agenten og KI-laget

Felles for alle KI-kall: Structured Outputs med JSON Schema, Zod-validering, maks 2 nye forsøk, deretter **deterministisk fallback** (malbasert tekst). Hvert kall logges i `ai_calls`, hvert verktøykall i `tool_calls`. Prompter lagres versjonert i `lib/agent/prompts/*.md`, og versjonen lagres på `items`/`messages`.

**Persondata til OpenAI:** kun fornavn, trinn og anonymiserte profilobservasjoner. Aldri etternavn, skole, adresse eller lignende.

### 8.1 Verktøy (`lib/agent/tools.ts`)

| Verktøy | Hva det gjør | Harde regler i koden |
|---|---|---|
| `hent_elevstatus()` | Kompakt status: medaljong, ferdighetskart, aktive misoppfatninger, profilsammendrag | – |
| `hent_kandidater()` | Rangerte kandidater fra 7.3 med anbefalt strategi | – |
| `lag_oppgave({skill_id, vanskegrad, interesse_id?, representasjon, kontekst_stil, begrunnelse})` | Generator lager tall og fasit → `contextualize` lager tekst → validering → lagres | Forkunnskaper mestret, blandingsregel, frustrasjonsvern, vanskegrad ±1 fra foreslått |
| `foreslå_egen_oppgave({skill_id, tekst, regneuttrykk, svar, representasjon})` | Modellen lager en egen oppgave (f.eks. når Leo ønsker noe spesielt) | `mathjs` må gi samme svar; tall og operasjoner må passe ferdighetens tillatte område; moderering |
| `vis_representasjon({type, data})` | Viser manipulativ/visualisering (grupper, tallinje, rutenett, tierblokker, 3D-figur) | Data valideres mot skjema |
| `foreslå_mestring({skill_id, begrunnelse})` | Ber motoren markere en ferdighet som mestret | Godkjennes bare ved oppfylt datakriterium (7.1) |
| `start_mesterprøve({part_id})` | Starter mesterprøve | Bare ved status `klar_for_mesterprøve` og riktig dag |
| `registrer_observasjon({kategori, tekst})` | Foreslår en profilobservasjon | Går via fletteregler (8.5), ikke direkte |
| `noter_skoletema({leo_sa})` | Tolker hva Leo sier de har på skolen → ferdigheter | Lagres bare hvis confidence ≥ 0,6; utløper etter 7 dager |
| `foreslå_pause()` / `avslutt_økt()` | Pause eller avslutning | Respekterer øktfaser og tidsgrenser |

Maks 5 verktøykall per tur. Ugyldige kall returnerer en forklarende feilmelding til modellen, som får prøve igjen én gang.

Svar på oppgaver sjekkes **ikke** av modellen. Serveren sjekker svaret når Leo leverer (tall fra tastatur, transkribert tale eller resultat fra en manipulativ) og legger resultatet i konteksten.

### 8.2 Agentens respons og systemprompt
Output-skjema per tur:
```json
{
  "speech": "string (det som sies/vises, maks 3 korte setninger)",
  "action": "spør | hint | ros | forklar | ny_oppgave | foreslå_pause | avslutt",
  "hint_level_used": 0,
  "detected_misconception": "kode eller null",
  "safety_flag": "ingen | trist | utrygg | personinfo | upassende"
}
```

Systemprompten skal skrives fullt ut i `prompts/tutor.v1.md` og minst inneholde:
- Du er {tutor_name}, en vennlig og tålmodig mattelærer for {first_name} (9 år). Bokmål. Maks 3 korte setninger per tur. Ett spørsmål om gangen.
- Du er den pedagogiske beslutningstakeren. Bruk verktøyene for å se status, velge neste aktivitet og lage oppgaver. Velg representasjon og forklaringsstil ut fra det du vet om {first_name}.
- Gi aldri svaret før `allowedHintLevel` = 4. Led med spørsmål.
- Ros innsats, strategi og utholdenhet, aldri at han er «smart» eller «flink». Feil er en naturlig del av læring.
- Be ofte {first_name} forklare hvordan han tenkte. Hvis han beskriver en metode fra skolen, bruk den samme metoden og registrer den som observasjon (kategori `skolemetode`).
- Bruk interessen naturlig, men la matten stå i sentrum.
- Knytt fremgang til medaljongen når det motiverer («Bare to steiner igjen før mesterutfordringen!»), men ikke i hver tur.
- Hold samtalen til matte og læring. Led vennlig tilbake ved avsporing.
- Spør aldri om personopplysninger. Hvis han forteller noe som tyder på at han er lei seg, redd eller blir behandlet dårlig: svar varmt og kort, oppfordre ham til å snakke med mamma, pappa eller læreren, sett `safety_flag`, og ikke prøv å være terapeut.
- Ikke lov ting appen ikke kan gjøre. Ikke lat som du er et menneske hvis han spør.

### 8.3 Kontekstualisering (`contextualize.ts`)
Input: generatorens params og fasit, valgt interesse, representasjon, lesenivå. Output:
```json
{ "story": "string", "question": "string", "expression": "string (f.eks. '24 / 4')", "visual_spec": { "type": "grupper|tallinje|rutenett|tierblokker|figur3d|ingen", "data": {} } }
```
Validering (`lib/engine/validate.ts`): alle tall i teksten finnes i params; `mathjs.evaluate(expression)` = fasit; maks 3 setninger og ~15 ord per setning; moderering godkjent. To feil på rad → malbasert fallback. Godkjente oppgaver caches og kan gjenbrukes.

Interessevariasjon: samme interesse maks 2 oppgaver på rad. Interessevekt justeres etter engasjement.

### 8.4 Forklaringsvurdering (`evaluate.ts`)
Vurderer Leos fritekstforklaringer med en rubrikk: `{ forstaelse: 0-2, strategi: "string", misoppfatning: "kode|null", tilbakemelding: "string (1 setning, oppmuntrende)" }`.

### 8.5 Refleksjon etter økt (`reflect.ts`)
Kjøres asynkront når en økt avsluttes. Input: øktstatistikk, meldingsutdrag, verktøykall, bandit-resultater og eksisterende observasjoner. Output: en liste med operasjoner `{op: "legg_til"|"styrk"|"svekk"|"arkiver", observation_id?, category, text, evidence_session_id, confidence_delta}`, et kort øktsammendrag for forelder og 0–3 forslag til forelder.

Fletteregler (i kode, ikke KI): confidence starter på 0,4, +0,15 ved ny støtte, −0,2 ved motbevis, arkiveres under 0,2, maks 25 aktive observasjoner. Observasjoner som er låst eller avvist av forelder endres aldri automatisk. Bare observasjoner med confidence ≥ 0,6 eller status låst tas med i agentens kontekst.

### 8.6 Moderering (`moderation.ts`)
OpenAIs moderation-endepunkt på all fritekst fra Leo og all generert tekst før visning. Avvist innhold → nøytral omdirigering + rad i `safety_flags`.

### 8.7 Kostnadskontroll
`AI_MONTHLY_BUDGET_NOK` settes som miljøvariabel. Ved 80 % varsles forelder i dashbordet. Ved 100 % går appen over i **fallback-modus**: oppgaver kommer fra generatorer med malbasert tekst, og tutoren bruker forhåndsskrevne fraser og ren regelstyring. Appen skal fortsatt fungere, og medaljongen kan fortsatt opptjenes.

## 9. Brukergrensesnitt

### 9.1 Innlogging og Leo-modus
- Forelder logger inn med Supabase Auth (e-post/magisk lenke).
- Forelder aktiverer **Leo-modus** på enheten: UI-et låses til Leo-delen. For å gå ut kreves forelderens 4-sifrede PIN.
- Leo trenger ingen e-post eller passord.

### 9.2 Leo-delen (nettbrett først, også PC)
- Store trykkflater (≥ 48 px), tekst ≥ 20 px, lettlest skrift, rolige farger, ingen nedtellingsklokker.
- **Læreren** er en egendesignet, original figur (SVG) med noen få uttrykk (glad, tenker, oppmuntrende). Leo velger navn.
- **Hjem:** **medaljongen** står sentralt. Tildelte deler skinner, og pågående del viser opplyste steiner. Under den ligger et kart over delene der Leo velger hvilken del han vil jobbe med (blant de tilgjengelige), og et pågående **kapittel i en fortelling** basert på hans sterkeste interesse.
- **Økt:** oppgavetekst + visuell representasjon, svar via stort talltastatur, tale eller manipulativ. Knapper: «Les høyt», «Jeg vil ha et hint», «Jeg vil forklare» (mikrofon). En diskret fremgangsindikator viser medaljongbiten som fylles.
- **Manipulativer (interaktive komponenter):** dele-ut-verktøy (dra gjenstander inn i grupper, for delingsdivisjon), gruppe-verktøy (lag grupper på N, for målingsdivisjon), rutenett/array (rader × kolonner), tallinje med hopp, tierblokker, roterbare 3D-figurer (SVG/CSS) og et lite rutenett-spillbrett for algoritmer (gi en figur instruksjoner med løkker og vilkår).
- **Mine interesser:** chips med bilder + legg til egen (tekst eller tale, moderert). Leo kan skru interesser av og på.
- **Tale:** tekst-til-tale for all lærertekst (auto-opplesing kan slås av), cachet i Supabase Storage etter tekst-hash. Hold-for-å-snakke-knapp for tale-til-tekst. Vis alltid transkripsjonen, slik at Leo ser hva som ble oppfattet.
- **Feiring:** kort, varm animasjon når en ferdighet mestres. En større feiring når en medaljongbit tildeles, og en egen avslutningsfeiring når medaljongen er hel. Ingen ledertavler, ingen straff for brutte rekker, ingen tilfeldige belønninger.
- Tilgjengelighet: tastaturnavigasjon, aria-labels, høy kontrast, respekter `prefers-reduced-motion`.

### 9.3 Foreldredashbord
- **Oversikt:** medaljongstatus, tid brukt per dag/uke, antall økter, trend i treffsikkerhet, humørtrend.
- **Varsel** når Leo har fått en ny medaljongbit (markeres som sett), med knapp for **utskrift av diplom** for biten eller hele medaljongen (egen utskriftsvennlig side).
- **Ferdighetskart:** status per ferdighet (ikke startet / øver / mestret / til repetisjon) koblet til kompetansemål og medaljongdel.
- **Profil:** KI-ens observasjoner om Leo med confidence og bevis (lenker til økter). Forelder kan **låse, redigere, avvise** eller legge til egne.
- **Misoppfatninger:** aktive og løste.
- **Hva funker for Leo:** bandit-resultater i forståelig form («Leo lærer mest med konkrete oppgaver og når han prøver først»).
- **Økter:** sammendrag, full samtalelogg og verktøykall (for innsyn og feilsøking).
- **Sikkerhetsflagg:** liste med utdrag, kan markeres som sett.
- **Innstillinger:** øktlengde, daglig maks, tillatte tidsrom, tale, trinn, kjør kartlegging på nytt, PIN, KI-budsjett og forbruk.
- **Personvern:** eksporter all data (JSON), slett all data, slett samtalelogger eldre enn X måneder (default 12).

Dashbordet krever ingen innsats for å fungere. Alt over er innsyn og valgfrie justeringer.

## 10. Sikkerhet og personvern
- Supabase i EU-region, Vercel-funksjoner i EU-region.
- RLS på alle tabeller. Service-nøkkelen brukes kun server-side i route handlers.
- Rate limiting på KI-endepunkter (per enhet og per minutt).
- Ingen tredjeparts sporing eller analyse-skript.
- `.env.example` med alle variabler, ingen hemmeligheter i repoet.
- Dokumenter i `docs/PRIVACY.md` hva som lagres, hvor, hvor lenge og hva som sendes til OpenAI.

## 11. Testing og kvalitet
- **Enhetstester (Vitest):** alle generatorer (1000 oppgaver per nivå), mastery-oppdatering, doble mestringskrav, FSRS-mapping, kandidater (ZPD-mål, blanding, frustrasjonsvern), hint-maskinen, bandit (konvergerer mot beste arm i syntetisk test), medaljong (statusoverganger, mesterprøve-regler, dagsregel, biter tas aldri bort), validering av modellens egne oppgaver, fletteregler for observasjoner, guards (fasit-lekkasje).
- **Verktøytester:** hvert verktøy med gyldige og ugyldige argumenter, inkludert forsøk på å bryte harde regler (mestring uten data, mesterprøve for tidlig, oppgave uten mestrede forkunnskaper, feil fasit i `foreslå_egen_oppgave`).
- **Agent-løkke med mock-modell:** skriptede verktøysekvenser, maks antall kall, retry og fallback.
- **Simulert elev (`scripts/simulate.ts`):** syntetiske elever med skjulte ferdighetsnivåer og preferanser kjører 200 økter med en regelbasert stand-in for agenten (ingen ekte KI-kall). Verifiser at θ konvergerer mot sann verdi, at faktisk treffprosent ligger i 70–85 %, at banditten finner foretrukket strategi, og at en simulert elev med jevn fremgang tjener alle fire medaljongdeler i riktig rekkefølge.
- **Agent-evaluering (`npm run eval:agent`):** 30 skriptede scenarioer mot ekte modell. Blant annet: feil svar, masing etter svaret, avsporing, «jeg er dum», trist melding, personinfo, Leo svarer «vet ikke» på skolespørsmålet, Leo beskriver en skolemetode, og modellen fristes til å foreslå mestring for tidlig. Sjekker: ingen fasit-lekkasje, bokmål, lengde, riktig `safety_flag` og fornuftige verktøyvalg.
- **E2E (Playwright):** forelder logger inn → aktiverer Leo-modus → kartlegging → økt med hint → mestring av ferdighet → (seedet) mesterprøve → bit tildeles → dashbord viser varsel og diplom.
- CI med GitHub Actions: lint, typecheck, enhetstester, simulering.

## 12. Milepæler

Arbeid milepæl for milepæl. Etter hver: kjør alle tester, oppdater `docs/PROGRESS.md` og commit med beskrivende melding. Ta rimelige valg selv der spesifikasjonen er uklar, og skriv dem ned i `docs/DECISIONS.md`.

| # | Innhold | Akseptkriterier |
|---|---|---|
| **M0** | Repo-oppsett: Next.js, TS strict, Tailwind, shadcn/ui, Vitest, Playwright, ESLint/Prettier, CI, `AGENTS.md`, `.env.example`, `docs/curriculum/` | `npm run lint`, `typecheck`, `test` og `build` går grønt i CI |
| **M1** | Supabase-migrasjoner, RLS, auth for forelder, opprett elevprofil, Leo-modus med PIN | Forelder kan logge inn, opprette Leo og låse/låse opp Leo-modus; RLS-tester passerer |
| **M2** | Læreplan, ferdighetsgraf med medaljongdeler, alle generatorer, misoppfatningskatalog | 25–40 ferdigheter i DAG fordelt på Basecamp + 4 deler; generatortester grønne |
| **M3** | Læringsmotor: mastery, FSRS, kandidater, hints, bandit, øktfaser, medaljong, validering; simulert elev | Alle motortester grønne, og simuleringen oppfyller kriteriene i seksjon 11 |
| **M4** | Agent: provider, verktøy, agent-løkke, kontekstbygger, guards, kontekstualisering, evaluering, moderering, fallback, kostnadslogg | Verktøy- og løkketester grønne; agent-eval ≥ 95 % bestått; null fasit-lekkasje; ingen brudd på harde regler |
| **M5** | Leo-UI: hjem med medaljong og kart, økt med talltastatur og manipulativer, interesser, kartlegging, mesterprøve, feiringer | Full økt og mesterprøve kan gjennomføres på nettbrettstørrelse; e2e-test grønn |
| **M6** | Tale: TTS med cache, STT, auto-opplesing | Alt lærerinnhold kan leses høyt; tale-svar fungerer i iPad Safari og Chrome |
| **M7** | Refleksjon etter økt, profilobservasjoner, interessevekting, skoletema fra Leo, fortellings-/kapittelmotor | Observasjoner oppdateres etter flettereglene; kapittel tilpasses interesse; skoletema utløper |
| **M8** | Foreldredashbord komplett: medaljongvarsel, diplomutskrift, innsyn i verktøykall, sikkerhetsflagg, eksport/sletting | Alle funksjoner i 9.3 fungerer; eksport gir komplett JSON; diplom ser bra ut på utskrift |
| **M9** | Herding: rate limiting, budsjettstyring og fallback-modus, tilgjengelighet, ytelse, `PRIVACY.md`, `DEPLOY.md` (steg for steg for en nybegynner: Supabase, Vercel, miljøvariabler) | Lighthouse ≥ 90 på tilgjengelighet; fallback-modus testet; deploy til Vercel dokumentert |

## 13. AGENTS.md (lag denne i M0)
Skal inneholde: prosjektmål i tre setninger, prinsippene fra seksjon 2, mappestruktur, kommandoer (`dev`, `test`, `lint`, `typecheck`, `simulate`, `eval:agent`), konvensjoner (TS strict, Zod på grenser, ingen fasit fra KI uten verifisering, all brukertekst på bokmål, `lib/engine` uten I/O, harde regler kun i motoren) og «definition of done» (tester grønne, PROGRESS.md oppdatert).
