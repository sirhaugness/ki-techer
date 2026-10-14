# Kontroll av historiedrevet Preview

## Omfang og kilder

Arbeidet viderefører avtalen i [STORY-DRIVEN-ADVENTURE.md](STORY-DRIVEN-ADVENTURE.md). PR #11 ble merget av andre under arbeidet. Etterfølgende rettelser samles i [PR #14](https://github.com/sirhaugness/ki-techer/pull/14), uten at hovedagenten endrer produksjon.

Ekte modellprøving skjer i leo-dev med en separat, midlertidig syntetisk elevprofil, eksisterende Preview-nøkkel og innlogget Chromium. Modellen gpt-5.2 bruker faktiske nettkilder før kapittelplanlegging; gpt-5-mini kontrollerer planen. Håndskrevne browser-fixtures og enhetstester dokumenterer mekanikk, ikke kvaliteten på ekte historier.

## Funn og rettelser

| Funn                                                                         | Tiltak og bevis                                                                                                                                                                                               |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Forsøk på feil svar viste `{{known}}` og `{{total}}`.                        | Mengdene bindes før visning, også for allerede lagrede nye scener. Regresjonstest er bestått.                                                                                                                 |
| Gjenåpning etter midnatt forsøkte å registrere samme oppgave-ID på nytt.     | Gjenopptakelse bruker den allerede lagrede oppgaven, også ved interessebytte tilbake. Ny regresjonstest og uavhengig etterkontroll er bestått.                                                                |
| Samme regnestykke kunne velges fem ganger.                                   | Gjentatt oppgaveindeks avvises og tilstanden beholdes; isolert reproduksjon bekreftet dette. Testkapitler velger andre runde med nye tall.                                                                    |
| Rest, handel og ukjent mengde eksponerte interne svarparametere.             | Bare gitte mengder brukes. Tester godtar den naturlige oppgaven og avviser skjulte svarfelter. Uavhengig reviewer kontrollerte alle 35 generatorene og 3500 genererte oppgaver.                               |
| Geometri manglet en figur å undersøke.                                       | Korrekte 2D-former og en 3D-utforsker med rotasjon, vipping og markering av flater/kanter/hjørner. Mesh-egenskapene kontrolleres mot læreplanens uavhengige fasit.                                            |
| Algoritmebrettets svar-knapp gjorde ingenting; y forsvant ved gjenåpning.    | Brettet fyller begge felt, og begge lagrede koordinater gjenopprettes. Etterkontroll ved kodeinspeksjon.                                                                                                      |
| R2-D2 og Chewbacca fikk feil utseende; Falcon ble tegnet som X-wing.         | Kjente navn får stabile, passende figurer. Falcon har egen skipsform.                                                                                                                                         |
| Bygging i lager viste uendret tom kasse.                                     | Løst scene viser en ferdig kasse med egen animasjon.                                                                                                                                                          |
| Geometri ga en lite naturlig forkledning; redningen av Leia ble hoppet over. | Kritikeren krever fysisk nødvendig matematikk, faktisk utført redning eller uttrykkelig uløst mål, og kostnader i riktig enhet. Dette forbedrer kontrollen; et tidligere lagret kapittel blir ikke omskrevet. |

## Uavhengige vurderinger

Designer gjennomgikk skjermbilder fra ekte modell, samhandling og CSS. Tutor-evaluator vurderte faktisk modelltekst, kontrollert matematikk og kontinuitet. Reviewer gjennomgikk kode og kjørte isolerte reproduksjoner. Alle tre startet som reelle underagenter etter at den nye agentarbeidsflyten ble tilgjengelig. Bare hovedagenten endret appkode og testet delt Preview. Dokumenterte kodefunn er rettet og etterkontrollert; innholdsfunn vurderes videre mot nye ekte kapitler.

## Observert lokal kontroll

