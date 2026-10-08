---
title: Getting started
---

## Local development

Use Node.js 24 and pnpm 12.4.2 (the version pinned in the root `package.json`).

```sh
pnpm install --frozen-lockfile
pnpm lib:build
pnpm start
```

The demo runs on `http://localhost:4200`. Start these docs with `pnpm docs:dev`.

## Package installation

The intended npm package is `@devzwo/ngx-magic-scroll`; it has not yet been published from this repository. After the first release:

```sh
pnpm add @devzwo/ngx-magic-scroll
```

The current source uses Angular 22.2, RxJS, ngxtension, TanStack Angular Query, and Angular signal generators. These integrations are currently peer dependencies; inspect the library's `package.json` for their supported ranges. This dependency surface may change before a stable release.

## Public imports

```ts
import { ScrollService, linkedRouteFragment } from '@devzwo/ngx-magic-scroll';
```

`ScrollService` is provided in root. `NearestAnchorProvider` must be registered explicitly in your application or component providers. Router helpers require Angular Router providers and an injection context.
