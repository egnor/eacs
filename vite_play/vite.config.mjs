// https://vite.dev/config/
// https://mdxjs.com/docs/getting-started/#vite

import * as path from 'path';
import * as vite from 'vite';
import mdx from '@mdx-js/rollup';

export default vite.defineConfig({
  build: {
    outDir: 'dist.tmp',
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.mdx'),
      },
    },
  },
  plugins: [
    mdx({jsxImportSource: 'jsx-dom'}),
  ],
});
