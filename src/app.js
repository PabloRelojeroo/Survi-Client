/**
 * @author Pablo
 * Luuxis License v1.0 (voir fichier LICENSE pour les détails en FR/EN)
 */

const { app, ipcMain, nativeTheme } = require('electron');
const { Microsoft } = require('minecraft-java-core');
const { autoUpdater } = require('electron-updater')

const path = require('path');
const fs = require('fs');

const UpdateWindow = require("./assets/js/windows/updateWindow.js");
const MainWindow = require("./assets/js/windows/mainWindow.js");

let dev = process.env.NODE_ENV === 'dev';

if (dev) {
    let appPath = path.resolve('./data/Launcher').replace(/\\/g, '/');
    let appdata = path.resolve('./data').replace(/\\/g, '/');
    if (!fs.existsSync(appPath)) fs.mkdirSync(appPath, { recursive: true });
    if (!fs.existsSync(appdata)) fs.mkdirSync(appdata, { recursive: true });
    app.setPath('userData', appPath);
    app.setPath('appData', appdata)
}

if (!app.requestSingleInstanceLock()) app.quit();
else app.whenReady().then(() => {
    if (dev) return MainWindow.createWindow()
    UpdateWindow.createWindow()
});

ipcMain.on('main-window-open', () => MainWindow.createWindow())
ipcMain.on('main-window-dev-tools', () => {
    console.log('main-window-dev-tools event received');
    let win = MainWindow.getWindow();
    if (!win) {
        console.warn('main-window-dev-tools: main window not available, creating it...');
        MainWindow.createWindow();
        win = MainWindow.getWindow();
        if (!win) return console.warn('main-window-dev-tools: failed to create main window');
        try {
            win.webContents.once('did-finish-load', () => {
                try { 
                    console.log('Opening devtools after window load');
                    win.webContents.openDevTools({ mode: 'detach' }) 
                } catch (e) { 
                    console.error('Error opening devtools:', e) 
                }
            });
        } catch (e) { 
            console.error('Error setting up devtools listener:', e) 
        }
        return;
    }
    try { 
        console.log('Opening devtools directly');
        win.webContents.openDevTools({ mode: 'detach' }) 
    } catch (e) { 
        console.error('Error opening devtools:', e) 
    }
})
ipcMain.on('main-window-dev-tools-close', () => {
    const win = MainWindow.getWindow();
    if (!win) return console.warn('main-window-dev-tools-close: main window not available');
    try { win.webContents.closeDevTools() } catch (e) { console.warn(e) }
})
ipcMain.on('main-window-close', () => MainWindow.destroyWindow())
ipcMain.on('main-window-reload', () => {
    const win = MainWindow.getWindow();
    if (!win) return console.warn('main-window-reload: main window not available');
    try { win.reload() } catch (e) { console.warn(e) }
})
ipcMain.on('main-window-progress', (event, options) => {
    const win = MainWindow.getWindow();
    if (!win) return;
    try { win.setProgressBar(options.progress / options.size) } catch (e) { console.warn(e) }
})
ipcMain.on('main-window-progress-reset', () => {
    const win = MainWindow.getWindow();
    if (!win) return;
    try { win.setProgressBar(-1) } catch (e) { console.warn(e) }
})
ipcMain.on('main-window-progress-load', () => {
    const win = MainWindow.getWindow();
    if (!win) return;
    try { win.setProgressBar(2) } catch (e) { console.warn(e) }
})
ipcMain.on('main-window-minimize', () => {
    const win = MainWindow.getWindow();
    if (!win) return console.warn('main-window-minimize: main window not available');
    try { win.minimize() } catch (e) { console.warn(e) }
})

