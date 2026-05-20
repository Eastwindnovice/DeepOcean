const { app, BrowserWindow, globalShortcut, ipcMain } = require('electron');
const path = require('path');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  
  // 开发模式下打开 DevTools
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // 设置点击穿透（除了面板区域）
  mainWindow.setIgnoreMouseEvents(true, { forward: true });
}

function registerHotkeys() {
  // 注册 Ctrl+Alt+I 快捷键
  globalShortcut.register('CommandOrControl+Alt+I', () => {
    if (mainWindow) {
      // 始终确保窗口是显示的
      if (!mainWindow.isVisible()) {
        mainWindow.show();
      }
      
      // 直接发送切换信号给渲染进程，让渲染进程自己决定显示还是隐藏
      mainWindow.webContents.send('toggle-assistant');
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  registerHotkeys();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// IPC 处理
ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
  if (mainWindow) {
    mainWindow.setIgnoreMouseEvents(ignore, options);
  }
});

// 移除 hide-window 处理，不再隐藏窗口
// ipcMain.on('hide-window', () => {
//   if (mainWindow) {
//     mainWindow.hide();
//   }
// });
