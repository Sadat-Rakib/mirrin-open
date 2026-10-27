import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  base: './',
  assetsInlineLimit: 0,
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        buy: fileURLToPath(new URL('./buy.html', import.meta.url)),
      },
    },
  },
});
