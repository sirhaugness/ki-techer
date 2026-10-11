# Tilgjengelighet og lokal måling

11. oktober 2026: Lighthouse 13.5.0 ga **100/100** på tilgjengelighet for forside, innlogging, elevhjem, aktiv matteoppgave, foreldredashbord og diplom. Kravet i M9 er minst 90.

Målingen bruker lokal Next-utviklingsserver med syntetiske data og Chromium, 1024 × 768. Den bekrefter automatiske tilgjengelighetsregler for disse visningene; den erstatter ikke fysisk iPad-test, skjermleser eller innlogget hosted Preview. `npm run audit:a11y` gjentar testen uten nøkler eller ekte KI-kall, og feiler under 90. JSON-/HTML-rapporter lagres i `test-results/lighthouse/`; CI laster dem opp som `accessibility-reports`.

Appen har norsk dokument­språk, navngitte kontroller, tastaturfokus, hopp-til-innhold, store trykkflater, tydelige feil/statusmeldinger og støtte for redusert bevegelse. Diplomet har separat utskriftsstil. Test tastaturrekkefølge, zoom og stående/liggende iPad manuelt som i [testplanen](IPAD-TESTPLAN.md).

Ytelse: forelders økthistorikk hentes i sider på 20; full eksport/øktinnsyn aggregeres i SQL uten REST-kutt. Nye indekser dekker historie, månedsforbruk og loggopprydding. Opplesing gjenbruker privat lydcache, inputstrømmer har faktiske størrelsesgrenser, betalte kall har 20 sekunders timeout uten SDK-retries, og klienten får aldri servernøkler eller oppgavefasit. Ingen Lighthouse-ytelsesscore for produksjon påstås på grunnlag av utviklingsserveren.
