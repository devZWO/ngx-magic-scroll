import type { APIRoute } from 'astro';
import packageJson from '../../../projects/ngx-magic-scroll/package.json';

export const GET: APIRoute = () => {
  const content = `# @devzwo/ngx-magic-scroll (v${packageJson.version})

> Angular signal utilities for anchor scrolling, URL synchronization, and layout-preserving position restoration.

## Documentation Entry Points

- [Agent Guide](/ngx-magic-scroll/ai/usage.md): Concise integration rules, recipes decision guide, and upgrade instructions.
- [Getting Started](/ngx-magic-scroll/getting-started.md): Installation, quick start, and basic setup.
- [Changelog](/ngx-magic-scroll/CHANGELOG.md): Release notes, breaking changes, and deprecation notices.

## Migration Guides

- [v1.0 to v1.1](/ngx-magic-scroll/migrations/v1.0-to-v1.1.md): Upgrade guide for v1.1.0 layout preservation and focus navigation.
- [v0.0.1-rc.2 to v1.0.0](/ngx-magic-scroll/migrations/v0.0.1-rc.2-to-1.0.0.md): Upgrade guide for v1.0.0 fragment routing and explicit anchors.
- [v0.0.1-rc.1 to v0.0.1-rc.2](/ngx-magic-scroll/migrations/v0.0.1-rc.1-to-0.0.1-rc.2.md): Upgrade guide for v0.0.1-rc.2 reading zones and interaction cancellation.

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

  return new Response(content, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
    },
  });
};
