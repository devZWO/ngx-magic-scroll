import { readFileSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
const dir = new URL('../dist/ngx-signal-scroll/', import.meta.url);
const pkg = JSON.parse(readFileSync(new URL('package.json', dir), 'utf8'));
assert.equal(pkg.name, '@devzwo/ngx-magic-scroll');
assert.ok(!pkg.private, 'Built package must be public');
assert.equal(pkg.publishConfig.access, 'public');
assert.ok(pkg.exports?.['.']?.types, 'Missing public type declarations');
for (const file of ['README.md', 'LICENSE', 'THIRD_PARTY_NOTICES.txt', pkg.exports['.'].types]) {
  assert.ok(existsSync(new URL(file, dir)), `Missing package file: ${file}`);
}
assert.ok(!pkg.peerDependencies?.ngxtension, 'ngxtension must not be required by consumers');
const notices = readFileSync(new URL('THIRD_PARTY_NOTICES.txt', dir), 'utf8');
assert.ok(notices.includes('Copyright (c) 2023 Chau Tran'), 'Missing upstream copyright');
assert.ok(notices.includes('Permission is hereby granted'), 'Missing upstream permission notice');
assert.ok(notices.includes('THE SOFTWARE IS PROVIDED'), 'Missing upstream disclaimer');
const bundle = readFileSync(new URL(pkg.module, dir), 'utf8');
assert.ok(bundle.includes('Copyright (c) 2023 Chau Tran'), 'Missing bundled upstream copyright');
assert.ok(bundle.includes('THE SOFTWARE IS PROVIDED'), 'Missing bundled upstream license');
assert.ok(!/from ["']ngxtension/.test(bundle), 'Built package must not import ngxtension');
const typesPath = fileURLToPath(new URL(pkg.exports['.'].types, dir));
const program = ts.createProgram([typesPath], { noEmit: true, skipLibCheck: true });
const checker = program.getTypeChecker();
const moduleSymbol = checker.getSymbolAtLocation(program.getSourceFile(typesPath));
assert.ok(moduleSymbol, 'Built declarations must expose a module');
const exportedNames = checker
  .getExportsOfModule(moduleSymbol)
  .map((symbol) => symbol.name)
  .sort();
assert.deepEqual(
  exportedNames,
  [
    'MagicScrollDirective',
    'MagicScrollOptions',
    'MagicScrollToOptions',
    'ScrollAnchorDirective',
    'ScrollDataSource',
    'ScrollResource',
    'ScrollSource',
    'provideMagicScroll',
  ].sort(),
  'Public declarations must expose only the facade and its consumer-facing types',
);
if (process.env.RELEASE_TAG) {
  assert.equal(
    process.env.RELEASE_TAG,
    `v${pkg.version}`,
    'Release tag must match library version',
  );
}
console.log(`Package verified: ${pkg.name}@${pkg.version}`);
