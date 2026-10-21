module.exports = {
  extends: null,
  appId: 'com.moreira.direcoes.offlinedemo',
  productName: 'Moreira Demonstracao Offline',
  directories: { output: 'release-offline' },
  extraMetadata: { offlineDemo: true },
  files: ['dist-offline/**/*', 'electron/**/*'],
  win: { target: 'nsis', icon: 'public/icon.ico' },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'Moreira Demonstracao Offline',
    artifactName: 'Moreira-Demo-Offline-Setup-${version}.exe',
  },
};
