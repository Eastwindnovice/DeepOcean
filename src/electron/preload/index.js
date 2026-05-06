const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onToggleAssistant: (callback) => {
    ipcRenderer.on('toggle-assistant', (event, isShow) => callback(isShow));
  },
  setIgnoreMouseEvents: (ignore, options) => {
    ipcRenderer.send('set-ignore-mouse-events', ignore, options);
  },
  hideWindow: () => {
    ipcRenderer.send('hide-window');
  }
});
