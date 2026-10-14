# Verifisering av kapittelkjeden

13. oktober 2026. Ingen produksjonsendringer.

Historien som kontrolleres: Leo velger en interesse → serveren planlegger seks oppdrag → generator/AST kontrollerer matematikken → hvert svar lagres atomisk med evidens og historiekonsekvens → Leo velger en rute → neste kapittel bruker hukommelsen og de samlede svarene. Ved interessebytte ligger tidligere oppgave og støtte på pause, mens læringen følger Leo.

| Grense                   | Kontroll                                                                                                                                                                                                                                                                            |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Interesse → kapittel     | Modellerstatning lager eget Minecraft-univers. Star Wars og dinosaurer har forskjellige karakterer, steder, aktiviteter og ruteeffekter. Ugyldig modellplan og tjenestefeil gir komplett reservekapittel.                                                                           |
| Plan → matematikk        | Alle 35 generatorferdigheter på fem nivåer kontrolleres av produksjonsvalidatoren; eksisterende uavhengige generatororakler tester 1000 eksempler per ferdighet/nivå. Korrupte numeriske, koordinat-, rest- og valgsvar avvises.                                                    |
| Svar → støtte            | x/X/×/* og passende gjentatt addisjon godtas. Riktig tall med feil uttrykk venter på regnemåte og gir ingen negativ regneevidens. Forklaringsrespons kan ikke omgjøre et riktig tall til galt.                                                                                      |
| Svar → lagring           | PostgreSQL/PGlite kjører eksisterende atomisk RPC og sammenligner faktisk lagret kapittel/evidens med læringsmotorens snapshot. Idempotens og revisjonsvern beholdes.                                                                                                               |
| Kapittel → neste         | Nettleseren løser seks oppdrag, velger BB-8s rute, får adgangsbrikke og ser kapittel 2 bruke droidens kart og brikken. Motorprøven ser flere feil på samme ferdighet over flere oppdrag og kontrollerer ekstra øving med beholdt variasjon.                                         |
| Lærer → nettleser        | Automatisk forklaring har egen lesende forespørsel. Nettlesertest holder responsen tilbake, ser ventestatus, går videre og kontrollerer at det gamle svaret ikke vises. Skrivefelt og sendeknapp flyttes ikke ved rulling i dialogen.                                               |
| Nettleser → fortsettelse | Oppfriskning beholder oppgaven. Bytte til dinosaurer og tilbake gjenopptar Star Wars kapittel 2. Uferdig oppgave/hint og ventende valg videreføres også mellom økter.                                                                                                               |
| Bilde → scene            | Seks Wikimedia-bilder er lastet ned, kontrollert som faktiske bildefiler og tilgjengelige fra lokale `/adventure/`-stier. Nettleseren kontrollerer `complete` og `naturalWidth`. Avbrutt bildekall gir reservevisning og spillbar oppgave. Kilder: `public/adventure/sources.json`. |

Skjermbilder: `test-results/adventure-mobil.png`, `adventure-nettbrett.png`, `adventure-PC.png`, `chapter-continuation.png`, `teacher-composer.png`. Disse er lokale testartefakter og ligger ikke i git.

Testene bruker ingen ekte OpenAI-kall og bekrefter dermed ikke den ekte modellens språklige kvalitet. Tekstbehov er evidens fra elevens spørsmål, ikke en sikker automatisk diagnose. Interessebilder er enkle portretter/fotografier. Vilkårlige interesser har modellplan og valgfritt Wikipedia-bilde, men mer generell reservefortelling ved tjenestefeil. Fysisk iPad/Safari er ikke prøvd.

Hva Thor må gjøre: Prøv den innloggede Preview-flyten med ekte modell og minst to interesser før merge. Se også siste oppføring i PROGRESS.md for samlede kvalitetsresultater og Preview-status.
