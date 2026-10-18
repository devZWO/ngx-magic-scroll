import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, posix, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const distDir = resolve(root, 'dist/ngx-magic-scroll');
const docsSrcDir = resolve(root, 'docs/src/content/docs');

if (!existsSync(distDir)) {
  console.error(`Dist directory ${distDir} does not exist. Run lib:build first.`);
  process.exit(1);
}

const packageJson = JSON.parse(
  readFileSync(resolve(root, 'projects/ngx-magic-scroll/package.json'), 'utf8'),
);
console.log(`Bundling documentation for @devzwo/ngx-magic-scroll v${packageJson.version}...`);

// Map of canonical doc identifiers (e.g. "recipes/scroll-to-anchor") to their package-relative paths
const canonicalToPkgPath = new Map();
canonicalToPkgPath.set('ai/usage', 'ai/usage.md');
canonicalToPkgPath.set('getting-started', 'docs/getting-started.md');
canonicalToPkgPath.set('changelog', 'CHANGELOG.md');

// Scan concepts
const conceptsDir = resolve(docsSrcDir, 'concepts');
if (existsSync(conceptsDir)) {
  for (const file of readdirSync(conceptsDir)) {
    if (file.endsWith('.md')) {
      const name = file.replace(/\.md$/, '');
      canonicalToPkgPath.set(`concepts/${name}`, `docs/concepts/${file}`);
    }
  }
}
canonicalToPkgPath.set('concepts', 'docs/concepts/anchors.md');

// Scan recipes
const recipesDir = resolve(docsSrcDir, 'recipes');
if (existsSync(recipesDir)) {
  for (const file of readdirSync(recipesDir)) {
    if (file.endsWith('.md')) {
      const name = file.replace(/\.md$/, '');
      canonicalToPkgPath.set(`recipes/${name}`, `docs/recipes/${file}`);
    }
  }
}
canonicalToPkgPath.set('recipes', 'docs/recipes/scroll-to-anchor.md');

// Scan migrations
const migrationsDir = resolve(docsSrcDir, 'migrations');
if (existsSync(migrationsDir)) {
  for (const file of readdirSync(migrationsDir)) {
    if (file.endsWith('.md')) {
      const name = file.replace(/\.md$/, '');
      canonicalToPkgPath.set(`migrations/${name}`, `docs/migrations/${file}`);
    }
  }
}

// Files to bundle: [sourcePath, packageRelativePath, routePath]
const filesToBundle = [];

if (existsSync(resolve(docsSrcDir, 'ai/usage.md'))) {
  filesToBundle.push([resolve(docsSrcDir, 'ai/usage.md'), 'ai/usage.md', 'ai/usage']);
}

if (existsSync(resolve(docsSrcDir, 'getting-started.md'))) {
  filesToBundle.push([
    resolve(docsSrcDir, 'getting-started.md'),
    'docs/getting-started.md',
    'getting-started',
  ]);
}

if (existsSync(conceptsDir)) {
  for (const file of readdirSync(conceptsDir)) {
    if (file.endsWith('.md')) {
      const name = file.replace(/\.md$/, '');
      filesToBundle.push([resolve(conceptsDir, file), `docs/concepts/${file}`, `concepts/${name}`]);
    }
  }
}

if (existsSync(recipesDir)) {
  for (const file of readdirSync(recipesDir)) {
    if (file.endsWith('.md')) {
      const name = file.replace(/\.md$/, '');
      filesToBundle.push([resolve(recipesDir, file), `docs/recipes/${file}`, `recipes/${name}`]);
    }
  }
}

if (existsSync(migrationsDir)) {
  for (const file of readdirSync(migrationsDir)) {
    if (file.endsWith('.md')) {
      const name = file.replace(/\.md$/, '');
      filesToBundle.push([
        resolve(migrationsDir, file),
        `docs/migrations/${file}`,
        `migrations/${name}`,
      ]);
    }
  }
}

if (existsSync(resolve(root, 'CHANGELOG.md'))) {
  filesToBundle.push([resolve(root, 'CHANGELOG.md'), 'CHANGELOG.md', 'changelog']);
}

