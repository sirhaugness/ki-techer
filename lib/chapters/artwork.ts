/** Trusted, versioned illustrations. Model output selects IDs, never SVG/URLs. */
const svg = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">${body}</svg>`;
const prop = (body: string) =>
  svg(`<ellipse cx="60" cy="103" rx="36" ry="7" fill="#183b4930"/>${body}`);
export const artwork = {
  'harbor-sky': {
    role: 'background',
    description: 'Lun havn med øyer, brygge og rolig sjø.',
    svg: svg(
      '<rect width="120" height="120" fill="#c8e9e8"/><circle cx="93" cy="24" r="13" fill="#ffe1a3"/><path d="M0 65 25 35 59 67 91 43 120 70V120H0" fill="#6a9d83"/><path d="M0 78Q40 67 74 82T120 80V120H0" fill="#4a8eaa"/><path d="M0 92H48V101H0" fill="#cda276"/><path d="M32 93V113M44 94V113" stroke="#795a4a" stroke-width="4"/>',
    ),
  },
  'forest-sky': {
    role: 'background',
    description: 'Lys skog med en sti og grønne tretopper.',
    svg: svg(
      '<rect width="120" height="120" fill="#cbe3d1"/><circle cx="92" cy="25" r="14" fill="#ffe2a6"/><path d="M0 74Q40 54 120 75V120H0" fill="#80ac7e"/><path d="M54 120 69 68 82 68 85 120" fill="#e6cc97"/><path d="M20 78V40M101 88V46" stroke="#796248" stroke-width="6"/><circle cx="20" cy="38" r="25" fill="#467b68"/><circle cx="103" cy="46" r="24" fill="#548c72"/>',
    ),
  },
  'space-sky': {
    role: 'background',
    description: 'Stjerneklart rom med en rolig romstasjon og fjerne planeter.',
    svg: svg(
      '<rect width="120" height="120" fill="#253752"/><circle cx="92" cy="28" r="18" fill="#dba797"/><path d="M0 91Q58 64 120 94V120H0" fill="#668a9d"/><path d="M20 91V63L34 51 48 63V91" fill="#d4dedc"/><path d="M28 72H39V84H28" fill="#63b7bd"/><g fill="#fff0bb"><circle cx="16" cy="18" r="2"/><circle cx="55" cy="29" r="2"/><circle cx="69" cy="12" r="2"/><circle cx="108" cy="63" r="2"/></g>',
    ),
  },
  'workshop-sky': {
    role: 'background',
    description: 'Varmt verksted med arbeidsbenk og vindu.',
    svg: svg(
      '<rect width="120" height="120" fill="#e8d8bd"/><rect x="72" y="12" width="35" height="42" rx="4" fill="#a9d3d4"/><path d="M89 12V54M72 32H107" stroke="#fff1d1" stroke-width="4"/><rect x="8" y="80" width="104" height="12" rx="3" fill="#a87959"/><path d="M17 91V120M103 91V120" stroke="#795a4a" stroke-width="7"/>',
    ),
  },
  person: {
    role: 'character',
    description: 'Vennlig menneskefigur med blå jakke.',
    svg: prop(
      '<path d="M32 100V73Q60 52 88 73V100" fill="#477f99"/><circle cx="60" cy="40" r="25" fill="#e9b48e"/><path d="M35 38Q35 5 66 14 87 17 85 38L73 30 43 32" fill="#624e40"/><circle cx="51" cy="42" r="3" fill="#283d47"/><circle cx="69" cy="42" r="3" fill="#283d47"/><path d="M52 54Q60 61 68 54" fill="none" stroke="#995e4f" stroke-width="3"/>',
    ),
  },
  robot: {
    role: 'character',
    description: 'Liten vennlig rund robot med blå lys.',
    svg: prop(
      '<path d="M31 87V44Q60 8 89 44V87" fill="#e6e7dc" stroke="#597d91" stroke-width="5"/><rect x="43" y="51" width="34" height="22" rx="7" fill="#497b98"/><circle cx="52" cy="61" r="4" fill="#b7f4ec"/><circle cx="68" cy="61" r="4" fill="#b7f4ec"/><path d="M27 83V100M93 83V100" stroke="#597d91" stroke-width="10"/>',
    ),
  },
  animal: {
    role: 'character',
    description: 'Vennlig liten rev med spisse ører.',
    svg: prop(
      '<path d="M26 26 49 34 75 34 96 26 89 69 60 92 30 69Z" fill="#c99059"/><path d="M30 60 59 68 89 60 60 92Z" fill="#fff1d3"/><circle cx="45" cy="54" r="4" fill="#29414b"/><circle cx="76" cy="54" r="4" fill="#29414b"/><path d="m54 71 6 7 7-7" fill="#29414b"/>',
    ),
  },
  stone: {
    role: 'prop',
    description: 'En lysende blå stein.',
    svg: prop(
      '<path d="M23 72 40 33 77 26 99 62 79 92 38 91Z" fill="#68b9c7" stroke="#377c94" stroke-width="5"/><path d="M40 33 56 69 77 26M23 72 56 69 79 92" fill="none" stroke="#b5e4df" stroke-width="4"/>',
    ),
  },
  plank: {
    role: 'prop',
    description: 'En treplanke til bygging eller reparasjon.',
    svg: prop(
      '<path d="M16 45 94 27 104 68 26 88Z" fill="#d6aa73" stroke="#89674b" stroke-width="5"/><path d="m29 57 55-14M34 72l55-14" stroke="#b18455" stroke-width="4"/>',
    ),
  },
  letter: {
    role: 'prop',
    description: 'En lukket invitasjon eller et brev.',
    svg: prop(
      '<rect x="17" y="32" width="86" height="57" rx="7" fill="#fff0cd" stroke="#ae9070" stroke-width="4"/><path d="m20 35 40 30 40-30" fill="none" stroke="#ae9070" stroke-width="4"/>',
    ),
  },
  lantern: {
    role: 'prop',
    description: 'En lykt med et lysrom som kan fylles med lyssteiner.',
    svg: prop(
      '<path d="M43 27Q60 6 77 27" fill="none" stroke="#526b72" stroke-width="6"/><rect x="28" y="33" width="64" height="62" rx="9" fill="#ffe5a0" stroke="#526b72" stroke-width="6"/><path d="M25 31H95M25 96H95" stroke="#526b72" stroke-width="8"/>',
    ),
  },
  box: {
    role: 'prop',
    description: 'En trekasse som kan inneholde eller motta gjenstander.',
    svg: prop(
      '<path d="m18 39 42-16 43 16v48l-43 17-42-17Z" fill="#cfaa79" stroke="#896b4e" stroke-width="4"/><path d="m18 39 42 18 43-18M60 57v47" fill="none" stroke="#896b4e" stroke-width="4"/>',
    ),
  },
  beacon: {
    role: 'prop',
    description: 'En signalstolpe med et rundt lys på toppen.',
    svg: prop(
      '<path d="M54 55h12v47H54" fill="#6c8a94"/><circle cx="60" cy="36" r="23" fill="#ffc96c" stroke="#597887" stroke-width="5"/><path d="m23 12-9-9M98 13l9-9M13 37H2M107 37h11" stroke="#e7b968" stroke-width="5"/>',
    ),
  },
  rope: {
    role: 'prop',
    description: 'Ett sammenrullet tau.',
    svg: prop(
      '<ellipse cx="60" cy="60" rx="35" ry="24" fill="none" stroke="#b88f62" stroke-width="12"/><ellipse cx="60" cy="60" rx="18" ry="10" fill="none" stroke="#d9b987" stroke-width="7"/><path d="M89 74q18 9 12 27" fill="none" stroke="#b88f62" stroke-width="9"/>',
    ),
  },
} as const;
export type ArtworkId = keyof typeof artwork;
export function artworkUrl(id: string) {
  if (!(id in artwork)) throw Error('Ukjent illustrasjon.');
  return (
    'data:image/svg+xml;charset=utf-8,' +
    encodeURIComponent(artwork[id as ArtworkId].svg)
  );
}
export const artworkCatalog = Object.entries(artwork).map(([id, a]) => ({
  id,
  role: a.role,
  description: a.description,
}));
