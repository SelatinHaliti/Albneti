const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('albnetDesktop', {
  platform: process.platform,
  isDesktop: true,
  version: '1.0.0',
});
