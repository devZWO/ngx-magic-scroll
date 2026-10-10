import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/**
 * Validates the TypeScript examples embedded in the recipe documentation.
 *
 * The script scans all Markdown files in `docs/src/content/docs/recipes` for
 * recipe check blocks in the following format:
 *
 * ```md
 * <!-- recipe-check: example-name.ts -->
 * ```ts
 * // Complete TypeScript example
 * ```
 *
 *
 * Each marked TypeScript block is extracted into a temporary file under
 * `tmp/recipe-check`. The script then generates a temporary `tsconfig.json`
 * that extends the workspace configuration and runs Angular's compiler (`ngc`)
 * against the extracted files.
 *
 * This ensures that documented recipe examples:
 *
 * - contain at least one complete, checkable TypeScript example per recipe file;
 * - use unique generated filenames;
 * - compile with the workspace TypeScript configuration;
 * - pass Angular template compilation;
 * - stay in sync with public API and framework changes.
 *
 * The temporary output directory is recreated on every run. No compiled output
 * is emitted because the generated `tsconfig.json` uses `noEmit: true`.
 *
 * The script fails if:
 *
 * - a recipe Markdown file has no marked TypeScript example;
 * - two examples use the same generated filename;
 * - TypeScript or Angular compilation fails;
 * - the Angular compiler process exits with a non-zero status.
 *
 * On success, it prints the number of checked recipe examples.
 *
 * Intended usage:
 *
 * ```sh
 * pnpm run recipes:check
 * ```
 *
 * The package script first builds the library and then runs this file, so the
 * recipe examples are checked against the current library build.
 */


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
