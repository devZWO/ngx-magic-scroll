import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const distPkgDir = resolve(root, 'dist/ngx-magic-scroll');
const docsDistDir = resolve(root, 'docs/dist');
const libPkgJsonPath = resolve(root, 'projects/ngx-magic-scroll/package.json');

console.log('Running documentation and package validation checks...');

// 1. Verify build directories exist
assert.ok(existsSync(distPkgDir), `Package dist directory does not exist: ${distPkgDir}`);
assert.ok(existsSync(docsDistDir), `Docs dist directory does not exist: ${docsDistDir}`);

const libPkgJson = JSON.parse(readFileSync(libPkgJsonPath, 'utf8'));
const version = libPkgJson.version;
console.log(`Validating package @devzwo/ngx-magic-scroll version v${version}...`);

// 2. Verify version consistency
const distPkgJson = JSON.parse(readFileSync(resolve(distPkgDir, 'package.json'), 'utf8'));
assert.equal(
  distPkgJson.version,
  version,
  `dist package.json version ${distPkgJson.version} != source ${version}`,
);

// Check llms.txt in docs/dist
const llmsPath = resolve(docsDistDir, 'llms.txt');
assert.ok(existsSync(llmsPath), `llms.txt is missing in ${docsDistDir}`);
const llmsContent = readFileSync(llmsPath, 'utf8');
assert.ok(
  llmsContent.includes(`@devzwo/ngx-magic-scroll (v${version})`),
  `llms.txt does not contain package version v${version}`,
);

// Check CHANGELOG.md version
const changelogPath = resolve(root, 'CHANGELOG.md');
assert.ok(existsSync(changelogPath), 'Root CHANGELOG.md is missing');
const changelogContent = readFileSync(changelogPath, 'utf8');
assert.ok(
  changelogContent.includes(`## Release v${version}`),
  `CHANGELOG.md does not contain section for ## Release v${version}`,
);

// 3. Verify npm package contents
const expectedPackageFiles = [
  'ai/usage.md',
  'docs/getting-started.md',
  'docs/concepts/anchors.md',
  'docs/concepts/data-readiness-and-restoration.md',
  'docs/concepts/position-preservation.md',
  'docs/concepts/url-state-and-navigation.md',
  'docs/recipes/material-drawer.md',
  'docs/recipes/ngrx-signal-store.md',
  'docs/recipes/paginated-lists.md',
  'docs/recipes/return-to-list.md',
  'docs/recipes/rx-resource.md',
  'docs/recipes/scroll-to-anchor.md',
  'docs/recipes/sticky-master-detail.md',
  'docs/recipes/tanstack-query.md',
  'docs/migrations/v0.0.1-rc.1-to-0.0.1-rc.2.md',
  'docs/migrations/v0.0.1-rc.2-to-1.0.0.md',
  'docs/migrations/v1.0-to-v1.1.md',
  'CHANGELOG.md',
  'README.md',
  'LICENSE',
  'THIRD_PARTY_NOTICES.txt',
  'package.json',
  'fesm2022/devzwo-ngx-magic-scroll.mjs',
  'types/devzwo-ngx-magic-scroll.d.ts',
];

for (const relPath of expectedPackageFiles) {
  const filePath = resolve(distPkgDir, relPath);
  assert.ok(existsSync(filePath), `Expected package file missing: ${relPath}`);
}

// Disallowed maintainer/internal docs in package
const disallowedPackageFiles = ['maintainers.md', 'docs/maintainers.md', '404.md', 'docs/404.md'];

for (const relPath of disallowedPackageFiles) {
  const filePath = resolve(distPkgDir, relPath);
  assert.ok(!existsSync(filePath), `Disallowed maintainer file bundled in package: ${relPath}`);
}
console.log(
  `  ✓ Package file bundle verified (${expectedPackageFiles.length} files present, maintainer docs excluded).`,
);

// 4. Verify local relative markdown links in dist/ngx-magic-scroll
function scanFiles(dir, filter) {
  const results = [];
  if (!existsSync(dir)) return results;
  for (const item of readdirSync(dir)) {
    const full = join(dir, item);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...scanFiles(full, filter));
    } else if (!filter || filter(full)) {
      results.push(full);
    }
  }
  return results;
}

const bundledMdFiles = scanFiles(distPkgDir, (f) => f.endsWith('.md'));
let checkedLinksCount = 0;

for (const mdFile of bundledMdFiles) {
  const content = readFileSync(mdFile, 'utf8');
  const links = [...content.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)];
  for (const [, , href] of links) {
    if (/^(https?:|mailto:|#)/.test(href)) {
      continue;
    }
    const cleanHref = href.split('#')[0].trim();
    if (!cleanHref) continue;

    const targetFile = resolve(dirname(mdFile), cleanHref);
    assert.ok(
      existsSync(targetFile),
      `Broken local relative link in ${relative(distPkgDir, mdFile)}: "${href}" (resolved to: ${targetFile})`,
    );
    checkedLinksCount++;
  }
}
console.log(
  `  ✓ Bundled local relative links verified (${checkedLinksCount} links resolved successfully).`,
);

// 5. Verify llms.txt target endpoints in docs/dist
const llmsLinks = [...llmsContent.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)];
let checkedLlmsLinksCount = 0;

for (const [, text, href] of llmsLinks) {
  assert.ok(
    href.startsWith('/ngx-magic-scroll/'),
    `Link in llms.txt must start with /ngx-magic-scroll/: "${href}" (${text})`,
  );
  const route = href.replace(/^\/ngx-magic-scroll\//, '').split('#')[0];
  const targetDistPath = resolve(docsDistDir, route);
  assert.ok(
    existsSync(targetDistPath),
    `Link in llms.txt targets non-existent file: "${href}" -> ${targetDistPath}`,
  );
  checkedLlmsLinksCount++;
}
console.log(
  `  ✓ llms.txt endpoints verified (${checkedLlmsLinksCount} endpoints exist in docs/dist).`,
);

console.log('All documentation and package validation checks passed successfully.');