ipcMain.on('update-window-close', () => UpdateWindow.destroyWindow())
ipcMain.on('update-window-dev-tools', () => {
    let win = UpdateWindow.getWindow();
    if (!win) {
        console.warn('update-window-dev-tools: update window not available, creating it...');
        UpdateWindow.createWindow();
        win = UpdateWindow.getWindow();
        if (!win) return console.warn('update-window-dev-tools: failed to create update window');
        try {
            win.webContents.once('did-finish-load', () => {
                try { win.webContents.openDevTools({ mode: 'detach' }) } catch (e) { console.warn(e) }
            });
        } catch (e) { console.warn(e) }
        return;
    }
    try { win.webContents.openDevTools({ mode: 'detach' }) } catch (e) { console.warn(e) }
})
ipcMain.on('update-window-progress', (event, options) => {
    const win = UpdateWindow.getWindow();
    if (!win) return;
    try { win.setProgressBar(options.progress / options.size) } catch (e) { console.warn(e) }
})
ipcMain.on('update-window-progress-reset', () => {
    const win = UpdateWindow.getWindow();
    if (!win) return;
    try { win.setProgressBar(-1) } catch (e) { console.warn(e) }
})
ipcMain.on('update-window-progress-load', () => {
    const win = UpdateWindow.getWindow();
    if (!win) return;
    try { win.setProgressBar(2) } catch (e) { console.warn(e) }
})
ipcMain.on('splash-check-finished', () => {
    const updateWin = UpdateWindow.getWindow();
    if (!updateWin) return MainWindow.createWindow();

    (async () => {
        try {
            updateWin.setResizable(true);

            const animateResize = (win, targetW, targetH, duration = 600, steps = 20) => {
                return new Promise((resolve) => {
                    const startBounds = win.getBounds();
                    const startW = startBounds.width;
                    const startH = startBounds.height;
                    const centerX = startBounds.x + Math.round(startW / 2);
                    const centerY = startBounds.y + Math.round(startH / 2);

                    let i = 0;
                    const interval = Math.max(10, Math.round(duration / steps));
                    const timer = setInterval(() => {
                        i++;
                        const t = i / steps;
                        const curW = Math.round(startW + (targetW - startW) * t);
                        const curH = Math.round(startH + (targetH - startH) * t);
                        const curX = Math.round(centerX - curW / 2);
                        const curY = Math.round(centerY - curH / 2);
                        try {
                            win.setBounds({ x: curX, y: curY, width: curW, height: curH });
                        } catch (e) {
                        }
                        if (i >= steps) {
                            clearInterval(timer);
                            try { win.setBounds({ x: Math.round(centerX - targetW / 2), y: Math.round(centerY - targetH / 2), width: targetW, height: targetH }); } catch (e) {}
                            resolve();
                        }
                    }, interval);
                });
            }

            await animateResize(updateWin, 1280, 720, 600, 24);

            try { updateWin.webContents.send('splash-fade-out'); } catch (e) {}

            await new Promise(r => setTimeout(r, 900));

            const launcherPath = path.join(`${app.getAppPath()}/src/launcher.html`);
            await updateWin.loadFile(launcherPath);

            try {
                await updateWin.webContents.executeJavaScript(`document.documentElement.style.opacity = '0'; document.documentElement.style.transition = 'opacity 600ms ease';`);
                await new Promise(r => setTimeout(r, 50));
                await updateWin.webContents.executeJavaScript(`document.documentElement.style.opacity = '1';`);
            } catch (e) {
            }

            try {
                updateWin.setMinimumSize(980, 552);
                updateWin.setTitle('Survi');
            } catch (e) {}

        } catch (err) {
            UpdateWindow.destroyWindow();
            MainWindow.createWindow();
        }
    })();
})

ipcMain.handle('path-user-data', () => app.getPath('userData'))
ipcMain.handle('appData', e => app.getPath('appData'))

ipcMain.on('main-window-maximize', () => {
    const win = MainWindow.getWindow();
    if (!win) return console.warn('main-window-maximize: main window not available');
    try {
        if (win.isMaximized()) win.unmaximize();
        else win.maximize();
    } catch (e) { console.warn(e) }
})

ipcMain.on('main-window-hide', () => {
    const win = MainWindow.getWindow();
    if (!win) return console.warn('main-window-hide: main window not available');
    try { win.hide() } catch (e) { console.warn(e) }
})
ipcMain.on('main-window-show', () => {
    const win = MainWindow.getWindow();
    if (!win) return console.warn('main-window-show: main window not available');
    try { win.show() } catch (e) { console.warn(e) }
})

ipcMain.handle('Microsoft-window', async (_, client_id) => {
    return await new Microsoft(client_id).getAuth();
})

ipcMain.handle('is-dark-theme', (_, theme) => {
    if (theme === 'dark') return true
    if (theme === 'light') return false
    return nativeTheme.shouldUseDarkColors;
})

app.on('window-all-closed', () => app.quit());

autoUpdater.autoDownload = false;

ipcMain.handle('update-app', async () => {
    return await new Promise(async (resolve, reject) => {
        autoUpdater.checkForUpdates().then(res => {
            resolve(res);
        }).catch(error => {
            reject({
                error: true,
                message: error
            })
        })
    })
})

autoUpdater.on('update-available', () => {
    const updateWindow = UpdateWindow.getWindow();
    if (updateWindow) updateWindow.webContents.send('updateAvailable');
});

ipcMain.on('start-update', () => {
    autoUpdater.downloadUpdate();
})

autoUpdater.on('update-not-available', () => {
    const updateWindow = UpdateWindow.getWindow();
    if (updateWindow) updateWindow.webContents.send('update-not-available');
});

autoUpdater.on('update-downloaded', () => {
    autoUpdater.quitAndInstall();
});

autoUpdater.on('download-progress', (progress) => {
    const updateWindow = UpdateWindow.getWindow();
    if (updateWindow) updateWindow.webContents.send('download-progress', progress);
})

autoUpdater.on('error', (err) => {
    const updateWindow = UpdateWindow.getWindow();
    if (updateWindow) updateWindow.webContents.send('error', err);
});
