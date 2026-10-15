/** Deterministic browser fixture, only enabled by the existing local fixture gate. */
import type { AiProvider } from '../ai/provider';
import type { StoryChapter, StoryMission } from './story-contract';
type MenuItem = {
  index: number;
  skill: string;
  kind: string;
  mode?: string;
  quantities: Record<string, number>;
};

export function storyFixtureProvider(): AiProvider {
  return {
    research: async (interest) => ({
      interest,
      brief:
        interest === 'Star Wars'
          ? 'BB-8 hjelper Poe med navigasjon. R2-D2 reparerer skip. Leia leder motstanden.'
          : 'Dinosaurunger finner mat og følger spor ved elver og skog.',
      sources: [
        { title: 'Databank', url: 'https://www.starwars.com/databank/bb-8' },
        {
          title: 'Naturhistorie',
          url: 'https://www.nhm.ac.uk/discover/dinosaurs.html',
        },
      ],
      researchedAt: '2026-10-14T00:00:00Z',
    }),
    moderate: async () => true,
    respond: async (request) => {
      const input = JSON.parse(request.input);
      if (input.plan) {
        // Explicit mock verdicts for local rendering/flow tests, never model evidence.
        const pass = {
          pass: true,
          evidence: 'Mock: kontrollert testscene.',
          issue: '',
        };
        const history = input.immutableHistory;
        const source =
          history.inventory[0] ??
          history.chapters.flatMap(
            (c: { choices: string[] }) => c.choices,
          )[0] ??
          history.lastActualEvent?.id ??
          '';
        return {
          calls: [],
          value: {
            chapterContinuity: pass,
            practicalNovelty: pass,
            priorChoiceImpact: {
              ...pass,
              source,
              missionId: source ? input.plan.missions[0].id : '',
            },
            missions: input.plan.missions.map((m: { id: string }) => ({
              missionId: m.id,
              mathNecessary: pass,
              physicalRuleExplicit: pass,
              consequenceMatches: pass,
            })),
          },
        };
      }
      if (!input.items)
        throw new Error('Use deterministic teacher support in this fixture.');
      const space = input.interest === 'Star Wars';
      const chapter = input.chapter as number;
      const menu = input.items as MenuItem[];
      const mult = menu.find((m) => m.kind === 'groups') ?? menu[0];
      const missing = menu.find((m) => m.kind === 'missing') ?? mult;
      const twice = menu.find((m) => m.kind === 'double') ?? mult;
      const used = new Set<number>();
      const take = (kind: string) => {
        const next =
          menu.find((m) => m.kind === kind && !used.has(m.index)) ??
          menu.find((m) => !used.has(m.index))!;
        used.add(next.index);
        return next;
      };
      const selected = [
        take(mult.kind),
        take(missing.kind),
        take(twice.kind),
        take(mult.kind),
        take(missing.kind),
        take(twice.kind),
      ];
      const companion = space ? 'BB-8' : 'Dina';
      const templates = (m: MenuItem) =>
        m.kind === 'groups'
          ? 'Dere trenger {{groups}} felt med {{each}} i hvert. Hvor mange trengs til sammen?'
          : m.kind === 'missing'
            ? 'Dere har {{total}}. {{known}} blir igjen. Hvor mange kan dere ta med?'
            : m.mode === 'doble'
              ? 'Dere har {{amount}}. Dere trenger dobbelt så mange. Hvor mange trengs?'
              : 'Dere har {{amount}}. Dere bruker halvparten. Hvor mange tar dere med?';
      const scenes = space
        ? [
            [
              'Vrakets hemmelighet',
              'BB-8 har funnet et skadet skip med en melding fra Leia. Vingene må repareres før meldingen kan leses.',
              'base',
              'repair',
              'repair',
              'part',
              'starship',
              'reservedeler',
              'vinger',
              'En navigasjonsbrikke',
            ],
            [
              'Jawaenes kart',
              'Den reparerte senderen peker mot markedet. Jawaene tilbyr et kart som kan vise hvor den savnede droiden er.',
              'desert',
              'trade',
              'trade',
              'coin',
              'market',
              'kreditter',
              'myntposer',
              'Et ørkenkart',
            ],
            [
              'Spor i sanden',
              'Kartet viser to stier til droidens skjulested. Dere må finne hvor mye energi dere kan ta med.',
              'desert',
              'route',
              'travel',
              'energy',
              'map',
              'energiceller',
              'forsyninger',
              '',
            ],
            [
              'Portens paneler',
              'Sporet fører til en skjult port. BB-8 undersøker panelene som må få strøm.',
              'cave',
              'distribute',
              'open',
              'energy',
              'gate',
              'energiceller',
              'paneler',
              'En reddet droide',
            ],
            [
              'Meldingen til Leia',
              'Droiden har sett en ukjent sender. Nå må dere gjøre deres egen antenne klar og varsle Leia.',
              'base',
              'signal',
              'signal',
              'signal',
              'sender',
              'signalbrikker',
              'senderfelt',
              'Et signal fra fjellet',
            ],
            [
              'Skjoldet over basen',
              'Leia svarer. Basen må beskyttes mens dere undersøker signalet fra fjellet.',
              'base',
              'load',
              'shield',
              'energy',
              'storage',
              'energiceller',
              'skjoldfelt',
              '',
            ],
          ]
        : [
            [
              'Spor etter uværet',
              'Dina finner fotspor ved den ødelagte broen. Dere må gjøre materialene klare for å hjelpe flokken.',
              'river',
              'distribute',
              'build',
              'plank',
              'bridge',
              'planker',
              'brofelt',
              'En trygg bro',
            ],
            [
              'Mat fra skogen',
              'Broen er klar. Sporene fortsetter inn i skogen, der dere finner mat til letingen.',
              'forest',
              'load',
              'fill',
              'food',
              'storage',
              'bær',
              'matkurver',
              'En matkurv',
            ],
            [
              'Elvens to stier',
              'Med maten pakket følger dere sporene til en ny elv. Dere må velge en vei flokken kan klare.',
              'river',
              'route',
              'travel',
              'plank',
              'map',
              'planker',
              'materialer',
              '',
            ],
            [
              'Overgangen til redet',
              'Dina finner dinosaurungen ved bekken. Den trenger en trygg overgang til familien.',
              'river',
              'distribute',
              'build',
              'plank',
              'bridge',
              'planker',
              'brofelt',
              'En dinosaurvenn',
            ],
            [
              'Ungens mat',
              'Ungen har krysset overgangen. Den trenger mat før dere kan fortsette til redet.',
              'forest',
              'fill',
              'rescue',
              'food',
              'creature',
              'bær',
              'matkurver',
              'Spor til et nytt rede',
            ],
            [
              'Familien samles',
              'Familien kommer ned til elven. Dere gjør den siste maten klar og oppdager spor mot fjellet.',
              'forest',
              'load',
              'fill',
              'food',
              'storage',
              'bær',
              'redekurver',
              '',
            ],
          ];
      const previous = input.history.lastActualEvent;
      const missions: StoryMission[] = scenes.map((s, i) => ({
        id: `c${chapter}-m${i + 1}`,
        title: `${s[0]}${chapter > 1 ? ` · spor ${chapter}` : ''}`,
        itemIndex: selected[i].index,
        location: space
          ? s[2] === 'base'
            ? 'Motstandsbasens hangar'
            : s[2] === 'cave'
              ? 'Hulen ved fjellet'
              : 'Ørkenstien'
          : s[2] === 'river'
            ? 'Elven ved bregneskogen'
            : 'Bregneskogen',
        illustration: space
          ? s[2] === 'base'
            ? 'desert-hangar'
            : s[2] === 'cave'
              ? 'crystal-cavern'
              : 'none'
          : ['forest', 'river'].includes(s[2])
            ? 'prehistoric-river'
            : 'none',
        backdrop: s[2] as StoryMission['backdrop'],
        before:
          chapter > 1 && i === 0
            ? `${previous?.outcome ?? ''} ${companion} følger det nye sporet videre. Her trenger vennene deres hjelp.`
            : s[1],
        speaker: companion,
        dialogue: space
          ? 'Vi følger sporet sammen. Hjelp meg med dette!'
          : 'Vi skal finne flokken. Nå trenger jeg hjelpen din!',
        purpose: space
          ? 'Løs utfordringen, så kan dere følge droidens spor videre.'
          : 'Løs utfordringen, så blir veien til familien trygg.',
        questionTemplate: templates(selected[i]),
        clueTemplate: templates(selected[i]).split('. Hvor')[0],
        object: s[7],
        container: s[8],
        glyph: s[5] as StoryMission['glyph'],
        subject: s[6] as StoryMission['subject'],
        action: s[3] as StoryMission['action'],
        effect: i === 2 ? 'reveal' : (s[4] as StoryMission['effect']),
        expressionRequired: i === 0 && space,
        resourceEffect: i === 2 ? 'gather' : 'none',
        success: space
          ? [
              'Vingene er reparert. BB-8 leser meldingen fra Leia.',
              'Jawaene gir dere kartet. En sti er merket ved fjellet.',
              'Forsyningene er klare. Nå kan dere velge vei.',
              'Porten åpnes. Den savnede droiden ruller ut.',
              'Leia mottar meldingen og ber dere starte skjoldet.',
              'Skjoldet tennes. Et nytt signal blinker fra fjellet.',
            ][i]
          : [
              'Broen blir klar. Flokken kan følge sporene.',
              'Maten er pakket. Dere følger sporene til elven.',
              'Materialene er klare. Nå kan dere velge vei.',
              'Overgangen er klar. Ungen kommer til dere.',
              'Ungen får mat og følger Dina videre.',
              'Familien samles. Ungen viser nye spor mot fjellet.',
            ][i],
        retry: 'Se på mengdene vi har. Vi prøver sammen igjen.',
        follows: i ? [`c${chapter}-m${i}`] : previous ? [previous.id] : [],
        gains: s[9] ? [s[9]] : [],
        uses: [],
        consumes: [],
      }));
      const q = selected[2].quantities;
      const budget =
        selected[2].kind === 'groups'
          ? q.groups * q.each
          : selected[2].mode === 'doble'
            ? q.amount * 2
            : q.amount / 2;
      const plan: StoryChapter = {
        title: space
          ? `Droidens skjulte signal · del ${chapter}`
          : `Sporene etter uværet · del ${chapter}`,
        arcTitle:
          input.history.arcTitle ||
          (space ? 'Signalet bak fjellet' : 'Flokkens nye hjem'),
        arcGoal:
          input.history.arcGoal ||
          (space
            ? 'Finn droiden og hjelp Leia med det ukjente signalet.'
            : 'Hjelp flokken til et trygt hjem.'),
        opening: missions[0].before,
        goal: space
          ? 'Finn ut hvor signalet kommer fra.'
          : 'Følg sporene til dinosaurfamilien.',
        hook: space
          ? 'Et nytt signal blinker fra fjellet.'
          : 'Ungen viser nye spor mot fjellet.',
        continuity: previous?.outcome ?? 'Eventyret begynner med et nytt spor.',
        cast: [
          {
            name: companion,
            role: space ? 'Poes navigasjonsdroide' : 'Veiviser i bregneskogen',
            appearance: space ? 'round-droid' : 'dinosaur',
          },
          ...(space
            ? [
                {
                  name: 'Poe',
                  role: 'Pilot i motstanden',
                  appearance: 'pilot' as const,
                },
              ]
            : []),
        ],
        missions,
        decision: {
          afterMission: missions[2].id,
          payoffMission: missions[4].id,
          prompt: 'Hvilken vei vil du følge med forsyningene vi har?',
          resource: missions[2].object,
          options: [
            {
              label: space
                ? 'Følg BB-8 gjennom vraket'
                : 'Følg stien langs elven',
              cost: Math.max(1, Math.floor(budget / 2)),
              assetName: space
                ? 'Jawaenes adgangsbrikke'
                : 'Et fossil fra elven',
              consequence: space
                ? 'BB-8 finner en adgangsbrikke til senderrommet.'
                : 'Dina finner et fossil som viser en gammel sti.',
              laterScene: space
                ? 'Adgangsbrikken fra vraket viser hvor antennen kan kobles til. BB-8 gjør senderen klar.'
                : 'Fossilet viser hvor maten til ungen ligger. Dina gjør maten klar.',
              laterSuccess: space
                ? 'Senderen starter ved hjelp av brikken. Leia mottar meldingen.'
                : 'Fossilets spor fører dere til maten. Ungen følger Dina.',
            },
            {
              label: space ? 'Følg Poes rute' : 'Følg stien i skogen',
              cost: Math.max(1, budget),
              assetName: space ? 'Poes radiosender' : 'Dinas fløyte',
              consequence: space
                ? 'Poe gir dere en radiosender som kan nå Leia.'
                : 'Dina finner en fløyte som kan kalle på familien.',
              laterScene: space
                ? 'Poes radiosender passer til antennen. BB-8 gjør kontakten klar.'
                : 'Fløyten kaller ungen til maten. Dina gjør porsjonen klar.',
              laterSuccess: space
                ? 'Poes sender får kontakt med Leia. Hun ber dere starte skjoldet.'
                : 'Ungen hører fløyten og spiser maten sammen med Dina.',
            },
          ],
        },
      };
      return { calls: [], value: plan };
    },
  };
}
