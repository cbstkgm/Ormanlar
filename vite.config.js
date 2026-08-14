import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/Ormanlar/', // GitHub Pages için absolute repo path
  plugins: [
    tailwindcss(),
  ],
});