function resolveInternalLink(href, currentPkgPath, currentRoute) {
  if (/^(https?:|mailto:|#)/.test(href)) {
    return href;
  }

  const [urlPart, fragment] = href.split('#');
  const fragSuffix = fragment ? `#${fragment}` : '';

  let clean = urlPart.trim();
  if (clean === '') {
    return href;
  }

  // Handle explicit project paths like "docs/src/content/docs/migrations/v1.0-to-v1.1.md"
  if (clean.includes('docs/src/content/docs/migrations/')) {
    const filename = clean.split('docs/src/content/docs/migrations/')[1];
    const targetPkgPath = `docs/migrations/${filename}`;
    const rel = relative(dirname(currentPkgPath), targetPkgPath);
    return (rel.startsWith('.') ? rel : `./${rel}`) + fragSuffix;
  }

  // Handle demo link
  if (clean.includes('/demo/') || clean.startsWith('demo')) {
    return `https://devzwo.github.io/ngx-magic-scroll/demo/${fragSuffix}`;
  }

  // Resolve candidates using Starlight route URL structure (e.g. "/recipes/scroll-to-anchor/")
  const resolvedRoute = posix.resolve(`/${currentRoute}/`, clean).replace(/^\/+/, '');
  const cleanRoute = resolvedRoute.replace(/\/+$/, '').replace(/\.(md|mdx)$/, '');

  if (cleanRoute.startsWith('api/') || cleanRoute === 'api') {
    return `https://devzwo.github.io/ngx-magic-scroll/${cleanRoute}/${fragSuffix}`;
  }

  if (cleanRoute.toLowerCase() === 'changelog') {
    const rel = relative(dirname(currentPkgPath), 'CHANGELOG.md');
    return (rel.startsWith('.') ? rel : `./${rel}`) + fragSuffix;
  }

  if (canonicalToPkgPath.has(cleanRoute)) {
    const targetPkgPath = canonicalToPkgPath.get(cleanRoute);
    const rel = relative(dirname(currentPkgPath), targetPkgPath);
    return (rel.startsWith('.') ? rel : `./${rel}`) + fragSuffix;
  }

  // Also try file-relative resolution (e.g. from "/recipes/" directory)
  const fileResolved = posix.resolve(`/${dirname(currentRoute)}/`, clean).replace(/^\/+/, '');
  const cleanFileRoute = fileResolved.replace(/\/+$/, '').replace(/\.(md|mdx)$/, '');

  if (cleanFileRoute.startsWith('api/') || cleanFileRoute === 'api') {
    return `https://devzwo.github.io/ngx-magic-scroll/${cleanFileRoute}/${fragSuffix}`;
  }

  if (cleanFileRoute.toLowerCase() === 'changelog') {
    const rel = relative(dirname(currentPkgPath), 'CHANGELOG.md');
    return (rel.startsWith('.') ? rel : `./${rel}`) + fragSuffix;
  }

  if (canonicalToPkgPath.has(cleanFileRoute)) {
    const targetPkgPath = canonicalToPkgPath.get(cleanFileRoute);
    const rel = relative(dirname(currentPkgPath), targetPkgPath);
    return (rel.startsWith('.') ? rel : `./${rel}`) + fragSuffix;
  }

  return href;
}

function rewriteMarkdownLinks(content, currentPkgPath, currentRoute) {
  return content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, href) => {
    const newHref = resolveInternalLink(href, currentPkgPath, currentRoute);
    return `[${text}](${newHref})`;
  });
}

for (const [srcPath, pkgPath, routePath] of filesToBundle) {
  const destPath = resolve(distDir, pkgPath);
  mkdirSync(dirname(destPath), { recursive: true });
  const original = readFileSync(srcPath, 'utf8');
  const rewritten = rewriteMarkdownLinks(original, pkgPath, routePath);
  writeFileSync(destPath, rewritten, 'utf8');
  console.log(`  ✓ Bundled ${pkgPath}`);
}

console.log(`Documentation bundled successfully (${filesToBundle.length} files).`);
