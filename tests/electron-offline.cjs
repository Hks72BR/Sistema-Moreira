const path = require('node:path');
const { app, BrowserWindow, session } = require('electron');
const { buildSync } = require('esbuild');

if (!process.env.OFFLINE_TEST_PROFILE) throw new Error('OFFLINE_TEST_PROFILE must be an isolated temporary directory.');
process.env.MOREIRA_OFFLINE_DEMO = '1';
require('../electron/main.js');
app.setPath('userData', process.env.OFFLINE_TEST_PROFILE);

const root = path.resolve(__dirname, '..');
const bundle = buildSync({
  entryPoints: [path.join(__dirname, 'offline-scenarios.js')],
  bundle: true, write: false, format: 'iife', globalName: 'offlineTests',
  define: {
    'import.meta.env': JSON.stringify({ DEV: false, PROD: true, MODE: 'offline' }),
  },
  alias: Object.fromEntries(['app', 'auth', 'firestore'].map(name => [
    `firebase/${name}`, path.join(root, 'src', 'offline', `${name}.js`),
  ])),
}).outputFiles[0].text;

app.whenReady().then(async () => {
  const timeout = setTimeout(() => {
    console.error('Offline demo tests timed out.');
    app.exit(1);
  }, 60000);
  try {
    session.defaultSession.enableNetworkEmulation({ offline: true });
    const window = BrowserWindow.getAllWindows()[0];
    window.webContents.on('console-message', details => {
      if (details.level === 'error') console.error('Renderer:', details.message);
    });
    if (window.webContents.isLoading()) {
      await new Promise(resolve => window.webContents.once('did-finish-load', resolve));
    }
    const phase = process.env.OFFLINE_TEST_PHASE || 'seed';
    const ui = await window.webContents.executeJavaScript(`(async () => {
      const waitFor = async condition => {
        for (let attempt = 0; attempt < 100; attempt++) {
          if (condition()) return;
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        throw new Error('Desktop UI did not become ready.');
      };
      if (${JSON.stringify(phase)} === 'seed') {
        await waitFor(() => document.querySelector('input[type="password"]'));
        const inputs = document.querySelectorAll('form input');
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        for (const [index, value] of ['admin@moreira.test', 'MoreiraDev123!'].entries()) {
          setter.call(inputs[index], value);
          inputs[index].dispatchEvent(new Event('input', { bubbles: true }));
        }
        document.querySelector('button[type="submit"]').click();
      }
      await waitFor(() => document.querySelector('h2')?.textContent === 'Dashboard');
      if (!document.body.textContent.includes('Demonstracao offline')) throw new Error('Offline banner missing.');
      await waitFor(() => {
        const logo = document.querySelector('.brand-logo');
        return Boolean(logo?.complete && logo.naturalWidth);
      });
      return 'login screen, React authentication, dashboard and bundled logo work with network disabled';
    })().then(result => ({ result })).catch(error => ({ error: error.stack }));`);
    if (ui.error) throw new Error(ui.error);
    console.log(`PASS: ${ui.result}`);
    const outcome = await window.webContents.executeJavaScript(
      `${bundle}\nofflineTests.run(${JSON.stringify(phase)}).then(results => ({ results })).catch(error => ({ error: error.stack }));`,
    );
    if (outcome.error) throw new Error(outcome.error);
    const results = outcome.results;
    results.forEach(result => console.log(`PASS: ${result}`));
    console.log(`PASS: actual Electron offline scheme ${window.webContents.getURL()}`);
    clearTimeout(timeout);
    app.exit(0);
  } catch (error) {
    clearTimeout(timeout);
    console.error(error);
    app.exit(1);
  }
});
