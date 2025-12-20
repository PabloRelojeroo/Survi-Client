// Reemplaza la función startGame completa en home.js con esta versión mejorada

async startGame() {
    this.isGameLaunching = true;

    try {
        console.log('=== INICIO startGame ===');
        
        let launch = new Launch();
        console.log('✓ Launch instance creada');
        
        let configClient = await this.db.readData('configClient');
        console.log('✓ configClient obtenido:', configClient ? 'OK' : 'NULL');
        
        let instance = await config.getInstanceList();
        console.log('✓ Instance list obtenida:', instance ? instance.length + ' instancias' : 'NULL');
        
        let authenticator = await this.db.readData('accounts', configClient?.account_selected);
        console.log('✓ Authenticator obtenido:', authenticator ? 'OK' : 'NULL');

        // VALIDACIÓN CRÍTICA
        if (!authenticator) {
            throw new Error("❌ No hay una cuenta seleccionada válida.");
        }

        if (!configClient) {
            throw new Error("❌ No se pudo cargar la configuración del cliente.");
        }

        let options = instance.find(i => i.name == configClient.instance_select);
        if (!options) options = this.currentSelectedInstance;
        
        console.log('Instancia seleccionada:', options ? options.name : 'NULL');
        
        if (!options) {
            throw new Error("❌ No se pudo encontrar la configuración de la instancia seleccionada.");
        }

        // VALIDACIÓN Y NORMALIZACIÓN DE LOADER
        console.log('Validando estructura loader...');
        
        // Si loader no existe o es inválido, crear estructura por defecto
        if (!options.loadder || typeof options.loadder !== 'object') {
            console.warn('⚠️ options.loadder faltante o inválido, creando estructura por defecto');
            options.loadder = {
                loadder_type: 'none',
                loadder_version: '',
                minecraft_version: options.minecraft_version || options.version || '1.20.1'
            };
        } else {
            // Validar y normalizar campos individuales
            options.loadder.minecraft_version = options.loadder.minecraft_version 
                || options.minecraft_version 
                || options.version 
                || '1.20.1';
                
            options.loadder.loadder_type = options.loadder.loadder_type || 'none';
            options.loadder.loadder_version = options.loadder.loadder_version || '';
        }

        console.log('✓ Loader validado:', JSON.stringify(options.loadder));

        // VALIDACIÓN DE AUTENTICADOR
        console.log('Validando estructura del autenticador...');
        
        const authName = authenticator.name 
            || authenticator.username 
            || authenticator.displayName
            || authenticator.profile?.name 
            || 'Unknown';
            
        const authUUID = authenticator.uuid 
            || authenticator.id 
            || authenticator.profile?.id 
            || '';

        console.log('Auth Name:', authName);
        console.log('Auth UUID:', authUUID);

        if (authName === 'Unknown') {
            console.error('❌ No se pudo determinar el nombre de usuario');
            throw new Error('La cuenta no tiene un nombre de usuario válido');
        }

        // Normalizar authenticator
        authenticator = {
            ...authenticator,
            name: authName,
            uuid: authUUID
        };

        let playInstanceBTN = document.querySelector('.play-instance');
        let infoStartingBOX = document.querySelector('.info-starting-game');
        let infoStarting = document.querySelector(".info-starting-game-text");
        let progressBar = document.querySelector('.progress-bar');

        // CONSTRUCCIÓN DE OPCIONES DE LANZAMIENTO
        console.log('Construyendo opciones de lanzamiento...');
        
        const appDataPath = await appdata();
        const dataDir = process.platform == 'darwin' 
            ? this.config.dataDirectory 
            : `.${this.config.dataDirectory}`;
        
        let opt = {
            url: options.url,
            authenticator: authenticator,
            timeout: 10000,
            path: `${appDataPath}/${dataDir}`,
            instance: options.name,
            version: options.loadder.minecraft_version,
            detached: configClient.launcher_config.closeLauncher !== "close-all",
            downloadFileMultiple: configClient.launcher_config.download_multi || 5,
            intelEnabledMac: configClient.launcher_config.intelEnabledMac !== false,

            loader: {
                type: options.loadder.loadder_type || 'none',
                build: options.loadder.loadder_version || '',
                enable: options.loadder.loadder_type !== 'none'
            },

            verify: options.verify !== false,
            ignored: Array.isArray(options.ignored) ? [...options.ignored] : [],

            java: {
                path: configClient.java_config?.java_path || null,
            },

            JVM_ARGS: Array.isArray(options.jvm_args) ? options.jvm_args : [],
            GAME_ARGS: Array.isArray(options.game_args) ? options.game_args : [],

            screen: {
                width: configClient.game_config?.screen_size?.width || 854,
                height: configClient.game_config?.screen_size?.height || 480
            },

            memory: {
                min: `${(configClient.java_config?.java_memory?.min || 2) * 1024}M`,
                max: `${(configClient.java_config?.java_memory?.max || 4) * 1024}M`
            }
        };

        console.log('✓ Opciones de lanzamiento construidas');
        console.log('Versión Minecraft:', opt.version);
        console.log('Loader:', opt.loader);
        console.log('Path:', opt.path);

        // VALIDACIÓN FINAL
        if (!opt.url) {
            throw new Error('❌ URL de la instancia no definida');
        }

        if (!opt.version) {
            throw new Error('❌ Versión de Minecraft no definida');
        }

        // INTENTAR LANZAMIENTO
        console.log('🚀 Iniciando lanzamiento...');
        
        if (!launch || typeof launch.Launch !== 'function') {
            throw new Error('❌ La API del launcher no está disponible (falta Launch.Launch)');
        }

        launch.Launch(opt);
        console.log('✓ Launch.Launch() ejecutado sin errores');

        // CONFIGURACIÓN DE UI
        this.hidePlayButton();

        if (infoStartingBOX) infoStartingBOX.style.display = "block";
        if (progressBar) progressBar.style.display = "block";

        // Crear elementos de UI si no existen
        if (!document.querySelector('.download-stats') && infoStartingBOX) {
            const downloadStats = document.createElement('div');
            downloadStats.classList.add('download-stats');
            downloadStats.innerHTML = `<div class="download-speed">0 MB/s</div><div class="download-eta">...</div>`;
            infoStartingBOX.insertBefore(downloadStats, progressBar);

            const percentageDisplay = document.createElement('div');
            percentageDisplay.classList.add('progress-percentage');
            percentageDisplay.textContent = '0%';

            const progressContainer = document.createElement('div');
            progressContainer.classList.add('progress-container');
            progressContainer.appendChild(progressBar);
            progressContainer.appendChild(percentageDisplay);

            infoStartingBOX.replaceChild(progressContainer, progressBar);

            const loadingAnimation = document.createElement('div');
            loadingAnimation.classList.add('loading-animation');
            loadingAnimation.innerHTML = '<span class="loading-dots"></span>';
            infoStartingBOX.appendChild(loadingAnimation);
        }

        const downloadSpeed = document.querySelector('.download-speed');
        const downloadETA = document.querySelector('.download-eta');
        const percentageDisplay = document.querySelector('.progress-percentage');
        const loadingAnimation = document.querySelector('.loading-animation');

        ipcRenderer.send('main-window-progress-load');

        // EVENT LISTENERS
        launch.on('extract', extract => {
            console.log('📦 Extrayendo archivos...');
            ipcRenderer.send('main-window-progress-load');
            if (infoStarting) infoStarting.innerHTML = `Extrayendo archivos`;
            if (percentageDisplay) percentageDisplay.textContent = 'Preparando...';
        });

        let lastProgressUpdate = Date.now();
        let lastBytesLoaded = 0;
        let averageSpeed = 0;
        let speedSamples = [];

        const calculateAverageSpeed = (newSpeed) => {
            speedSamples.push(newSpeed);
            if (speedSamples.length > 5) speedSamples.shift();
            return speedSamples.reduce((a, b) => a + b, 0) / speedSamples.length;
        };

        const formatTime = (seconds) => {
            if (seconds < 60) return `${Math.floor(seconds)}s`;
            if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
            return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
        };

        launch.on('progress', (progress, size) => {
            if (!isNaN(progress) && isFinite(progress) && !isNaN(size) && isFinite(size) && size > 0) {
                const now = Date.now();
                const elapsedSinceLastUpdate = (now - lastProgressUpdate) / 1000;
                
                if (elapsedSinceLastUpdate > 0.5) {
                    const bytesLoaded = progress - lastBytesLoaded;
                    const instantSpeed = bytesLoaded / elapsedSinceLastUpdate;
                    
                    if (instantSpeed > 0) {
                        averageSpeed = calculateAverageSpeed(instantSpeed);
                        const speedMBps = (averageSpeed / 1048576).toFixed(2);
                        if (downloadSpeed) downloadSpeed.textContent = `${speedMBps} MB/s`;
                        
                        const remaining = size - progress;
                        const eta = remaining / averageSpeed;
                        
                        if (eta > 0 && eta < 100000 && downloadETA) {
                            downloadETA.textContent = `Tiempo restante: ${formatTime(eta)}`;
                        }
                    }
                    
                    lastProgressUpdate = now;
                    lastBytesLoaded = progress;
                }
                
                const percent = ((progress / size) * 100).toFixed(0);
                if (infoStarting) infoStarting.innerHTML = `Descargando archivos`;
                if (percentageDisplay) percentageDisplay.textContent = `${percent}%`;
                
                ipcRenderer.send('main-window-progress', { progress, size });
                
                if (progressBar) {
                    progressBar.value = progress;
                    progressBar.max = size;
                }
            }
            
            if (this.rpc) this.rpc.updateDownloadProgress(progress, size);
        });

        launch.on('check', (progress, size) => {
            console.log('✅ Verificando archivos...');
            if (infoStarting) infoStarting.innerHTML = `Verificando archivos`;
            
            const percent = ((progress / size) * 100).toFixed(0);
            if (percentageDisplay) percentageDisplay.textContent = `${percent}%`;
            
            ipcRenderer.send('main-window-progress', { progress, size });
            
            if (progressBar) {
                progressBar.value = progress;
                progressBar.max = size;
            }
            
            if (downloadSpeed) downloadSpeed.textContent = 'Verificando...';
            if (downloadETA) downloadETA.textContent = '';
        });

        launch.on('patch', patch => {
            console.log('🔧 Aplicando parches...');
            ipcRenderer.send('main-window-progress-load');

            if (infoStarting) infoStarting.innerHTML = `<span class="game-running">Juego en curso</span>`;
            if (loadingAnimation) loadingAnimation.style.display = "none";
            if (percentageDisplay) percentageDisplay.textContent = 'Iniciando...';
            if (downloadSpeed) downloadSpeed.textContent = '';
            if (downloadETA) downloadETA.textContent = '';
        });

        launch.on('data', (e) => {
            console.log(`[Minecraft] ${e}`);

            if (progressBar) progressBar.style.display = "none";
            if (loadingAnimation) loadingAnimation.style.display = "none";
            if (configClient.launcher_config.closeLauncher == 'close-launcher') {
                ipcRenderer.send("main-window-hide");
            }
            
            new logger('Minecraft', '#36b030');
            ipcRenderer.send('main-window-progress-load');
            
            if (infoStarting) infoStarting.innerHTML = `<span class="game-running">Juego en curso</span>`;
            if (this.rpc) this.rpc.updateForInstance(options.name);
        });

        launch.on('close', code => {
            console.log(`🔴 Minecraft cerrado con código: ${code}`);
            this.isGameLaunching = false;

            if (configClient.launcher_config.closeLauncher == 'close-launcher') {
                ipcRenderer.send("main-window-show");
            }
            
            ipcRenderer.send('main-window-progress-reset');
            
            if (infoStartingBOX) infoStartingBOX.style.display = "none";
            
            this.showPlayButton();
            
            if (infoStarting) infoStarting.innerHTML = `Verificación`;
            
            new logger(pkg.name, '#7289da');
            
            if (this.rpc) this.rpc.setDefault();
        });

        launch.on('error', err => {
            console.error("❌ Error del launcher:", err);
            this.isGameLaunching = false;

            let popupError = new popup();
            
            const errorMessage = err.error 
                || err.message 
                || (typeof err === 'string' ? err : JSON.stringify(err));

            popupError.openPopup({
                title: 'Error',
                content: errorMessage,
                color: 'red',
                options: true
            });

            if (configClient.launcher_config.closeLauncher == 'close-launcher') {
                ipcRenderer.send("main-window-show");
            }
            
            ipcRenderer.send('main-window-progress-reset');
            
            if (infoStartingBOX) infoStartingBOX.style.display = "none";
            
            this.showPlayButton();
            
            if (infoStarting) infoStarting.innerHTML = `Verificación`;
            
            new logger(pkg.name, '#7289da');
        });

        console.log('=== startGame completado sin excepciones ===');

    } catch (error) {
        console.error("❌ Excepción fatal en startGame:");
        console.error("Tipo:", error.constructor.name);
        console.error("Mensaje:", error.message);
        console.error("Stack:", error.stack);
        
        this.isGameLaunching = false;
        
        let popupError = new popup();
        popupError.openPopup({
            title: 'Error Fatal',
            content: `${error.message || 'Error desconocido'}<br><br>Revisa la consola para más detalles.`,
            color: 'red',
            options: true
        });
        
        const infoStartingBOX = document.querySelector('.info-starting-game');
        if (infoStartingBOX) infoStartingBOX.style.display = "none";
        
        this.showPlayButton();
        
        throw error;
    }
}