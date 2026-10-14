import { z } from 'zod';

export const stageSchema = z.enum([
  'hangar',
  'desert',
  'station',
  'forest',
  'river',
  'stadium',
  'workshop',
  'village',
]);
export const effectSchema = z.enum([
  'charge',
  'load',
  'reveal',
  'travel',
  'open',
  'build',
  'rescue',
  'signal',
  'launch',
  'arrive',
]);
export const assetSchema = z.enum([
  'pilot',
  'key',
  'fossil',
  'companion',
  'equipment',
  'map',
]);
export type StoryStage = z.infer<typeof stageSchema>;
export type StoryEffect = z.infer<typeof effectSchema>;
export type StoryAsset = z.infer<typeof assetSchema>;
export const activities = [
  'equation',
  'quantity',
  'compare',
  'grouping',
  'quantity',
  'native',
] as const;

type Beat = [StoryStage, StoryEffect, string, string, string, string];
/** Authored storyboards are also used when generation is unavailable; every beat has a purpose. */
const boards: Record<string, Beat[]> = {
  'Star Wars': [
    [
      'hangar',
      'charge',
      'energiceller',
      'energirekker',
      'Poe: «Motoren er mørk. Kan du fylle energipanelet?»',
      'Energicellene må være på plass før skipet kan starte.',
    ],
    [
      'desert',
      'reveal',
      'kartbiter',
      'kartfelt',
      'BB-8: «Her ligger bitene fra droidens kart!»',
      'Tell kartbitene, så kan BB-8 sette sammen sporet til porten.',
    ],
    [
      'desert',
      'travel',
      'energiceller',
      'forsyningskasser',
      'Poe: «Kartet virker. Hvor langt rekker forsyningene?»',
      'Finn mengden dere har før dere velger ruten til droiden.',
    ],
    [
      'station',
      'open',
      'energiceller',
      'ladestasjoner',
      'BB-8: «Droiden er bak porten. Låsene trenger strøm.»',
      'Fyll ladestasjonene riktig, så åpner porten.',
    ],
    [
      'station',
      'signal',
      'signalbrikker',
      'signalrekker',
      'Droiden: «Leia må få meldingen. Hjelp meg med senderen!»',
      'Finn brikkene senderen trenger for å sende varselet.',
    ],
    [
      'hangar',
      'launch',
      'energiceller',
      'lastkasser',
      'Poe: «Droiden er trygg. Nå gjør vi klar reisen til basen.»',
      'Kontroller den siste lasten før skipet tar av.',
    ],
  ],
  Dinosaurer: [
    [
      'forest',
      'load',
      'bær',
      'matsekker',
      'Dina: «Ungen er borte. Vi må pakke mat til letingen.»',
      'Tell maten før dere følger sporene inn i skogen.',
    ],
    [
      'forest',
      'reveal',
      'fotspor',
      'sporrekker',
      'Dina: «Små fotspor! De går mot elven.»',
      'Tell sporene for å finne ut om sporet fortsetter til bredden.',
    ],
    [
      'river',
      'travel',
      'planker',
      'materialhauger',
      'Dina: «Broen er borte. Hvilken sti kan vi klare?»',
      'Finn hvor mange planker dere har før dere velger overgang.',
    ],
    [
      'river',
      'build',
      'planker',
      'brofelt',
      'Dina: «Vi har funnet overgangen. Nå bygger vi brodekket.»',
      'Legg plankene i like felt, så kan dere krysse elven.',
    ],
    [
      'forest',
      'rescue',
      'bær',
      'matkurver',
      'Dina: «Der er ungen! Den trenger mat før den kan gå.»',
      'Finn maten som mangler, så følger ungen dere til redet.',
    ],
    [
      'forest',
      'arrive',
      'bær',
      'redekurver',
      'Dina: «Familien venter. Vi deler ut resten av maten.»',
      'Gjør maten klar, så kommer ungen trygt hjem.',
    ],
  ],
  Fotball: [
    [
      'workshop',
      'load',
      'drikkeflasker',
      'utstyrsbagger',
      'Ada: «Gjestelaget mangler utstyr. Vi pakker til dem.»',
      'Tell flaskene før lagene forlater garderoben.',
    ],
    [
      'stadium',
      'reveal',
      'kjegler',
      'utstyrsrekker',
      'Ada: «Vi fant kjeglene! De skal brukes til oppvarming.»',
      'Finn mengden utstyr gjestelaget kan få.',
    ],
    [
      'stadium',
      'travel',
      'drikkeflasker',
      'bagger',
      'Ada: «Alle er her. Hvilken vei tar vi til banen?»',
      'Regn ut forsyningene før dere velger vei til kampen.',
    ],
    [
      'stadium',
      'build',
      'kjegler',
      'banerekker',
      'Dommeren: «Vi må merke banen før lagene kommer.»',
      'Plasser kjeglene i like rekker langs banen.',
    ],
    [
      'stadium',
      'rescue',
      'drikkeflasker',
      'lagkurver',
      'Ada: «Spillerne trenger drikke etter oppvarmingen.»',
      'Finn flaskene som mangler før kampen kan begynne.',
    ],
    [
      'stadium',
      'arrive',
      'fotballer',
      'ballnett',
      'Ada: «Begge lagene er klare. Vi sjekker ballene.»',
      'Gjør kampens siste utstyr klart, så går spillerne ut på banen.',
    ],
  ],
  Verdensrommet: [
    [
      'station',
      'charge',
      'energiceller',
      'panelrekker',
      'Nova: «Et nødsignal! Landeren trenger strøm.»',
      'Fyll energipanelet før dere reiser til planeten.',
    ],
    [
      'station',
      'signal',
      'signalbrikker',
      'signalrekker',
      'Nova: «Signalet kommer fra en hule. Vi stiller inn mottakeren.»',
      'Tell brikkene som gjør nødsignalet tydelig.',
    ],
    [
      'desert',
      'travel',
      'energiceller',
      'forsyningskasser',
      'Nova: «Vi ser planeten. Hvor kan vi lande?»',
      'Finn energimengden før dere velger landingsrute.',
    ],
    [
      'desert',
      'open',
      'energiceller',
      'ladestasjoner',
      'Forskeren: «Luftslusen sitter fast. Gi den strøm!»',
      'Fyll stasjonene, så kommer forskerne ut av hulen.',
    ],
    [
      'station',
      'signal',
      'signalbrikker',
      'senderfelt',
      'Nova: «Satellitten kan sende månekartet hvis vi reparerer den.»',
      'Finn brikkene som mangler i satellittens sender.',
    ],
    [
      'hangar',
      'launch',
      'energiceller',
      'lastkasser',
      'Nova: «Forskerne er om bord. Nå reiser vi hjem.»',
      'Kontroller lasten før landeren tar av med forskerne.',
    ],
  ],
  Dyr: [
    [
      'forest',
      'load',
      'epler',
      'matkurver',
      'Mia: «Reven er sulten og finner ikke hjem etter stormen.»',
      'Tell maten dere kan ta med til reven.',
    ],
    [
      'river',
      'reveal',
      'fotspor',
      'sporrekker',
      'Mia: «Reven fant spor ved bekken.»',
      'Tell sporene som leder til dyrenes hule.',
    ],
    [
      'forest',
      'travel',
      'epler',
      'reisekurver',
      'Mia: «Stiene deler seg. Hvor langt rekker maten?»',
      'Finn forsyningene før dere velger sti for dyrene.',
    ],
    [
      'river',
      'build',
      'planker',
      'brofelt',
      'Mia: «En grein sperrer veien. Vi lager en liten overgang.»',
      'Legg plankene i like felt, så kan pinnsvinet passere.',
    ],
    [
      'forest',
      'rescue',
      'epler',
      'matkurver',
      'Mia: «Dyrene er samlet, men noen mangler mat.»',
      'Finn maten som mangler før dyrene følger dere hjem.',
    ],
    [
      'village',
      'arrive',
      'epler',
      'fôrkurver',
      'Mia: «Der er hjemmet deres. Vi gjør klart før regnet.»',
      'Fordel den siste maten, så kan dyrene finne ro.',
    ],
  ],
  Bygging: [
    [
      'workshop',
      'load',
      'planker',
      'materialvogner',
      'Bo: «Landsbyens bro er stengt. Vi pakker materialene.»',
      'Tell lasten før vognene kan kjøre til elven.',
    ],
    [
      'river',
      'reveal',
      'steiner',
      'materialhauger',
      'Bo: «Gravemaskinen fant fast grunn under sølen.»',
      'Finn steinmengden som kan brukes til støttene.',
    ],
    [
      'river',
      'travel',
      'planker',
      'materialvogner',
      'Bo: «Hvor kan vi bygge med materialene vi har?»',
      'Regn ut plankene før dere velger byggested.',
    ],
    [
      'river',
      'build',
      'planker',
      'brofelt',
      'Bo: «Støttene står. Nå legger vi brodekket.»',
      'Fyll brofeltene likt, så blir broen sammenhengende.',
    ],
    [
      'village',
      'open',
      'planker',
      'gjerderekker',
      'Bo: «Rekkverket mangler noe før broen kan åpnes.»',
      'Finn plankene som mangler i rekkverket.',
    ],
    [
      'village',
      'arrive',
      'planker',
      'materialvogner',
      'Bo: «Broen er klar. Landsbyen kommer for å prøve den.»',
      'Kontroller de siste materialene før broen åpner for alle.',
    ],
  ],
};
const continuingBoards: Record<string, Beat[]> = {
  'Star Wars': [
    [
      'hangar',
      'reveal',
      'kartbiter',
      'kartfelt',
      'Poe: «Droiden er med oss. La oss sette kartet til basen sammen.»',
      'Tell kartbitene fra droiden, så finner dere inngangen til basen.',
    ],
    [
      'station',
      'open',
      'energiceller',
      'panelrekker',
      'BB-8: «Brikken vi tok med, passer her. Nå trenger porten strøm.»',
      'Finn energien porten trenger før vennene kommer inn.',
    ],
    [
      'desert',
      'travel',
      'energiceller',
      'forsyningskasser',
      'Poe: «Kylo Rens signal er på radaren. Vi velger en trygg vei.»',
      'Regn ut forsyningene før dere velger rute rundt signalet.',
    ],
    [
      'station',
      'charge',
      'energiceller',
      'skjoldfelt',
      'Leia: «Vennene er inne. Hjelp meg å starte skjoldet.»',
      'Fyll skjoldfeltene, så blir basen beskyttet.',
    ],
    [
      'station',
      'signal',
      'signalbrikker',
      'senderrekker',
      'Droiden: «Jeg kan sende flyruten til vennene våre.»',
      'Gjør senderen klar, så kjenner alle den trygge ruten.',
    ],
    [
      'hangar',
      'launch',
      'energiceller',
      'lastkasser',
      'Poe: «Vi har beskyttet basen. Nå følger vi signalet fra månen.»',
      'Kontroller lasten til reisen som Leias varsel åpnet.',
    ],
  ],
  Dinosaurer: [
    [
      'forest',
      'reveal',
      'fotspor',
      'sporrekker',
      'Dina: «Ungen kom hjem over broen vår. Nå viser den nye spor.»',
      'Tell sporene som ungen fant ved det nye redet.',
    ],
    [
      'forest',
      'load',
      'bær',
      'matkurver',
      'Dina: «Ungen blir med videre. Vi pakker mat til familien.»',
      'Finn maten dere kan ta med fra det gamle redet.',
    ],
    [
      'river',
      'travel',
      'planker',
      'materialhauger',
      'Dina: «Et ras sperrer stien. Hvilken overgang kan vi bygge?»',
      'Finn materialene før dere velger veien rundt raset.',
    ],
    [
      'river',
      'build',
      'planker',
      'brofelt',
      'Dina: «Vi vet hvordan vi bygger en bro. Her er bekken.»',
      'Legg brofeltene så flokken kan følge dere over.',
    ],
    [
      'forest',
      'rescue',
      'bær',
      'matkurver',
      'Dina: «Flokken er på sletten. Vi hjelper dem til redet.»',
      'Finn maten som gjør familien klar til å fortsette.',
    ],
    [
      'forest',
      'arrive',
      'bær',
      'redekurver',
      'Dina: «Det nye redet er her! Vi gjør maten klar.»',
      'Del ut den siste maten, så blir familien samlet ved redet.',
    ],
  ],
};
export function fallbackStoryboard(label: string) {
  return (
    boards[label] ??
    boards.Bygging.map((b) => {
      const copy = [...b] as Beat;
      copy[4] = copy[4].replace('Bo:', 'Iris:');
      return copy;
    })
  );
}
export function storyboardBeat(label: string, i: number, number = 1) {
  const [stage, effect, object, container, dialogue, purpose] = (
    number > 1
      ? (continuingBoards[label] ?? fallbackStoryboard(label))
      : fallbackStoryboard(label)
  )[i];
  return {
    stage,
    effect,
    object,
    container,
    dialogue,
    purpose,
    activity: activities[i],
  };
}
export function fallbackAsset(label: string, i: number): StoryAsset {
  return label === 'Star Wars'
    ? i
      ? 'key'
      : 'pilot'
    : label === 'Dinosaurer'
      ? i
        ? 'companion'
        : 'fossil'
      : label === 'Fotball'
        ? i
          ? 'equipment'
          : 'companion'
        : i
          ? 'map'
          : 'companion';
}

