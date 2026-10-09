import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightTypeDoc from 'starlight-typedoc';

export default defineConfig({
  site: 'https://devzwo.github.io',
  base: '/ngx-magic-scroll',
  integrations: [
    starlight({
      title: 'ngx-magic-scroll',
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/devZWO/ngx-magic-scroll',
        },
      ],
      plugins: [
        starlightTypeDoc({
          entryPoints: ['../projects/ngx-signal-scroll/src/public-api.ts'],
          tsconfig: '../projects/ngx-signal-scroll/tsconfig.lib.json',
          typeDoc: { disableSources: true },
        }),
      ],
      sidebar: [
        { label: 'Overview', slug: 'index' },
        { label: 'Getting started', slug: 'getting-started' },
        {
          label: 'Concepts',
          items: [{ autogenerate: { directory: 'concepts' } }],
        },
        {
          label: 'Recipes',
          items: [
            {
              label: 'Navigation',
              items: [{ slug: 'recipes/scroll-to-anchor' }, { slug: 'recipes/return-to-list' }],
            },
            {
              label: 'Data sources',
              items: [
                { slug: 'recipes/rx-resource' },
                { slug: 'recipes/ngrx-signal-store' },
                { slug: 'recipes/tanstack-query' },
              ],
            },
            {
              label: 'Layouts and changing content',
              items: [
                { slug: 'recipes/sticky-master-detail' },
                { slug: 'recipes/material-drawer' },
                { slug: 'recipes/paginated-lists' },
              ],
            },
          ],
        },
        {
          label: 'API',
          items: [
            { label: 'readme', slug: 'api/readme' },
            {
              label: 'Directives',
              items: [{ autogenerate: { directory: 'api/classes' } }],
            },
            {
              label: 'Providers',
              items: [{ autogenerate: { directory: 'api/functions' } }],
            },
            {
              label: 'Options',
              items: [
                { slug: 'api/interfaces/magicscrolloptions' },
                { slug: 'api/type-aliases/magicscrolltooptions' },
              ],
            },
            {
              label: 'Data sources',
              items: [
                { slug: 'api/type-aliases/scrollsource' },
                { slug: 'api/interfaces/scrollresource' },
                { slug: 'api/interfaces/scrolldatasource' },
              ],
            },
          ],
        },
        { label: 'Maintainers', slug: 'maintainers' },
      ],
    }),
  ],
});
