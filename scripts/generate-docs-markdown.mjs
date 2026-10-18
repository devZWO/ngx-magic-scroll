import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const docsDistDir = resolve(root, 'docs/dist');
const docsSrcDir = resolve(root, 'docs/src/content/docs');

if (!existsSync(docsDistDir)) {
  mkdirSync(docsDistDir, { recursive: true });
}

const packageJson = JSON.parse(
  readFileSync(resolve(root, 'projects/ngx-magic-scroll/package.json'), 'utf8'),
);
console.log(
  `Generating Markdown endpoints and llms.txt for @devzwo/ngx-magic-scroll v${packageJson.version}...`,
);

// Generate llms.txt
const llmsContent = `# @devzwo/ngx-magic-scroll (v${packageJson.version})

> Angular signal utilities for anchor scrolling, URL synchronization, and layout-preserving position restoration.

## Documentation Entry Points

- [Agent Guide](/ngx-magic-scroll/ai/usage.md): Concise integration rules, recipes decision guide, and upgrade instructions.
- [Getting Started](/ngx-magic-scroll/getting-started.md): Installation, quick start, and basic setup.
- [Changelog](/ngx-magic-scroll/CHANGELOG.md): Release notes, breaking changes, and deprecation notices.
- [Migration Guides](/ngx-magic-scroll/migrations/v1.0-to-v1.1.md): Step-by-step upgrade instructions and before/after code examples.

## Concepts

- [Anchors & Selection](/ngx-magic-scroll/concepts/anchors.md): Implicit ID scanning vs explicit [scrollAnchor].
- [Data Readiness & Restoration](/ngx-magic-scroll/concepts/data-readiness-and-restoration.md): Asynchronous data handling with signals and resources.
- [Position Preservation](/ngx-magic-scroll/concepts/position-preservation.md): Preserving scroll position during layout reflows and dynamic content.
- [URL State & Navigation](/ngx-magic-scroll/concepts/url-state-and-navigation.md): Fragment synchronization and browser history coordination.

## Recipes

- [Scroll to Anchor](/ngx-magic-scroll/recipes/scroll-to-anchor.md): Programmatic scrolling with focus management.
- [Return to List](/ngx-magic-scroll/recipes/return-to-list.md): Restoring scroll state when returning to paginated or dynamic views.
- [rxResource Integration](/ngx-magic-scroll/recipes/rx-resource.md): Binding Angular 22 experimental rxResource.
- [NgRx Signal Store](/ngx-magic-scroll/recipes/ngrx-signal-store.md): Integration with @ngrx/signals state.
- [TanStack Query](/ngx-magic-scroll/recipes/tanstack-query.md): Binding TanStack Angular Query experimental resources.
- [Sticky Master-Detail](/ngx-magic-scroll/recipes/sticky-master-detail.md): Dynamic header measurement and split scrolling.
- [Material Drawer](/ngx-magic-scroll/recipes/material-drawer.md): Integration with Angular Material drawer containers.
- [Paginated Lists](/ngx-magic-scroll/recipes/paginated-lists.md): Managing scroll restoration with appended pages.

## API Reference

- [MagicScrollDirective](/ngx-magic-scroll/api/classes/magicscrolldirective.md): Main scroll directive facade.
- [ScrollAnchorDirective](/ngx-magic-scroll/api/classes/scrollanchordirective.md): Explicit anchor directive.
- [provideMagicScroll](/ngx-magic-scroll/api/functions/providemagicscroll.md): Root and region configuration provider.
- [MagicScrollOptions](/ngx-magic-scroll/api/interfaces/magicscrolloptions.md): Configuration options contract.
- [MagicScrollToOptions](/ngx-magic-scroll/api/type-aliases/magicscrolltooptions.md): Programmatic scroll options contract.
- [ScrollSource](/ngx-magic-scroll/api/type-aliases/scrollsource.md): Bound data sources.
- [ScrollResource](/ngx-magic-scroll/api/interfaces/scrollresource.md): Resource contract.
- [ScrollDataSource](/ngx-magic-scroll/api/interfaces/scrolldatasource.md): State data source contract.
- [AnchorSelectionMode](/ngx-magic-scroll/api/type-aliases/anchorselectionmode.md): Selection mode enum.
- [Readme](/ngx-magic-scroll/api/readme.md): API reference readme.
`;

writeFileSync(resolve(docsDistDir, 'llms.txt'), llmsContent, 'utf8');
console.log('  ✓ Generated llms.txt');

// Copy CHANGELOG.md to docs/dist/CHANGELOG.md
if (existsSync(resolve(root, 'CHANGELOG.md'))) {
  const changelog = readFileSync(resolve(root, 'CHANGELOG.md'), 'utf8');
  writeFileSync(resolve(docsDistDir, 'CHANGELOG.md'), changelog, 'utf8');
  console.log('  ✓ Exported CHANGELOG.md');
}

// Function to recursively scan directories
function scanDirectory(dir) {
  const results = [];
  if (!existsSync(dir)) return results;
  const list = readdirSync(dir);
  for (const file of list) {
    const fullPath = join(dir, file);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...scanDirectory(fullPath));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

// Export all Markdown documents from docs/src/content/docs/
const allContentFiles = scanDirectory(docsSrcDir);
let exportedCount = 0;

for (const filePath of allContentFiles) {
  const relPath = relative(docsSrcDir, filePath);
  if (filePath.endsWith('.md')) {
    const dest = resolve(docsDistDir, relPath);
    mkdirSync(dirname(dest), { recursive: true });
    const content = readFileSync(filePath, 'utf8');
    writeFileSync(dest, content, 'utf8');
    exportedCount++;

    // If filename has uppercase characters, also create lowercase alias for URL routing compatibility
    const lowerRelPath = relPath.toLowerCase();
    if (lowerRelPath !== relPath) {
      const lowerDest = resolve(docsDistDir, lowerRelPath);
      mkdirSync(dirname(lowerDest), { recursive: true });
      writeFileSync(lowerDest, content, 'utf8');
      exportedCount++;
    }
  } else if (filePath.endsWith('.mdx')) {
    const destRel = relPath.replace(/\.mdx$/, '.md');
    const dest = resolve(docsDistDir, destRel);
    mkdirSync(dirname(dest), { recursive: true });
    let content = readFileSync(filePath, 'utf8');
    // Strip Astro JSX components like <CardGrid>, <Card ...>, </CardGrid>
    content = content
      .replace(/import\s+[^;]+;\s*\n/g, '')
      .replace(/<CardGrid[^>]*>/g, '')
      .replace(/<\/CardGrid>/g, '')
      .replace(/<Card\s+title="([^"]+)"[^>]*>/g, '### $1\n')
      .replace(/<\/Card>/g, '');
    writeFileSync(dest, content, 'utf8');
    exportedCount++;

    const lowerRelPath = destRel.toLowerCase();
    if (lowerRelPath !== destRel) {
      const lowerDest = resolve(docsDistDir, lowerRelPath);
      mkdirSync(dirname(lowerDest), { recursive: true });
      writeFileSync(lowerDest, content, 'utf8');
      exportedCount++;
    }
  }
}

console.log(`Markdown export complete (${exportedCount} markdown endpoints created).`);
