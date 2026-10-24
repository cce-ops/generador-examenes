import { defineConfig } from 'astro/config';
export default defineConfig({
  output: 'static',
  site: 'https://cce-ops.github.io/generador-examenes-ingenieria',
  base: process.env.BASE_PATH || '/',
});
