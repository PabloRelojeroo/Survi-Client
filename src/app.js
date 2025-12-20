/**
 * @author Pablo
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0
 */

const { app, ipcMain, nativeTheme } = require('electron');
const { Microsoft } = require('minecraft-java-core');
const { autoUpdater } = require('electron-updater')
const os = require('os');

const path = require('path');
const fs = require('fs');

const UpdateWindow = require("./assets/js/windows/updateWindow.js");
const MainWindow = require("./assets/js/windows/mainWindow.js");

// SINGLE INSTANCE LOCK
if (!app.requestSingleInstanceLock()) {
    console.log('Second instance detected. Quitting.');
    app.quit();
    return;
}

let dev = process.env.NODE_ENV === 'dev';

// Configurar userData path de forma consistente para dev y producción
const userDataPath = dev
    ? path.resolve('./data/Launcher').replace(/\\/g, '/')
    : (process.platform === 'linux'
        ? path.join(os.homedir(), '.config', 'selkieclient')
        : path.join(app.getPath('appData'), 'selkieclient'));

// Crear directorio si no existe
if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
}

// Configurar path
app.setPath('userData', userDataPath);

// Logging para debugging
console.log('[INIT] userData path:', app.getPath('userData'));
console.log('[INIT] Mode:', dev ? 'development' : 'production');
console.log('[INIT] Platform:', process.platform);

// En desarrollo, también configurar appData
if (dev) {
    let appdata = path.resolve('./data').replace(/\\/g, '/');
    if (!fs.existsSync(appdata)) fs.mkdirSync(appdata, { recursive: true });
    app.setPath('appData', appdata);
}

// Optimizaciones específicas para Linux
if (process.platform === 'linux') {
    // Habilitar aceleración de hardware
    app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder');
    app.commandLine.appendSwitch('ignore-gpu-blocklist');
    app.commandLine.appendSwitch('enable-gpu-rasterization');
    app.commandLine.appendSwitch('enable-zero-copy');

    // Reducir overhead de inicio
    app.commandLine.appendSwitch('disable-background-timer-throttling');
    app.commandLine.appendSwitch('disable-renderer-backgrounding');

    // Optimización de memoria
    app.commandLine.appendSwitch('js-flags', '--max-old-space-size=2048');
}

app.commandLine.appendSwitch('js-flags', '--max-old-space-size=2048');

app.whenReady().then(() => {
    if (dev) return MainWindow.createWindow()
    UpdateWindow.createWindow()
});

ipcMain.on('main-window-open', () => MainWindow.createWindow())
ipcMain.on('main-window-dev-tools', () => {
    const win = MainWindow.getWindow() || UpdateWindow.getWindow();
    if (win) win.webContents.openDevTools({ mode: 'detach' });
})
ipcMain.on('main-window-dev-tools-close', () => {
    const win = MainWindow.getWindow() || UpdateWindow.getWindow();
    if (win) win.webContents.closeDevTools();
})
ipcMain.on('main-window-close', () => {
    if (MainWindow.getWindow()) MainWindow.destroyWindow();
    else if (UpdateWindow.getWindow()) UpdateWindow.destroyWindow();
})
ipcMain.on('main-window-reload', () => {
    const win = MainWindow.getWindow() || UpdateWindow.getWindow();
    if (win) win.reload();
})
ipcMain.on('main-window-progress', (event, options) => {
    const win = MainWindow.getWindow() || UpdateWindow.getWindow();
    if (win) win.setProgressBar(options.progress / options.size);
})
ipcMain.on('main-window-progress-reset', () => {
    const win = MainWindow.getWindow() || UpdateWindow.getWindow();
    if (win) win.setProgressBar(-1);
})
ipcMain.on('main-window-progress-load', () => {
    const win = MainWindow.getWindow() || UpdateWindow.getWindow();
    if (win) win.setProgressBar(2);
})
ipcMain.on('main-window-minimize', () => {
    const win = MainWindow.getWindow() || UpdateWindow.getWindow();
    if (win) win.minimize();
})

ipcMain.on('update-window-close', () => UpdateWindow.destroyWindow())
ipcMain.on('update-window-dev-tools', () => UpdateWindow.getWindow().webContents.openDevTools({ mode: 'detach' }))
ipcMain.on('update-window-progress', (event, options) => UpdateWindow.getWindow().setProgressBar(options.progress / options.size))
ipcMain.on('update-window-progress-reset', () => UpdateWindow.getWindow().setProgressBar(-1))
ipcMain.on('update-window-progress-load', () => UpdateWindow.getWindow().setProgressBar(2))

ipcMain.on('expand-and-load-main', async () => {
    const updateWin = UpdateWindow.getWindow();
    if (!updateWin) return;

    // Expandir la ventana
    await UpdateWindow.expandToMainWindow();

    // Pequeña pausa para que se vea la expansión completa
    await new Promise(resolve => setTimeout(resolve, 100));

    // Cargar el contenido del launcher en la misma ventana
    updateWin.loadFile(path.join(`${app.getAppPath()}/src/launcher.html`));

    // Hacer la ventana redimensionable y actualizar propiedades
    updateWin.setResizable(true);
    updateWin.setMinimumSize(980, 552);

    // En Windows, mantener sin frame; en otros OS, agregar frame
    // (esto requeriría recrear la ventana, así que lo dejamos como está)
})


ipcMain.handle('path-user-data', () => app.getPath('userData'))
ipcMain.handle('appData', e => app.getPath('appData'))
ipcMain.handle('get-paths-info', () => ({
    userData: app.getPath('userData'),
    appData: app.getPath('appData'),
    mode: dev ? 'development' : 'production',
    platform: process.platform
}))

ipcMain.on('main-window-maximize', () => {
    const win = MainWindow.getWindow() || UpdateWindow.getWindow();
    if (win) {
        if (win.isMaximized()) {
            win.unmaximize();
        } else {
            win.maximize();
        }
    }
})

ipcMain.on('main-window-hide', () => {
    const win = MainWindow.getWindow() || UpdateWindow.getWindow();
    if (win) win.hide();
})
ipcMain.on('main-window-show', () => {
    const win = MainWindow.getWindow() || UpdateWindow.getWindow();
    if (win) win.show();
})

ipcMain.handle('Microsoft-window', async (_, client_id) => {
    return await new Microsoft(client_id).getAuth();
})

// Nuevo: Soporte para refresh de tokens Microsoft
ipcMain.handle('Microsoft-refresh', async (_, client_id, refresh_token) => {
    try {
        const microsoft = new Microsoft(client_id);
        const refreshedAuth = await microsoft.refresh(refresh_token);

        // Asegúrate de que el objeto devuelto tenga la estructura correcta
        if (refreshedAuth && refreshedAuth.access_token) {
            return {
                access_token: refreshedAuth.access_token,
                refresh_token: refreshedAuth.refresh_token || refresh_token, // Mantén el refresh_token si no se devuelve uno nuevo
                expires_in: refreshedAuth.expires_in || 3600, // Default 1 hora
                uuid: refreshedAuth.uuid,
                name: refreshedAuth.name,
                profile: refreshedAuth.profile
            };
        } else {
            return {
                error: true,
                message: 'Token refresh falló - respuesta inválida'
            };
        }
    } catch (error) {
        console.error('Error refreshing Microsoft token:', error);
        return {
            error: true,
            message: error.message || 'Error refrescando token Microsoft'
        };
    }
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