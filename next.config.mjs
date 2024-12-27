// https://nextjs.org/docs/app/api-reference/config/next-config-js
// https://nextjs.org/docs/app/building-your-application/configuring/mdx

import createMDX from '@next/mdx';

export default (phase, { defaultConfig }) => {
  const nextConfig = {
    distDir: (phase === 'phase-development-server') ? 'dev.tmp' : 'build.tmp',
    output: 'export',
    pageExtensions: ['js', 'jsx', 'md', 'mdx'],
  };

  const withMDX = createMDX({});
  return withMDX(nextConfig);
}
