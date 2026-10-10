import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const dir = new URL('../dist/ngx-magic-scroll/', import.meta.url);
const notices = readFileSync(new URL('THIRD_PARTY_NOTICES.txt', dir), 'utf8');
const license = notices.slice(notices.indexOf('MIT License\n'));
const banner = `/*!\n * @license\n${license
  .trimEnd()
  .split('\n')
  .map((line) => ` * ${line}`)
  .join('\n')}\n */\n`;
const bundles = new URL('fesm2022/', dir);
for (const file of readdirSync(bundles).filter((name) => name.endsWith('.mjs'))) {
  const path = new URL(file, bundles);
  const source = readFileSync(path, 'utf8');
  if (!source.startsWith(banner)) {
    writeFileSync(path, banner + source);
    // Preserve generated line positions in the source map after inserting the banner.
    const mapPath = new URL(`${file}.map`, bundles);
    const map = JSON.parse(readFileSync(mapPath, 'utf8'));
    map.mappings = ';'.repeat(banner.split('\n').length - 1) + map.mappings;
    writeFileSync(mapPath, JSON.stringify(map));
  }
}
