import { readFileSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';
const dir = new URL('../dist/ngx-signal-scroll/', import.meta.url);
const pkg = JSON.parse(readFileSync(new URL('package.json', dir), 'utf8'));
assert.equal(pkg.name, '@devzwo/ngx-magic-scroll');
assert.ok(!pkg.private, 'Built package must be public');
assert.equal(pkg.publishConfig.access, 'public');
assert.ok(pkg.exports?.['.']?.types, 'Missing public type declarations');
for (const file of ['README.md', 'LICENSE', pkg.exports['.'].types]) {
  assert.ok(existsSync(new URL(file, dir)), `Missing package file: ${file}`);
}
const declarations = readFileSync(new URL(pkg.exports['.'].types, dir), 'utf8');
assert.ok(
  !/export\s*\{[^}]*\b(?:effectIf|effectSkipFirstIf)\b/.test(declarations),
  'Internal effect helpers must not appear in the public declarations',
);
if (process.env.RELEASE_TAG) {
  assert.equal(
    process.env.RELEASE_TAG,
    `v${pkg.version}`,
    'Release tag must match library version',
  );
}
console.log(`Package verified: ${pkg.name}@${pkg.version}`);
