/**
 * @author Pablo
 * Luuxis License v1.0 (voir fichier LICENSE pour les détails en FR/EN)
 */

const { ipcRenderer } = require('electron')
const { Status } = require('minecraft-java-core')
const fs = require('fs');
const pkg = require('../package.json');

import config from './utils/config.js';
import database from './utils/database.js';
import logger from './utils/logger.js';
import popup from './utils/popup.js';
import { skin2D } from './utils/skin.js';
import slider from './utils/slider.js';

async function setBackground(theme) {
    if (typeof theme == 'undefined') {
        let databaseLauncher = new database();
        let configClient = await databaseLauncher.readData('configClient');
        theme = configClient?.launcher_config?.theme || "auto"
        theme = await ipcRenderer.invoke('is-dark-theme', theme).then(res => res)
    }
    let background
    let body = document.body;
    body.className = theme ? 'dark global' : 'light global';
    if (fs.existsSync(`${__dirname}/assets/images/background/easterEgg`) && Math.random() < 0.005) {
        let backgrounds = fs.readdirSync(`${__dirname}/assets/images/background/easterEgg`);
        let Background = backgrounds[Math.floor(Math.random() * backgrounds.length)];
        background = `url(./assets/images/background/easterEgg/${Background})`;
    } else if (fs.existsSync(`${__dirname}/assets/images/background/${theme ? 'dark' : 'light'}`)) {
        let backgrounds = fs.readdirSync(`${__dirname}/assets/images/background/${theme ? 'dark' : 'light'}`);
        let Background = backgrounds[Math.floor(Math.random() * backgrounds.length)];
        background = `linear-gradient(#00000080, #00000080), url(./assets/images/background/${theme ? 'dark' : 'light'}/${Background})`;
    }
    body.style.backgroundImage = background ? background : theme ? '#000' : '#fff';
    body.style.backgroundSize = 'cover';
}

async function changePanel(id) {
    let panel = document.querySelector(`.${id}`);
    let active = document.querySelector(`.panel.active`)
    if (active) active.classList.toggle("active");
    panel.classList.add("active");
}

async function appdata() {
    return await ipcRenderer.invoke('appData').then(path => path)
}

/**
 * INSTRUCCIONES: En utils.js, REEMPLAZAR la función addAccount con esta versión
 */

async function addAccount(data) {
    try {
        console.log('🔧 Adding account to UI:', data?.name || 'Unknown');
        
        // Validar que data existe
        if (!data || !data.ID) {
            console.error('❌ addAccount: Invalid data', data);
            return null;
        }
        
        // Buscar si ya existe
        const existingAccount = document.getElementById(data.ID);
        if (existingAccount) {
            console.log('✅ Account already exists in UI, updating');
            // Actualizar el contenido si es necesario
            return existingAccount;
        }
        
        // Crear skin
        let skin = false;
        if (data?.profile?.skins?.[0]?.base64) {
            try {
                skin = await new skin2D().creatHeadTexture(data.profile.skins[0].base64);
            } catch (e) {
                console.warn('⚠️ Could not create skin texture:', e);
            }
        }
        
        // Crear elemento div
        let div = document.createElement("div");
        div.classList.add("account");
        div.id = data.ID;
        
        // Extraer nombre con múltiples fallbacks
        const displayName = data?.name
            || data?.username
            || data?.displayName
            || data?.display_name
            || data?.profile?.name
            || data?.profile?.displayName
            || data?.meta?.name
            || data?.selectedProfile?.name
            || data?.availableProfiles?.[0]?.name
            || data?.xboxGamertag
            || 'Unknown';
        
        // Extraer UUID con múltiples fallbacks
        const uuid = data?.uuid 
            || data?.id 
            || data?.profile?.id 
            || data?.profile?.uuid 
            || data?.selectedProfile?.id 
            || data?.meta?.uuid
            || '';

        if (displayName === 'Unknown') {
            console.error('❌ addAccount: Could not determine display name');
            console.error('Available keys:', Object.keys(data || {}));
        }

        // Construir HTML
        div.innerHTML = `
            <div class="profile-image" ${skin ? `style="background-image: url(${skin});"` : ''}></div>
            <div class="profile-infos">
                <div class="profile-pseudo">${displayName}</div>
                <div class="profile-uuid">${uuid}</div>
            </div>
            <div class="delete-profile" id="${data.ID}">
                <div class="icon-account-delete delete-profile-icon"></div>
            </div>
        `;
        
        // Verificar que el contenedor existe
        const accountsList = document.querySelector('.accounts-list');
        if (!accountsList) {
            console.error('❌ .accounts-list container not found in DOM');
            return null;
        }
        
        // Agregar al DOM
        const addedElement = accountsList.appendChild(div);
        console.log('✅ Account added to UI successfully');
        return addedElement;
        
    } catch (error) {
        console.error('❌ Error in addAccount:', error);
        console.error('Stack:', error.stack);
        return null;
    }
}

async function accountSelect(data) {
    let account = document.getElementById(`${data.ID}`);
    let activeAccount = document.querySelector('.account-select')

    if (activeAccount) activeAccount.classList.toggle('account-select');
    account.classList.add('account-select');
    if (data?.profile?.skins[0]?.base64) headplayer(data.profile.skins[0].base64);
}

async function headplayer(skinBase64) {
    let skin = await new skin2D().creatHeadTexture(skinBase64);
    document.querySelector(".player-head").style.backgroundImage = `url(${skin})`;
}

async function setStatus(opt) {
    let nameServerElement = document.querySelector('.server-status-name')
    let statusServerElement = document.querySelector('.server-status-text')
    let playersOnline = document.querySelector('.status-player-count .player-count')

    if (!opt) {
        statusServerElement.classList.add('red')
        statusServerElement.innerHTML = `Cerrado - 0 ms`
        document.querySelector('.status-player-count').classList.add('red')
        playersOnline.innerHTML = '0'
        return
    }

    let { ip, port, nameServer } = opt
    nameServerElement.innerHTML = nameServer
    let status = new Status(ip, port);
    let statusServer = await status.getStatus().then(res => res).catch(err => err);

    if (!statusServer.error) {
        statusServerElement.classList.remove('red')
        document.querySelector('.status-player-count').classList.remove('red')
        statusServerElement.innerHTML = `En línea - ${statusServer.ms} ms`
        playersOnline.innerHTML = statusServer.playersConnect
    } else {
        statusServerElement.classList.add('red')
        statusServerElement.innerHTML = `Cerrado - 0 ms`
        document.querySelector('.status-player-count').classList.add('red')
        playersOnline.innerHTML = '0'
    }
}


export {
    appdata as appdata,
    changePanel as changePanel,
    config as config,
    database as database,
    logger as logger,
    popup as popup,
    setBackground as setBackground,
    skin2D as skin2D,
    addAccount as addAccount,
    accountSelect as accountSelect,
    slider as Slider,
    pkg as pkg,
    setStatus as setStatus
}
