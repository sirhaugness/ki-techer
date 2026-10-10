import { simulationReport, assertSimulation } from '../lib/engine/simulation';
const report = simulationReport();
console.log(JSON.stringify(report, null, 2));
assertSimulation(report);
console.log('Alle simuleringskriteriene er oppfylt. Ingen KI-kall.');