- 437 Vitest-tester bestått; lint, typecheck, formatering og simulering bestått.
- 18 eksisterende nettlesertester bestått; to lokale Auth-tester krever separat Supabase og ble hoppet over. Fire tester som først stoppet på manglende videoverktøy, er kjørt på nytt med verktøyet og alle bestått. Det omfatter hele kapitler i to universer, feil/riktig svar, senere valgkonsekvens, oppfriskning og redusert bevegelse.
- Webpack-produksjonsbygg bestått. Vercels vanlige bygg for kodecommit `871779b` er READY. Kvalitetsjobben [38655914992](https://github.com/sirhaugness/ki-techer/actions/runs/38655914992), full lokal Supabase/Auth og dev-migrasjonsjobben [38655914979](https://github.com/sirhaugness/ki-techer/actions/runs/38655914979) er observert grønne for `871779b`.
- Lighthouse: 100/100 tilgjengelighet på åtte sider, inkludert den nye historiedrevne siden. Dette var før de siste figur-/svarrettelsene; fysisk iPad/Safari er ikke prøvd.

## Ekte modell i innlogget Preview

Testen brukte en egen syntetisk profil i leo-dev. Star Wars-research lagret ni kilder, blant annet offisiell Star Wars Databank; dinosaur-research lagret elleve kilder. Testen brukte serverens eksisterende nøkkel, faktiske nettsøk og faktisk modelltekst. Ingen fixture erstattet hosted API-svar.

Alle seks oppdrag i Star Wars kapittel 1 er løst med svar avledet uavhengig fra de gitte mengdene/figurene. Feilforsøk, kostnad/rest, valgets senere konsekvens og seks lagrede hendelser er observert. Et ekte kapittel 2 ble generert. Dette avdekket en kontinuitetsfeil: valgets ekstrakonsekvens hadde erstattet felles avslutning i arkivet, slik at neste kapittel kunne miste at Falcon hadde tatt av. Felles avslutning bevares nå både i scenen og historikken; gammel lagret tekst omskrives ikke.

Alle seks oppdrag i Dinosaurer kapittel 1 er også løst, og valg med kostnad/rest er lagret. Første kapittelovergang traff modellens tidsgrense. En senere prøve ble feilaktig avvist fordi kritikeren vurderte feil i eldre historier og tolket ressursnavn som antall enheter. Kritikeren får nå en uforanderlig oversikt over fortellerfakta, mens forfatteren fortsatt får komplett historikk. Ressursnavnet i valget er et eget felt: tau skal ikke vises som dinosaurer. Dette er etterkontrollert av reviewer, med regresjonstest av både valgpanelet og lagret hendelse.

Dinosaurer kapittel 2 er nå faktisk generert og åpner med kartet som ble revet i slutten av kapittel 1. Alle seks oppdrag er gjennomspilt med riktige svar, lagret valg om harpiksklumper, senere konsekvens og oppfriskning etter hvert oppdrag. Deretter er et ekte kapittel 3 generert. Arkivet har seks hendelser og ett valg fra hvert av kapitlene 1 og 2. Browser-scriptet fullførte med null nettleserfeil.

Andre driftsfunn fra denne prøven er rettet: gjenopptakelse registrerer ikke oppgave-ID på nytt, gjenværende øvingsminutter avrundes ned før heltallskolonnen lagres, og et gammelt eventyr oppgraderes etter den nåværende løste oppgaven. Kapittelgenerering har en samlet frist med plass til kontroll og lagring. Et avvist kapittel endrer ikke elevens fremdrift. Avkuttede modelltekster får mer plass og uttrykkelig krav om korte, hele setninger.

Ingen påstand om god fortellerkvalitet bygger bare på grønt bygg, modellkritiker eller mock-tester. Eksemplene over viser også svakheter som faktisk ble funnet, ikke bare vellykkede svar.

## Begrensninger og hva Thor må gjøre

Sceneutvalget har en begrenset illustrasjons- og animasjonsbibliotek. Det er ikke nye, profesjonelt illustrerte animasjoner generert for hver hendelse. Tidligere kapitler kan bare videreføres med informasjon den gamle versjonen faktisk lagret. Lang kapittelgenerering viser fremdrift, men modellen kan fortsatt bruke over ett minutt. Kvalitetskontrollen er strengere, ikke en garanti mot alle dårlige historier.

Den verifiserte koden er tilgjengelig i [Preview](https://ki-techer-p3k51oqfo-team-thor1.vercel.app). Thor skal vurdere den spillbare testversjonen og de faktiske scenene før eventuell merge av PR #14. Ingen nøkkel eller oppsett trengs.

## Første kvalitetsstopp

I siste Preview er de tre første Star Wars-oppdragene i det faktiske, lagrede kapittel 2 løst: finne den skjulte celleverdien, gi døra mer kraft og telle støysendere før et matematisk rutevalg. Dette er faktisk generert tekst, ikke en håndskrevet fixture. Den påviste gamle kontinuitetsfeilen og avkuttede gamle setninger er fortsatt synlige i denne lagrede historien; de er ikke retroaktivt rettet. Også de tre første oppdragene i Dinosaurer kapittel 3 er gjennomspilt: finne koden på sporhella, legge steinmerker i grupper og telle leirekiler før et valg. Begge universer ble prøvd i kodeversjon `871779b`, med feilforsøk, oppfriskning og interessebytte; kontrollscriptet fullførte med null nettleserfeil.

Skjermbilder, opptak, publike responser og et anonymt arkivutdrag fra den syntetiske profilen ligger i arbeidsmiljøets `/workspace/story-verification/live` og `/workspace/story-verification/checkpoint`. Dette er evalueringsartefakter; de inneholder ingen API-nøkkel eller innloggingshemmelighet. Profilen og agentens egne midlertidige delingslenker fjernes når gjennomspillingen er avsluttet.

## Siste uavhengige kvalitetsvurdering

Designer og tutor-evaluator undersøkte de faktiske treoppdragsprøvene etter gjennomspillingen. Alle seks fasiter er riktige (Star Wars: 6, 12, 20; Dinosaurer: 6, 20, 8). De vurderer historiekjedene som tydeligere, men ikke som ferdig oppnådd spillkvalitet.

Barnesynlige interne ord som «map» og «storage» fjernes fra scenens svarteller; den viser nå «Svaret ditt» og det valgte tallet. Ferdig elveillustrasjon vises bare i skog/elv, krystallillustrasjon i hule og ørkenhangar der ørkenstedet passer. Valgets overskrift får lys tekst på mørk bakgrunn. Forfatteren får uttrykkelig muligheten `none` dersom ferdige bilder ikke passer. Dette retter konkrete visningsfeil også i lagrede scener.

Tutor-evaluator fant dobbelbruk av åtte kiler: success hadde allerede satt dem på plass, mens valget brukte dem igjen. Forfatter og kritiker krever nå at afterMission klargjør en ubrukt ressursmengde, og at senere oppdrag faktisk utfører den valgte bruken. Dette skjerper kontrollen; det avdekkede gamle kilevalget blir ikke omskrevet, og forbedringen er ikke dokumentert med et nytt modellgenerert kapittel etter denne siste instruksjonsendringen.

Gjenstående kvalitetsmangler: generiske kart, kasser og verktøy illustrerer fortsatt enkelte stein-, kile- og posehandlinger upresist; den samme svarflaten brukes ofte; figurfortegnelsen kan vise en figur som ennå ikke er befridd. Et korrekt regnestykke og en akseptert modellplan er ikke i seg selv bevis på at handlingen er morsom eller visuelt presis. Neste gjennomgang må vurdere disse konkrete forholdene før merge.
