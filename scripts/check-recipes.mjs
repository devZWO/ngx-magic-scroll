import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const recipes = resolve(root, 'docs/src/content/docs/recipes');
const output = resolve(root, 'tmp/recipe-check');
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
let count = 0;
for (const name of readdirSync(recipes).filter((name) => name.endsWith('.md'))) {
  const markdown = readFileSync(resolve(recipes, name), 'utf8');
  const blocks = [
    ...markdown.matchAll(/<!-- recipe-check: ([\w.-]+\.ts) -->\s*```ts\n([\s\S]*?)\n```/g),
  ];
  assert.ok(blocks.length, `${name}: mark at least one complete TypeScript example`);
  for (const [, filename, code] of blocks) {
    const target = resolve(output, filename);
    assert.ok(!readdirSync(output).includes(filename), `Duplicate recipe filename: ${filename}`);
    writeFileSync(target, `// Extracted from ${name}; edit the Markdown source.\n${code}\n`);
    count++;
  }
}
writeFileSync(
  resolve(output, 'tsconfig.json'),
  JSON.stringify(
    {
      extends: '../../tsconfig.json',
      compilerOptions: { outDir: './out', types: [], noEmit: true },
      files: [],
      references: [],
      include: ['*.ts'],
    },
    null,
    2,
  ),
);
const require = createRequire(import.meta.url);
const compilerPackage = require.resolve('@angular/compiler-cli/package.json');
const compiler = JSON.parse(readFileSync(compilerPackage, 'utf8'));
const result = spawnSync(
  process.execPath,
  [resolve(dirname(compilerPackage), compiler.bin.ngc), '-p', resolve(output, 'tsconfig.json')],
  { cwd: root, stdio: 'inherit' },
);
if (result.error) throw result.error;
assert.equal(result.status, 0, 'Recipe TypeScript or Angular template compilation failed');
console.log(`Checked ${count} recipe examples with strict TypeScript and Angular templates.`);
