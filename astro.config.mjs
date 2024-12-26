import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  outDir: 'dist.tmp',
  site: 'https://approximately.competent.services/',
  trailingSlash: 'always',
});