export function routePayoff(asset: StoryAsset, interest?: string) {
  const payoffs = {
    pilot: {
      effect: 'launch',
      scene:
        'Piloten dere møtte, tar plass i cockpiten. Nå kan dere klargjøre avreisen sammen.',
      outcome: 'Piloten starter skipet og tar vennene med videre.',
    },
    key: {
      effect: 'open',
      scene:
        'Adgangsbrikken fra vraket låser opp det skjulte senderrommet. Nå kan dere gi senderen strøm.',
      outcome: 'Brikken åpner senderrommet. Meldingen kommer fram til Leia.',
    },
    fossil: {
      effect: 'reveal',
      scene:
        'Fossilet fra elvestien passer til sporet i fjellet. Det viser en trygg åpning mot redet.',
      outcome: 'Fossilet viser veien. Dina og ungen finner åpningen til redet.',
    },
    companion: {
      effect: 'rescue',
      scene:
        'Følgesvennen dere hjalp på ruten, kommer tilbake og viser hvor vennene venter.',
      outcome: 'Følgesvennen leder vennene ut og blir med dere videre.',
    },
    equipment: {
      effect: 'load',
      scene:
        'Utstyret fra treningsbanen kommer fram. Ada gjør det klart til oppvarmingen.',
      outcome:
        'Det ekstra treningsutstyret er pakket og gjør laget klart til finalen.',
    },
    map: {
      effect: 'reveal',
      scene:
        'Kartet dere fant på den andre stien, viser en skjult vei rundt hindringen.',
      outcome: 'Kartets skjulte vei er klar. Vennene kan fortsette trygt.',
    },
  } as const;
  if (asset === 'pilot' && interest !== 'Star Wars')
    return {
      effect: 'launch',
      scene: 'Piloten fra ruten klargjør farkosten sammen med dere.',
      outcome: 'Piloten starter farkosten og tar vennene med videre.',
    } as const;
  if (asset === 'key' && interest !== 'Star Wars')
    return {
      effect: 'open',
      scene:
        'Nøkkelen fra ruten åpner rommet bak porten. Nå kan dere hjelpe vennene der inne.',
      outcome: 'Nøkkelen åpner porten. Vennene kan bli med videre.',
    } as const;
  if (asset === 'fossil' && interest !== 'Dinosaurer')
    return {
      effect: 'reveal',
      scene: 'Fossilet fra ruten viser et nytt spor dere kan undersøke.',
      outcome: 'Fossilet viser sporet. Dere finner veien videre.',
    } as const;
  return payoffs[asset];
}
