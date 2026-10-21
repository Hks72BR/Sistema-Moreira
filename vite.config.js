import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const BUILD_ID = `${Date.now()}`;

function autoUpdateVersionPlugin() {
  let outDir = 'dist';
  return {
    name: 'auto-update-version',
    configResolved(config) {
      outDir = config.build.outDir || 'dist';
    },
    closeBundle() {
      try {
        const targetDir = resolve(process.cwd(), outDir);
        if (!existsSync(targetDir)) return;

        // 1. Gravar version.json com o ID único deste build
        const versionFile = resolve(targetDir, 'version.json');
        writeFileSync(
          versionFile,
          JSON.stringify({ buildId: BUILD_ID, builtAt: new Date().toISOString() }, null, 2),
          'utf-8'
        );

        // 2. Atualizar automaticamente o CACHE_NAME dentro do dist/sw.js gerado
        const swFile = resolve(targetDir, 'sw.js');
        if (existsSync(swFile)) {
          const swContent = readFileSync(swFile, 'utf-8');
          const updatedSw = swContent.replace(
            /const CACHE_NAME = ['"][^'"]+['"];/,
            `const CACHE_NAME = 'moreira-${BUILD_ID}';`
          );
          writeFileSync(swFile, updatedSw, 'utf-8');
        }
      } catch (err) {
        console.warn('Aviso ao gerar version.json para auto-update:', err);
      }
    },
  };
}

export default defineConfig({
  define: {
    __APP_BUILD_ID__: JSON.stringify(BUILD_ID),
  },
  plugins: [react(), autoUpdateVersionPlugin()],
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
