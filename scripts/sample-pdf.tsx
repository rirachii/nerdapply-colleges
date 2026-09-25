import { renderToFile } from '@react-pdf/renderer';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { registerPdfFonts, StudentPdf } from '../src/components/StudentPdf';
import { parseStudent } from '../src/lib/parse';
import { recommend } from '../src/lib/recommend';
import { EXAMPLES } from '../src/lib/options';
registerPdfFonts(resolve('public'));
await mkdir('output/pdf', { recursive: true });
for (const [i, example] of EXAMPLES.slice(0, 2).entries()) {
  const { profile } = parseStudent(example.text);
  const result = recommend(profile);
  console.log(
    example.label,
    profile,
    result.items.map((r) => ({ name: r.college.name, band: r.band, score: r.score })),
  );
  const filename = `output/pdf/${i === 0 ? 'john-smith' : 'marine-biology'}-college-guide.pdf`;
  await renderToFile(
    <StudentPdf
      logoSrc={resolve('public/brand/nerdapply-logo.png')}
      profile={profile}
      items={result.items}
      note="Let’s choose two colleges to explore this week. Bring your questions and net price estimates to our next meeting."
    />,
    filename,
  );
  console.log(filename);
}
