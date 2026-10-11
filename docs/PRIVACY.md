# Personvern i M1–M3

Supabase lagrer forelderens e-post for innlogging, husholdningstilknytning, barnets fornavn/trinn/lærernavn og enhetslås. PIN lagres bare som saltet scrypt-hash i en tabell uten klienttilgang. Nettleseren får nødvendige HttpOnly sesjons- og enhetscookies. Ingen analyse- eller sporingsskript er lagt til.

Databasen har plass til senere oppgaver, forsøk, økter og profilobservasjoner. Disse fremtidige funksjonene er ikke koblet til elev-UI-et ennå. Referansedata fra læreplanen er upersonlige. Ingen opplysninger sendes til OpenAI i M1–M3, og testene bruker syntetiske data.

Velg EU-region for begge Supabase-prosjektene. Vercel-funksjoner er konfigurert til Frankfurt. E-post sendes av Supabase Auth eller SMTP-leverandøren du konfigurerer der. Forelderinnlogging og RLS avgrenser husholdningene. Leo-modus er en UI-lås på en innlogget forelders nettleser; den erstatter ikke forelders tilgangssikring på enheten.

Eksport, sletting fra dashbordet og automatisk opprydding av gamle logger er planlagt i M8–M9. Ikke betrakt denne grunnmuren som ferdig produksjonsprodukt for et barn før de resterende milepælene og personvernfunksjonene er gjennomført.
