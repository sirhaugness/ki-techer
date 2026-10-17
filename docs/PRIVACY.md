# Personvern i M1–M9

## Nye kapitler (R3)

Den nye kapittelflyten lagrer interesse, kilder, utkast, redaksjonell vurdering,
kontrollert kapittelpakke, kalljournal, faktisk sagahistorikk, svar/valg og
spilletid i Supabase. Rå utkast, fremtidige oppgaver og fasit er bare tilgjengelige
for serveren. Barnets API får en projeksjon av gjeldende oppdrag; forelderens
eksport inkluderer de nye postene. Sletting av elev/appdata kaskaderer til dem.
Sletting stopper nye sjekkpunkter, men kan ikke trekke tilbake et leverandørkall
som allerede er sendt.

Research sender interesse til webresearch, uten elevnavn eller rå samtalelogger.
Utkast og kritikk får relevant faktisk sagahistorikk og kontrollerte oppgavemenyer.
Interesse/saga kan derfor inneholde elevskrevet tekst; moderering og eksisterende
leverandørvilkår gjelder. Ingen nye bildeleverandører brukes i R3.

Vercel Workflow 5 kjører kapittelforberedelse med eksplisitt Stockholm-region
`arn1`. Workflow lagrer også tekniske run-/stegdata og begrensede inngangsdata
(elev-/husholdnings-ID og interesse). Hobby har én dags oppbevaring av fullførte
runs; Supabase beholder de varige dataene. Dette er ikke en garanti om OpenAIs
behandlingsregion eller øyeblikkelig sletting fra leverandørenes sikkerhetskopier.

## Eksisterende læringsflyt

Supabase lagrer forelderens e-post for innlogging, husholdningstilknytning, barnets fornavn/trinn/lærernavn, interesser og enhetslås. PIN lagres bare som saltet scrypt-hash i en tabell uten klienttilgang. Nettleseren får nødvendige HttpOnly sesjons- og enhetscookies. Ingen analyse- eller sporingsskript er lagt til.

Matteøkter lagrer oppgaver, svar, hintbruk, fremgang, samtaler, verktøykall og kostnadsestimater. Forelderinnlogging, serverkontroll av Leo-låsen og RLS avgrenser husholdningene. Servernøkkelen er aldri tilgjengelig i nettleseren. Leo-modus er en UI-lås på en innlogget forelders nettleser; den erstatter ikke forelders tilgangssikring på enheten.

Den kompakte mattekonteksten og godkjent tekst sendes til OpenAI når KI-funksjonene brukes. Responses settes til `store:false`. Det er ikke en påstand om null oppbevaring hos leverandøren; OpenAI-kontoens datavilkår og eventuelle retention-avtaler gjelder fortsatt. Personinfo og uegnet tekst filtreres, og moderering feiler lukket. Testene bruker syntetiske data og mocks.

Mikrofonen krever tillatelse og er aktiv bare under opptak, maksimalt 30 sekunder. Rå taleopptak sendes til OpenAI for transkripsjon, men lagres ikke som lydfil i appens database eller Storage. Godkjent transkripsjon vises redigerbar; barnet må bekrefte talesvaret før det vurderes. Tekst som faktisk sendes inn kan inngå i svar/samtaler. Opplesingslyd fra godkjent lærertekst lagres i privat Supabase Storage; cache-nøkkelen avgrenser husholdning, tekst, modell og stemme. Nettleseren får lyden gjennom en autorisert serverrute, uten offentlige lydlenker.

Velg EU-region for begge Supabase-prosjektene. Vercel-funksjoner er konfigurert til Stockholm. Dette fastslår ikke OpenAIs behandlingsregion. E-post sendes av Supabase Auth eller SMTP-leverandøren du konfigurerer der.

Foreldersiden tilbyr komplett JSON-eksport av husholdningens appdata, inkludert samtaler og verktøykall, uten PIN-hash, API-nøkler og innloggingstokener. Lydcache beskrives med filreferanser. «Slett alle appdata» fjerner alle elevprofiler, læringshistorikk, PIN, forbrukslogger og private lydfiler; innloggingskontoen beholdes. «Slett forelders innloggingskonto» på profilsiden sletter også din Auth-konto og logger ut alle dine økter. Andre foreldres Auth-kontoer slettes ikke. Ved tjenestefeil viser appen hva som ikke kunne fullføres og lar forelder prøve igjen.

Forelder kan velge 1–36 måneders oppbevaring av samtalelogger (standard 12) og slette eldre logger nå. Kopien av meldinger i øktsnapshot ryddes samtidig; matematisk mestringsevidens bevares. Automatisk opprydding kjøres ved åpning av elevhjem eller autorisert foreldredashbord. Skoletema, inkludert råtekst i øktsnapshot, utløper etter sju dager. Privat opplesingslyd eldre enn 30 dager ryddes i grupper på inntil 100 filer per besøk. Ingen egen bakgrunnsjobb kjører for denne aldersbaserte oppryddingen; den skjer ved neste besøk. Matematisk mestring og forsøk beholdes til appdata slettes. Eksport/sletting påvirker ikke data som allerede er eksportert til en lokal fil eller eventuell leverandøroppbevaring hos OpenAI.

Profilminnet har faste confidence-regler, maks 25 aktive/låste observasjoner og bare synlige observasjoner i lærerens kontekst. Forelder kan redigere, låse og avvise. Gjentatt refleksjon over samme økt teller ikke dobbelt; manglende KI gir et faktabasert sammendrag uten oppdiktede observasjoner.

Budsjettdata lagrer månedsbeløp og reservasjoner uten samtaletekst; månedsrader ryddes etter 24 måneder og reservasjoner etter 12 måneder ved besøk. Forespørselstellere per enhet/minutt ryddes etter to timer ved besøk. Alle disse dataene inngår i eksport og appdatasletting. Budsjettet bruker kostnadsestimater med konservative reservasjoner; det er ikke leverandørens fakturabeløp. Eksport og sletting krever innlogget forelder uten aktiv Leo-lås; destruktive valg krever uttrykkelig tekstbekreftelse.

Sletting i appen fjerner aktive appdata og private lydfiler, men lover ikke øyeblikkelig fjerning fra leverandørens sikkerhetskopier. Supabase/OpenAI/e-postleverandørens egne vilkår og avtaler gjelder for eventuell ekstern oppbevaring.
