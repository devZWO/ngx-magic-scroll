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
          items: [{ autogenerate: { directory: 'recipes' } }],
        },
        { label: 'API', items: [{ autogenerate: { directory: 'api' } }] },
        { label: 'Maintainers', slug: 'maintainers' },
      ],
    }),
  ],
});
