// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import vue from '@astrojs/vue';
import vercel from '@astrojs/vercel';


// https://astro.build/config
export default defineConfig({
  integrations: [react(), vue()],
  adapter: vercel(),

  vite: {
    plugins: [tailwindcss()]
  }
});