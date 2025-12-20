/**
 * @author Pablo
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0
 * 
 * Módulo de seguridad para el launcher
 */

const crypto = require('crypto');

class SecurityManager {
    constructor() {
        this.SECRET_KEY = process.env.LAUNCHER_SECRET || 'f2e1d0c9b8a7z6y5x4w3v2u1t0s9r8q7p6o5n4m3l2k1j0i9h8g7f6e5d4c3b2a1';
        this.CODE_EXPIRY_TIME = 30 * 24 * 60 * 60 * 1000; // 30 días
    }

    /**
     * Sanitiza entrada de usuario para prevenir inyecciones
     */
    sanitizeInput(input) {
        if (typeof input !== 'string') return '';

        return input
            .trim()
            .replace(/[<>'"]/g, '') // Remover caracteres peligrosos
            .substring(0, 64); // Limitar longitud
    }

    /**
     * Valida formato de código de instancia
     */
    isValidCodeFormat(code) {
        if (!code || typeof code !== 'string') return false;

        // Código debe ser hexadecimal de 32-64 caracteres
        const hexRegex = /^[a-fA-F0-9]{32,64}$/;
        return hexRegex.test(code);
    }

    /**
     * Genera código único para una instancia
     */
    generateInstanceCode(instanceName, salt = '') {
        const data = `${instanceName}:${salt}:${this.SECRET_KEY}`;
        return crypto
            .createHash('sha256')
            .update(data)
            .digest('hex');
    }

    /**
     * Genera código temporal con expiración
     */
    generateTemporaryCode(instanceName, expiryDate = null) {
        const expiry = expiryDate || Date.now() + this.CODE_EXPIRY_TIME;
        const data = `${instanceName}:${expiry}:${this.SECRET_KEY}`;

        const hash = crypto
            .createHash('sha256')
            .update(data)
            .digest('hex');

        return {
            code: hash,
            expiry: expiry,
            instance: instanceName
        };
    }

    /**
     * Valida un código temporal
     */
    validateTemporaryCode(code, instanceName, expiry) {
        if (!this.isValidCodeFormat(code)) return false;
        if (Date.now() > expiry) return false;

        const expectedCode = this.generateTemporaryCode(instanceName, expiry).code;
        return code === expectedCode;
    }

    /**
     * Encripta datos sensibles
     */
    encrypt(text) {
        try {
            const algorithm = 'aes-256-cbc';
            const key = crypto.scryptSync(this.SECRET_KEY, 'salt', 32);
            const iv = crypto.randomBytes(16);

            const cipher = crypto.createCipheriv(algorithm, key, iv);
            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');

            return iv.toString('hex') + ':' + encrypted;
        } catch (error) {
            console.error('Error encrypting:', error);
            return null;
        }
    }

    /**
     * Desencripta datos
     */
    decrypt(encryptedData) {
        try {
            const algorithm = 'aes-256-cbc';
            const key = crypto.scryptSync(this.SECRET_KEY, 'salt', 32);

            const parts = encryptedData.split(':');
            const iv = Buffer.from(parts[0], 'hex');
            const encrypted = parts[1];

            const decipher = crypto.createDecipheriv(algorithm, key, iv);
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (error) {
            console.error('Error decrypting:', error);
            return null;
        }
    }

    /**
     * Valida ruta de archivo para prevenir path traversal
     */
    isValidFilePath(filepath) {
        if (!filepath || typeof filepath !== 'string') return false;

        // No permitir navegación de directorios
        if (filepath.includes('..') || filepath.includes('~')) return false;

        // No permitir rutas absolutas
        if (filepath.startsWith('/') || filepath.match(/^[a-zA-Z]:\\/)) return false;

        return true;
    }

    /**
     * Valida URL para prevenir SSRF
     */
    isValidUrl(url) {
        if (!url || typeof url !== 'string') return false;

        try {
            const parsed = new URL(url);

            // Solo permitir HTTP/HTTPS
            if (!['http:', 'https:'].includes(parsed.protocol)) return false;

            // No permitir localhost o IPs privadas
            const hostname = parsed.hostname.toLowerCase();
            if (
                hostname === 'localhost' ||
                hostname === '127.0.0.1' ||
                hostname.startsWith('192.168.') ||
                hostname.startsWith('10.') ||
                hostname.startsWith('172.')
            ) {
                return false;
            }

            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Genera hash seguro de password
     */
    hashPassword(password) {
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto
            .pbkdf2Sync(password, salt, 10000, 64, 'sha512')
            .toString('hex');

        return `${salt}:${hash}`;
    }

    /**
     * Verifica password contra hash
     */
    verifyPassword(password, storedHash) {
        try {
            const [salt, hash] = storedHash.split(':');
            const verifyHash = crypto
                .pbkdf2Sync(password, salt, 10000, 64, 'sha512')
                .toString('hex');

            return hash === verifyHash;
        } catch (error) {
            return false;
        }
    }

    /**
     * Rate limiting simple
     */
    createRateLimiter(maxAttempts = 5, windowMs = 60000) {
        const attempts = new Map();

        return (identifier) => {
            const now = Date.now();
            const userAttempts = attempts.get(identifier) || { count: 0, resetTime: now + windowMs };

            if (now > userAttempts.resetTime) {
                userAttempts.count = 0;
                userAttempts.resetTime = now + windowMs;
            }

            userAttempts.count++;
            attempts.set(identifier, userAttempts);

            if (userAttempts.count > maxAttempts) {
                const waitTime = Math.ceil((userAttempts.resetTime - now) / 1000);
                return {
                    allowed: false,
                    retryAfter: waitTime
                };
            }

            return {
                allowed: true,
                remaining: maxAttempts - userAttempts.count
            };
        };
    }

    /**
     * Valida nombre de usuario
     */
    isValidUsername(username) {
        if (!username || typeof username !== 'string') return false;

        // 3-16 caracteres, solo letras, números y guiones bajos
        const usernameRegex = /^[a-zA-Z0-9_]{3,16}$/;
        return usernameRegex.test(username);
    }

    /**
     * Limpia HTML para prevenir XSS
     */
    sanitizeHtml(html) {
        if (!html || typeof html !== 'string') return '';

        return html
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    }

    /**
     * Genera token aleatorio seguro
     */
    generateSecureToken(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }

    /**
     * Verifica integridad de archivos
     */
    async verifyFileIntegrity(filepath, expectedHash) {
        try {
            const fs = require('fs').promises;
            const fileBuffer = await fs.readFile(filepath);
            const hash = crypto
                .createHash('sha256')
                .update(fileBuffer)
                .digest('hex');

            return hash === expectedHash;
        } catch (error) {
            console.error('Error verifying file integrity:', error);
            return false;
        }
    }
}

// Rate limiter para códigos de instancia
const codeRateLimiter = new SecurityManager().createRateLimiter(3, 300000); // 3 intentos por 5 minutos

module.exports = {
    SecurityManager,
    codeRateLimiter
};