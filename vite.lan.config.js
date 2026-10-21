import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, mergeConfig } from 'vite';
import baseConfig from './vite.config.js';

const certificatesDirectory = resolve(process.cwd(), 'certs');

export default mergeConfig(
  baseConfig,
  defineConfig({
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      watch: {
        ignored: ['**/dist/**', '**/release/**'],
      },
      https: {
        key: readFileSync(resolve(certificatesDirectory, 'lan-key.pem')),
        cert: readFileSync(resolve(certificatesDirectory, 'lan.pem')),
      },
    },
  }),
);
