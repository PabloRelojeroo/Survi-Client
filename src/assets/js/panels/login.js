/**
 * @author Luuxis - FIXED ENTERPRISE
 * REEMPLAZAR TODO login.js CON ESTE CÓDIGO
 */

const { AZauth, Mojang } = require('minecraft-java-core');
const { ipcRenderer } = require('electron');
import { popup, database, changePanel, accountSelect, addAccount, config, setStatus } from '../utils.js';

class Login {
    static id = "login";
    
    async init(config) {
        try {
            this.config = config;
            this.db = new database();

            this.getMicrosoft();
            this.getCrack();

            const loginHome = document.querySelector('.login-home');
            const loginOffline = document.querySelector('.login-offline');
            const toggles = document.querySelectorAll('.toggle-input');

            toggles.forEach(toggle => {
                toggle.addEventListener('change', (e) => {
                    const isOnline = e.target.checked;

                    toggles.forEach(t => {
                        t.checked = isOnline;
                        const container = t.closest('.login-toggle-container');
                        if (container) {
                            const msIcon = container.querySelector('.icon-microsoft');
                            const offIcon = container.querySelector('.icon-offline');
                            if (isOnline) {
                                msIcon?.classList.add('active');
                                offIcon?.classList.remove('active');
                            } else {
                                msIcon?.classList.remove('active');
                                offIcon?.classList.add('active');
                            }
                        }
                    });

                    if (isOnline) {
                        loginOffline?.classList.remove('active-mode');
                        loginOffline?.classList.add('inactive-mode');
                        loginHome?.classList.remove('inactive-mode');
                        loginHome?.classList.add('active-mode');
                    } else {
                        loginHome?.classList.remove('active-mode');
                        loginHome?.classList.add('inactive-mode');
                        loginOffline?.classList.remove('inactive-mode');
                        loginOffline?.classList.add('active-mode');
                    }
                });
            });

            let startOnline = true;
            if (typeof this.config.online == 'boolean') {
                startOnline = this.config.online;
            }

            if (startOnline) {
                loginHome?.classList.add('active-mode');
                loginOffline?.classList.add('inactive-mode');
            } else {
                loginHome?.classList.add('inactive-mode');
                loginOffline?.classList.add('active-mode');
            }

            toggles.forEach(t => {
                t.checked = startOnline;
                const container = t.closest('.login-toggle-container');
                if (container) {
                    const msIcon = container.querySelector('.icon-microsoft');
                    const offIcon = container.querySelector('.icon-offline');
                    if (startOnline) {
                        msIcon?.classList.add('active');
                        offIcon?.classList.remove('active');
                    } else {
                        msIcon?.classList.remove('active');
                        offIcon?.classList.add('active');
                    }
                }
            });

            if (typeof this.config.online == 'string' && this.config.online.match(/^(http|https):\/\/[^ "]+$/)) {
                this.getAZauth();
                loginHome?.classList.remove('active-mode');
                loginHome?.classList.add('inactive-mode');
            }

            const cancelBtn = document.querySelector('.cancel-home');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    cancelBtn.style.display = 'none';
                    changePanel('settings');
                });
            }
        } catch (error) {
            console.error('❌ Error initializing login:', error);
        }
    }

    async getMicrosoft() {
        console.log('🔐 Initializing Microsoft login...');
        let popupLogin = new popup();
        let microsoftBtn = document.querySelector('.connect-home');

        if (!microsoftBtn) {
            console.warn('⚠️ Microsoft button not found');
            return;
        }

        microsoftBtn.addEventListener("click", () => {
            popupLogin.openPopup({
                title: 'Conexión',
                content: 'Por favor espera...',
                color: 'var(--color)'
            });

            ipcRenderer.invoke('Microsoft-window', this.config.client_id)
                .then(async account_connect => {
                    try {
                        if (account_connect == 'cancel' || !account_connect) {
                            popupLogin.closePopup();
                            return;
                        }
                        
                        console.log('✅ Microsoft account received');
                        
                        // DIAGNÓSTICO COMPLETO
                        console.log('=== ESTRUCTURA COMPLETA DEL OBJETO ===');
                        console.log('Todas las keys:', Object.keys(account_connect));
                        console.log('Objeto completo (stringify):', JSON.stringify(account_connect, null, 2));
                        
                        // Inspeccionar cada nivel
                        console.log('--- NIVEL 1 ---');
                        console.log('name:', account_connect.name);
                        console.log('username:', account_connect.username);
                        console.log('displayName:', account_connect.displayName);
                        console.log('display_name:', account_connect.display_name);
                        
                        console.log('--- NIVEL 2: profile ---');
                        if (account_connect.profile) {
                            console.log('profile keys:', Object.keys(account_connect.profile));
                            console.log('profile.name:', account_connect.profile.name);
                            console.log('profile.displayName:', account_connect.profile.displayName);
                        } else {
                            console.log('profile: NO EXISTE');
                        }
                        
                        console.log('--- NIVEL 2: meta ---');
                        if (account_connect.meta) {
                            console.log('meta keys:', Object.keys(account_connect.meta));
                            console.log('meta.name:', account_connect.meta.name);
                            console.log('meta.type:', account_connect.meta.type);
                        } else {
                            console.log('meta: NO EXISTE');
                        }
                        
                        console.log('--- NIVEL 2: selectedProfile ---');
                        if (account_connect.selectedProfile) {
                            console.log('selectedProfile keys:', Object.keys(account_connect.selectedProfile));
                            console.log('selectedProfile.name:', account_connect.selectedProfile.name);
                        } else {
                            console.log('selectedProfile: NO EXISTE');
                        }
                        
                        console.log('--- OTROS CAMPOS POSIBLES ---');
                        console.log('xboxGamertag:', account_connect.xboxGamertag);
                        console.log('gamertag:', account_connect.gamertag);
                        console.log('user:', account_connect.user);
                        console.log('mcToken:', account_connect.mcToken);
                        
                        const normalizedAccount = this.normalizeMicrosoftAccount(account_connect);
                        
                        // Permitir continuar incluso si el nombre es Unknown
                        // (el usuario puede cambiarlo después si es necesario)
                        if (!normalizedAccount.name || normalizedAccount.name === 'Unknown') {
                            console.warn('⚠️ No se pudo extraer nombre, usando UUID como nombre');
                            normalizedAccount.name = normalizedAccount.uuid.substring(0, 8);
                        }
                        
                        console.log('✅ Proceeding with account:', normalizedAccount.name);
                        
                        await this.saveData(normalizedAccount);
                        popupLogin.closePopup();
                    } catch (error) {
                        console.error('❌ Error processing Microsoft account:', error);
                        console.error('Error stack:', error.stack);
                        popupLogin.openPopup({
                            title: 'Error',
                            content: error.message || 'Error al procesar la cuenta',
                            color: 'red',
                            options: true
                        });
                    }
                })
                .catch(err => {
                    console.error('❌ Microsoft login error:', err);
                    popupLogin.openPopup({
                        title: 'Error',
                        content: err.message || 'Error de conexión',
                        color: 'red',
                        options: true
                    });
                });
        });
    }

    normalizeMicrosoftAccount(account) {
        console.log('🔄 Normalizing Microsoft account...');
        
        // EXPLORAR TODAS LAS RUTAS POSIBLES
        const possibleNames = [
            account.name,
            account.username,
            account.displayName,
            account.display_name,
            account.profile?.name,
            account.profile?.displayName,
            account.selectedProfile?.name,
            account.meta?.name,
            account.xboxGamertag,
            account.gamertag,
            account.user?.name,
            account.user?.username,
            account.mcToken?.profile?.name,
            // Buscar en propiedades anidadas
            this.deepSearch(account, 'name'),
            this.deepSearch(account, 'username'),
            this.deepSearch(account, 'displayName'),
            this.deepSearch(account, 'gamertag')
        ];
        
        console.log('🔍 Nombres encontrados:', possibleNames.filter(n => n));
        
        const name = possibleNames.find(n => n && n !== 'Unknown' && n.length > 0) || 'Unknown';
        
        const possibleUUIDs = [
            account.uuid,
            account.id,
            account.profile?.id,
            account.profile?.uuid,
            account.selectedProfile?.id,
            account.meta?.uuid,
            account.user?.id,
            this.deepSearch(account, 'uuid'),
            this.deepSearch(account, 'id')
        ];
        
        const uuid = possibleUUIDs.find(u => u && u.length > 0) || this.generateOfflineUUID(name);
        
        console.log(`✅ Normalized: ${name} (${uuid})`);
        
        return {
            name: name,
            uuid: uuid,
            access_token: account.access_token || account.accessToken || '',
            client_token: account.client_token || account.clientToken || '',
            refresh_token: account.refresh_token || account.refreshToken || '',
            meta: {
                type: 'Xbox',
                online: true,
                ...(account.meta || {})
            },
            profile: {
                id: uuid,
                name: name,
                skins: account.profile?.skins || [],
                ...(account.profile || {})
            },
            ...account,
            name: name,
            uuid: uuid
        };
    }

    deepSearch(obj, key) {
        // Búsqueda recursiva profunda de una clave
        if (!obj || typeof obj !== 'object') return null;
        
        if (obj.hasOwnProperty(key) && obj[key]) {
            return obj[key];
        }
        
        for (let k in obj) {
            if (typeof obj[k] === 'object') {
                const result = this.deepSearch(obj[k], key);
                if (result) return result;
            }
        }
        
        return null;
    }

    generateOfflineUUID(username) {
        const crypto = require('crypto');
        const hash = crypto.createHash('md5').update(`OfflinePlayer:${username}`).digest('hex');
        return `${hash.substr(0,8)}-${hash.substr(8,4)}-${hash.substr(12,4)}-${hash.substr(16,4)}-${hash.substr(20,12)}`;
    }

    async getCrack() {
        console.log('🔓 Initializing offline login...');
        let popupLogin = new popup();
        let emailOffline = document.querySelector('.email-offline');
        let connectOffline = document.querySelector('.connect-offline');

        if (!emailOffline || !connectOffline) {
            console.warn('⚠️ Offline login elements not found');
            return;
        }

        connectOffline.addEventListener('click', async () => {
            try {
                const username = emailOffline.value.trim();
                
                if (username.length < 3) {
                    popupLogin.openPopup({
                        title: 'Error',
                        content: 'Tu apodo debe tener al menos 3 caracteres.',
                        color: 'orange',
                        options: true
                    });
                    return;
                }

                if (username.match(/ /g)) {
                    popupLogin.openPopup({
                        title: 'Error',
                        content: 'Tu apodo no debe contener espacios.',
                        color: 'orange',
                        options: true
                    });
                    return;
                }

                popupLogin.openPopup({
                    title: 'Conexión',
                    content: 'Creando cuenta offline...',
                    color: 'var(--color)'
                });

                let MojangConnect = await Mojang.login(username);

                if (MojangConnect.error) {
                    popupLogin.openPopup({
                        title: 'Error',
                        content: MojangConnect.message,
                        color: 'red',
                        options: true
                    });
                    return;
                }
                
                console.log('✅ Offline account created:', username);
                await this.saveData(MojangConnect);
                popupLogin.closePopup();
                
            } catch (error) {
                console.error('❌ Offline login error:', error);
                popupLogin.openPopup({
                    title: 'Error',
                    content: error.message || 'Error al crear cuenta offline',
                    color: 'red',
                    options: true
                });
            }
        });
    }

    async getAZauth() {
        console.log('🔐 Initializing AZauth login...');
        let AZauthClient = new AZauth(this.config.online);
        let PopupLogin = new popup();
        let loginAZauth = document.querySelector('.login-AZauth');
        let loginAZauthA2F = document.querySelector('.login-AZauth-A2F');

        let AZauthEmail = document.querySelector('.email-AZauth');
        let AZauthPassword = document.querySelector('.password-AZauth');
        let AZauthA2F = document.querySelector('.A2F-AZauth');
        let connectAZauthA2F = document.querySelector('.connect-AZauth-A2F');
        let AZauthConnectBTN = document.querySelector('.connect-AZauth');
        let AZauthCancelA2F = document.querySelector('.cancel-AZauth-A2F');

        if (!loginAZauth || !AZauthConnectBTN) {
            console.warn('⚠️ AZauth elements not found');
            return;
        }

        loginAZauth.style.display = 'block';

        AZauthConnectBTN.addEventListener('click', async () => {
            try {
                PopupLogin.openPopup({
                    title: 'Conexión en curso...',
                    content: 'Por favor espera...',
                    color: 'var(--color)'
                });

                if (!AZauthEmail.value || !AZauthPassword.value) {
                    PopupLogin.openPopup({
                        title: 'Error',
                        content: 'Por favor llena todos los campos.',
                        color: 'orange',
                        options: true
                    });
                    return;
                }

                let AZauthConnect = await AZauthClient.login(AZauthEmail.value, AZauthPassword.value);

                if (AZauthConnect.error) {
                    PopupLogin.openPopup({
                        title: 'Error',
                        content: AZauthConnect.message,
                        color: 'red',
                        options: true
                    });
                    return;
                }
                
                if (AZauthConnect.A2F && loginAZauthA2F) {
                    loginAZauthA2F.style.display = 'block';
                    loginAZauth.style.display = 'none';
                    PopupLogin.closePopup();

                    AZauthCancelA2F?.addEventListener('click', () => {
                        loginAZauthA2F.style.display = 'none';
                        loginAZauth.style.display = 'block';
                    });

                    connectAZauthA2F?.addEventListener('click', async () => {
                        try {
                            PopupLogin.openPopup({
                                title: 'Conexión en curso...',
                                content: 'Por favor espera...',
                                color: 'var(--color)'
                            });

                            if (!AZauthA2F.value) {
                                PopupLogin.openPopup({
                                    title: 'Error',
                                    content: 'Por favor ingresa el código A2F.',
                                    color: 'orange',
                                    options: true
                                });
                                return;
                            }

                            AZauthConnect = await AZauthClient.login(
                                AZauthEmail.value, 
                                AZauthPassword.value, 
                                AZauthA2F.value
                            );

                            if (AZauthConnect.error) {
                                PopupLogin.openPopup({
                                    title: 'Error',
                                    content: AZauthConnect.message,
                                    color: 'red',
                                    options: true
                                });
                                return;
                            }

                            await this.saveData(AZauthConnect);
                            PopupLogin.closePopup();
                        } catch (error) {
                            console.error('❌ A2F error:', error);
                            PopupLogin.openPopup({
                                title: 'Error',
                                content: error.message,
                                color: 'red',
                                options: true
                            });
                        }
                    });
                } else {
                    await this.saveData(AZauthConnect);
                    PopupLogin.closePopup();
                }
            } catch (error) {
                console.error('❌ AZauth login error:', error);
                PopupLogin.openPopup({
                    title: 'Error',
                    content: error.message,
                    color: 'red',
                    options: true
                });
            }
        });
    }

    async saveData(connectionData) {
        try {
            console.log('💾 Saving account data...');
            
            const extractedName = connectionData.name 
                || connectionData.username 
                || connectionData.profile?.name 
                || connectionData.displayName
                || connectionData.selectedProfile?.name
                || connectionData.uuid?.substring(0, 8) // Usar primeros 8 chars del UUID como fallback
                || 'Player';

            console.log(`✅ Account name: ${extractedName}`);

            let configClient = await this.db.readData('configClient');
            
            if (!configClient) {
                console.warn('⚠️ No configClient found, using defaults');
                configClient = {
                    account_selected: null,
                    instance_select: null,
                    java_config: { java_path: null, java_memory: { min: 2, max: 4 } },
                    game_config: { screen_size: { width: 854, height: 480 } },
                    launcher_config: {
                        download_multi: 5,
                        theme: 'auto',
                        closeLauncher: 'close-launcher',
                        intelEnabledMac: true
                    }
                };
            }

            // Asegurar que el nombre está en el objeto antes de guardar
            if (!connectionData.name || connectionData.name === 'Unknown') {
                connectionData.name = extractedName;
            }

            let account = await this.db.createData('accounts', connectionData);
            console.log(`✅ Account saved with ID: ${account.ID}`);

            let instancesList = await config.getInstanceList();
            configClient.account_selected = account.ID;

            for (let instance of instancesList) {
                if (instance.whitelistActive) {
                    let hasAccess = instance.whitelist && instance.whitelist.includes(extractedName);
                    
                    if (!hasAccess && instance.name === configClient.instance_select) {
                        let newInstanceSelect = instancesList.find(i => !i.whitelistActive);
                        if (newInstanceSelect) {
                            configClient.instance_select = newInstanceSelect.name;
                            if (newInstanceSelect.status) {
                                await setStatus(newInstanceSelect.status);
                            }
                        }
                    }
                }
            }

            await this.db.updateData('configClient', configClient);
            await addAccount(account);
            await accountSelect(account);
            
            console.log('✅ Login complete, switching to home');
            changePanel('home');

        } catch (error) {
            console.error('❌ Error saving account:', error);
            console.error('Stack:', error.stack);
            throw error;
        }
    }

    refreshState() {
        const toggles = document.querySelectorAll('.toggle-input');
        if (toggles.length > 0) {
            const event = new Event('change');
            toggles[0].dispatchEvent(event);
        }
    }
}

export default Login;