import { fileURLToPath } from 'node:url';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig, mergeConfig } from 'vite';
import baseConfig from './vite.config.js';

const localModule = name => fileURLToPath(new URL(`./src/offline/${name}.js`, import.meta.url));

export default mergeConfig(baseConfig, defineConfig({
  resolve: {
    alias: [
      { find: /^firebase\/app$/, replacement: localModule('app') },
      { find: /^firebase\/auth$/, replacement: localModule('auth') },
      { find: /^firebase\/firestore$/, replacement: localModule('firestore') },
    ],
  },
  plugins: [{
    name: 'offline-demo-assets',
    transformIndexHtml(html) {
      return html
        .replace(/<link[^>]*(?:fonts\.googleapis\.com|fonts\.gstatic\.com|rel="manifest")[^>]*>/g, '')
        .replace('<title>Moreira Direções - Sistema de Gestão</title>', '<title>Moreira - Demonstracao Offline</title>');
    },
    generateBundle() {
      const publicDirectory = fileURLToPath(new URL('./public', import.meta.url));
      const files = ['logo.png', 'mechanic-bg.mp4', 'icon.ico',
        ...readdirSync(join(publicDirectory, 'icons')).map(name => `icons/${name}`)];
      for (const file of files) {
        this.emitFile({ type: 'asset', fileName: file, source: readFileSync(join(publicDirectory, file)) });
      }
    },
  }],
  build: {
    outDir: 'dist-offline',
    copyPublicDir: false,
  },
}));
