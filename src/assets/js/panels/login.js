/**
 * @author Luuxis
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0
 */
const { AZauth, Mojang } = require('minecraft-java-core');
const { ipcRenderer } = require('electron');

import { popup, database, changePanel, accountSelect, addAccount, config, setStatus } from '../utils.js';

class Login {
    static id = "login";
    
    constructor() {
        this.offlineHandlerBound = false;
    }

    async init(config) {
        this.config = config;
        this.db = new database();

        this.mostrarOpcionesLogin();

        document.querySelector('.cancel-home').addEventListener('click', () => {
            document.querySelector('.cancel-home').style.display = 'none'
            changePanel('settings')
        })
    }

    mostrarOpcionesLogin() {
        let loginHome = document.querySelector('.login-home');
        if (loginHome) {
            loginHome.style.display = 'block';
        }

        let microsoftBtn = document.querySelector('.connect-home');
        if (microsoftBtn) {
            microsoftBtn.addEventListener("click", () => {
                this.iniciarLoginMicrosoft();
            });
        }

        let offlineBtn = document.querySelector('.connect-crack');
        if (offlineBtn) {
            offlineBtn.addEventListener("click", () => {
                this.mostrarLoginOffline();
            });
        }

        if (typeof this.config.online == 'string' && this.config.online.match(/^(http|https):\/\/[^ "]+$/)) {
            this.getAZauth();
        }
    }

    mostrarLoginOffline() {
        let loginHome = document.querySelector('.login-home');
        let loginOffline = document.querySelector('.login-offline');

        if (loginHome) loginHome.style.display = 'none';
        if (loginOffline) loginOffline.style.display = 'block';

        if (!this.offlineHandlerBound) {
            this.configurarLoginOffline();
            this.offlineHandlerBound = true;
        }
    }

    iniciarLoginMicrosoft() {
        let popupLogin = new popup();
        popupLogin.openPopup({
            title: 'Conectando',
            content: 'Por favor espere...',
            color: 'var(--color)'
        });

        ipcRenderer.invoke('Microsoft-window', this.config.client_id).then(async account_connect => {
            if (account_connect == 'cancel' || !account_connect) {
                popupLogin.closePopup();
                return;
            } else {
                await this.saveData(account_connect);
                popupLogin.closePopup();
            }
        }).catch(err => {
            popupLogin.closePopup();
            popupLogin.openPopup({
                title: 'Error',
                content: err.message || String(err),
                color: 'red',
                options: true
            });
        });
    }

    configurarLoginOffline() {
        let popupLogin = new popup();
        let emailOffline = document.querySelector('.email-offline');
        let connectOffline = document.querySelector('.connect-offline');
        let cancelOffline = document.querySelector('.cancel-offline');

        if (cancelOffline) {
            cancelOffline.style.display = 'inline-block';
            
            const newCancelBtn = cancelOffline.cloneNode(true);
            cancelOffline.parentNode.replaceChild(newCancelBtn, cancelOffline);
            cancelOffline = newCancelBtn;
            
            cancelOffline.addEventListener('click', () => {
                let loginHome = document.querySelector('.login-home');
                let loginOffline = document.querySelector('.login-offline');

                if (loginOffline) loginOffline.style.display = 'none';
                if (loginHome) loginHome.style.display = 'block';

                if (emailOffline) emailOffline.value = '';
            });
        }

        if (connectOffline) {
            const newConnectBtn = connectOffline.cloneNode(true);
            connectOffline.parentNode.replaceChild(newConnectBtn, connectOffline);
            connectOffline = newConnectBtn;

            connectOffline.addEventListener('click', async () => {
                if (!emailOffline || emailOffline.value.length < 3) {
                    popupLogin.openPopup({
                        title: 'Error',
                        content: 'Su nombre de usuario debe tener al menos 3 caracteres.',
                        color: 'red',
                        options: true
                    });
                    return;
                }

                if (emailOffline.value.match(/ /g)) {
                    popupLogin.openPopup({
                        title: 'Error',
                        content: 'Su nombre de usuario no debe contener espacios.',
                        color: 'red',
                        options: true
                    });
                    return;
                }

                popupLogin.openPopup({
                    title: 'Conectando',
                    content: 'Conectando cuenta offline...',
                    color: 'var(--color)'
                });

                let MojangConnect = await Mojang.login(emailOffline.value);

                if (MojangConnect.error) {
                    popupLogin.closePopup();
                    popupLogin.openPopup({
                        title: 'Error',
                        content: MojangConnect.message,
                        color: 'red',
                        options: true
                    });
                    return;
                }
                
                await this.saveData(MojangConnect);
                popupLogin.closePopup();
            });
        }
    }

    async getAZauth() {
        if (typeof this.config.online !== 'string' || !this.config.online.match(/^(http|https):\/\/[^ "]+$/)) {
            return;
        }

        console.log('Inicializando login AZauth...');
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

        if (loginAZauth) loginAZauth.style.display = 'block';

        if (AZauthConnectBTN) {
            AZauthConnectBTN.addEventListener('click', async () => {
                PopupLogin.openPopup({
                    title: 'Conexion en curso...',
                    content: 'Por favor espere...',
                    color: 'var(--color)'
                });

                if (!AZauthEmail || !AZauthPassword || AZauthEmail.value == '' || AZauthPassword.value == '') {
                    PopupLogin.closePopup();
                    PopupLogin.openPopup({
                        title: 'Error',
                        content: 'Por favor complete todos los campos.',
                        color: 'red',
                        options: true
                    });
                    return;
                }

                let AZauthConnect = await AZauthClient.login(AZauthEmail.value, AZauthPassword.value);

                if (AZauthConnect.error) {
                    PopupLogin.closePopup();
                    PopupLogin.openPopup({
                        title: 'Error',
                        content: AZauthConnect.message,
                        color: 'red',
                        options: true
                    });
                    return;
                } else if (AZauthConnect.A2F) {
                    if (loginAZauthA2F && loginAZauth) {
                        loginAZauthA2F.style.display = 'block';
                        loginAZauth.style.display = 'none';
                    }
                    PopupLogin.closePopup();

                    if (AZauthCancelA2F) {
                        AZauthCancelA2F.addEventListener('click', () => {
                            if (loginAZauthA2F && loginAZauth) {
                                loginAZauthA2F.style.display = 'none';
                                loginAZauth.style.display = 'block';
                            }
                        });
                    }

                    if (connectAZauthA2F) {
                        connectAZauthA2F.addEventListener('click', async () => {
                            PopupLogin.openPopup({
                                title: 'Conexión en curso...',
                                content: 'Por favor espere...',
                                color: 'var(--color)'
                            });

                            if (!AZauthA2F || AZauthA2F.value == '') {
                                PopupLogin.closePopup();
                                PopupLogin.openPopup({
                                    title: 'Error',
                                    content: 'Por favor ingrese el código A2F.',
                                    color: 'red',
                                    options: true
                                });
                                return;
                            }

                            AZauthConnect = await AZauthClient.login(AZauthEmail.value, AZauthPassword.value, AZauthA2F.value);

                            if (AZauthConnect.error) {
                                PopupLogin.closePopup();
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
                        });
                    }
                } else if (!AZauthConnect.A2F) {
                    await this.saveData(AZauthConnect);
                    PopupLogin.closePopup();
                }
            });
        }
    }

    async saveData(connectionData) {
        try {
            
            let configClient = await this.db.readData('configClient');
            
            let account = await this.db.createData('accounts', connectionData);
            
            let instanceSelect = configClient.instance_selct;
            let instancesList = await config.getInstanceList();
            
            for (let instance of instancesList) {
                if (instance.whitelistActive) {
                    let whitelist = instance.whitelist.find(w => w == account.name);
                    if (whitelist !== account.name) {
                        if (instance.name == instanceSelect) {
                            let newInstanceSelect = instancesList.find(i => i.whitelistActive == false);
                            if (newInstanceSelect) {
                                configClient.instance_selct = newInstanceSelect.name;
                                await setStatus(newInstanceSelect.status);
                            }
                        }
                    }
                }
            }

            configClient.account_selected = account.ID;
            await this.db.updateData('configClient', configClient);

            await addAccount(account);

            await accountSelect(account);

            changePanel('home');
            
        } catch (error) {
            console.error('Error guardando datos:', error);
            let errorPopup = new popup();
            errorPopup.openPopup({
                title: 'Error',
                content: `Error al guardar la cuenta: ${error.message}`,
                color: 'red',
                options: true
            });
        }
    }
}

export default Login;