import { renderToFile } from '@react-pdf/renderer';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { registerPdfFonts, StudentPdf } from '../src/components/StudentPdf';
import { parseStudent } from '../src/lib/parse';
import { recommend } from '../src/lib/recommend';
import { EXAMPLES } from '../src/lib/options';
registerPdfFonts(resolve('public'));
await mkdir('tmp/pdfs', { recursive: true });
const profile = {
  ...parseStudent(EXAMPLES[0].text).profile,
  count: 20,
  name: 'José García '.repeat(7).trim().slice(0, 80),
};
for (const [label, note] of [
  [
    'long',
    'Consider cost, fit, learning style, and personal priorities with your family. '
      .repeat(8)
      .slice(0, 600),
  ],
  ['unbroken', 'A'.repeat(600)],
]) {
  await renderToFile(
    <StudentPdf
      profile={profile}
      items={recommend(profile).items}
      note={note}
      logoSrc={resolve('public/brand/nerdapply-logo.png')}
    />,
    `tmp/pdfs/stress-${label}.pdf`,
  );
}
