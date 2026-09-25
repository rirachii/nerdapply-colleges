import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const root = resolve('.');
const build = join(root, 'dist');
const destination = join(root, 'output/vercel-site');
if (!existsSync(join(build, 'index.html'))) throw new Error('Run npm run build first.');
mkdirSync(destination, { recursive: true });
// Preserve only the local Vercel project link while replacing the previous public build.
for (const entry of readdirSync(destination)) {
  if (entry !== '.vercel') rmSync(join(destination, entry), { recursive: true, force: true });
}
cpSync(build, destination, { recursive: true });
writeFileSync(
  join(destination, 'vercel.json'),
  JSON.stringify(
    {
      version: 2,
      framework: null,
      buildCommand: '',
      outputDirectory: '.',
      headers: [
        {
          source: '/(.*)',
          headers: [
            { key: 'X-Content-Type-Options', value: 'nosniff' },
            { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          ],
        },
      ],
    },
    null,
    2,
  ) + '\n',
);
console.log(
  `Prepared static-only deployment at ${destination}. No source, notes, or environment files copied.`,
);
