# Personvern i M1–M6

Supabase lagrer forelderens e-post for innlogging, husholdningstilknytning, barnets fornavn/trinn/lærernavn, interesser og enhetslås. PIN lagres bare som saltet scrypt-hash i en tabell uten klienttilgang. Nettleseren får nødvendige HttpOnly sesjons- og enhetscookies. Ingen analyse- eller sporingsskript er lagt til.

Matteøkter lagrer oppgaver, svar, hintbruk, fremgang, samtaler, verktøykall og kostnadsestimater. Forelderinnlogging, serverkontroll av Leo-låsen og RLS avgrenser husholdningene. Servernøkkelen er aldri tilgjengelig i nettleseren. Leo-modus er en UI-lås på en innlogget forelders nettleser; den erstatter ikke forelders tilgangssikring på enheten.

Den kompakte mattekonteksten og godkjent tekst sendes til OpenAI når KI-funksjonene brukes. Responses settes til `store:false`. Det er ikke en påstand om null oppbevaring hos leverandøren; OpenAI-kontoens datavilkår og eventuelle retention-avtaler gjelder fortsatt. Personinfo og uegnet tekst filtreres, og moderering feiler lukket. Testene bruker syntetiske data og mocks.

Mikrofonen krever tillatelse og er aktiv bare under opptak, maksimalt 30 sekunder. Rå taleopptak sendes til OpenAI for transkripsjon, men lagres ikke som lydfil i appens database eller Storage. Godkjent transkripsjon vises redigerbar; barnet må bekrefte talesvaret før det vurderes. Tekst som faktisk sendes inn kan inngå i svar/samtaler. Opplesingslyd fra godkjent lærertekst lagres i privat Supabase Storage; cache-nøkkelen avgrenser husholdning, tekst, modell og stemme. Nettleseren får lyden gjennom en autorisert serverrute, uten offentlige lydlenker.

Velg EU-region for begge Supabase-prosjektene. Vercel-funksjoner er konfigurert til Stockholm. Dette fastslår ikke OpenAIs behandlingsregion. E-post sendes av Supabase Auth eller SMTP-leverandøren du konfigurerer der.

Eksport, sletting fra dashbordet og automatisk opprydding av gamle logger og lydcache er planlagt i M8–M9. Ingen automatisk oppbevaringsfrist er implementert her. Disse personvernfunksjonene og resterende milepæler må gjennomføres før full produksjonsaksept.
