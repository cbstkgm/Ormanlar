import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: './', // GitHub Pages için relative path
  plugins: [
    tailwindcss(),
  ],
});
