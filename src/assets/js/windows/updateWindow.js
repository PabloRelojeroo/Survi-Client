/**
 * @author Pablo
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0
 */

"use strict";
const { app, BrowserWindow, Menu } = require("electron");
const path = require("path");
const os = require("os");
let dev = process.env.DEV_TOOL === 'open';
let updateWindow = undefined;

function getWindow() {
    return updateWindow;
}

function destroyWindow() {
    if (!updateWindow) return;
    updateWindow.close();
    updateWindow = undefined;
}

function createWindow() {
    destroyWindow();
    updateWindow = new BrowserWindow({
        title: "Actualizar",
        width: 400,
        height: 500,
        resizable: false,
        icon: `./src/assets/images/icon.${os.platform() === "win32" ? "ico" : "png"}`,
        frame: false,
        show: false,
        webPreferences: {
            contextIsolation: false,
            nodeIntegration: true
        },
        backgroundColor: '#292929'
    });
    Menu.setApplicationMenu(null);
    updateWindow.setMenuBarVisibility(false);
    updateWindow.loadFile(path.join(`${app.getAppPath()}/src/index.html`));
    updateWindow.once('ready-to-show', () => {
        if (updateWindow) {
            if (dev) updateWindow.webContents.openDevTools({ mode: 'detach' })
            updateWindow.show();
        }
    });
}

async function expandToMainWindow() {
    if (!updateWindow) return;

    const startWidth = 400;
    const startHeight = 500;
    const endWidth = 1280;
    const endHeight = 720;

    const duration = 800; // ms
    const fps = 60;
    const frames = (duration / 1000) * fps;
    const delay = duration / frames;

    // Función de easing (ease-in-out)
    const easeInOutCubic = (t) => {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    // Animar el resize
    for (let i = 0; i <= frames; i++) {
        const progress = easeInOutCubic(i / frames);
        const currentWidth = Math.round(startWidth + (endWidth - startWidth) * progress);
        const currentHeight = Math.round(startHeight + (endHeight - startHeight) * progress);

        updateWindow.setSize(currentWidth, currentHeight, true);
        updateWindow.center();

        await new Promise(resolve => setTimeout(resolve, delay));
    }

    // Asegurar tamaño final exacto
    updateWindow.setSize(endWidth, endHeight, true);
    updateWindow.center();
}

module.exports = {
    getWindow,
    createWindow,
    destroyWindow,
    expandToMainWindow,
};