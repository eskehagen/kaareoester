// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.kaareoester.dk',
  trailingSlash: 'ignore',
  integrations: [
    react(),
    sitemap({
      i18n: { defaultLocale: 'da', locales: { da: 'da-DK' } },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  image: {
    // Billeder fra CMS'et (Sanity) skal kunne optimeres af Astro.
    domains: ['cdn.sanity.io'],
    remotePatterns: [{ protocol: 'https' }],
  },
  markdown: {
    shikiConfig: { theme: 'github-light', wrap: true },
    smartypants: true,
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
});
