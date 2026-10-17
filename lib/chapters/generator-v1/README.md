# Frossen kapittelgenerator 1

Kopiert fra motoren ved `588578e` (R2). Persistente oppgavereferanser med
`generatorVersion: 1` bruker denne implementasjonen, også etter senere endringer
i den ordinære læringsmotoren. Nye generatorregler krever en ny versjon.

Runtime-importene er lokale eller versjonspinnede biblioteker. Importen av
`MisconceptionCode` fra motoren er kun en TypeScript-type. Ferdighetslisten er
frosset; den aktive motorens forkunnskapsvalg gjøres før nye referanser opprettes.

`tests/chapters/generator-v1.test.ts` låser 3500 komplette oppgaveutfall: alle
35 ferdigheter, fem nivåer og 20 seeds. Sjekksummen skal ikke oppdateres for å
tilpasse gamle lagrede kapitler til nye regler.
