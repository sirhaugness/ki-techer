import { skills } from '../lib/engine/skills/graph';
import { curriculum, medallionParts } from '../lib/engine/skills/curriculum';
const quote = (value: string) => `'${value.replaceAll("'", "''")}'`;
export function curriculumSql(): string {
  const rows = skills.map(
    (s) =>
      `(${[quote(s.id), "'matte'", quote(s.title), quote(s.description), quote(`MAT01-06:${s.aim}`), quote(curriculum[s.aim].text), String(s.part ? 4 : 3), s.part === null ? 'null' : String(s.part), `array[${s.prerequisites.map(quote).join(',')}]::text[]`, quote(s.generatorKey), '5', String(s.order)].join(',')})`,
  );
  return `-- M2: versioned curriculum snapshot, no remote seeding required.\ninsert into public.subjects(id,title) values ('matte','Matematikk');\ninsert into public.medallion_parts(id,subject_id,grade,title,description,symbol,color) values\n${medallionParts.map((p) => `(${p.id},'matte',4,${[p.title, p.description, p.symbol, p.color].map(quote).join(',')})`).join(',\n')};\ninsert into public.skills(id,subject_id,title,description,lk20_aim_code,lk20_aim_text,grade,medallion_part,prerequisites,generator_key,difficulty_levels,order_index) values\n${rows.join(',\n')};\n`;
}
