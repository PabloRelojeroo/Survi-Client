/**
 * Utilidades de Seguridad para el Launcher
 * @author Pablo
 * @license CC-BY-NC 4.0
 */

// Clave secreta para HMAC (debe coincidir con el backend)
const HMAC_SECRET = 'f2e1d0c9b8a7z6y5x4w3v2u1t0s9r8q7p6o5n4m3l2k1j0i9h8g7f6e5d4c3b2a1';

class LauncherSecurity {
    /**
     * Genera firma HMAC-SHA256 para una solicitud
     */
    static generateRequestSignature(data) {
        const dataString = JSON.stringify(data);
        return this.hmacSHA256(dataString, HMAC_SECRET);
    }

    /**
     * Implementación de HMAC-SHA256
     */
    static hmacSHA256(message, secret) {
        // Usar la API Web Crypto si está disponible
        if (typeof crypto !== 'undefined' && crypto.subtle) {
            return this.hmacSHA256Async(message, secret);
        }

        // Fallback a implementación síncrona simple
        return this.hmacSHA256Sync(message, secret);
    }

    /**
     * HMAC-SHA256 asíncrono usando Web Crypto API
     */
    static async hmacSHA256Async(message, secret) {
        const encoder = new TextEncoder();
        const keyData = encoder.encode(secret);
        const messageData = encoder.encode(message);

        const key = await crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );

        const signature = await crypto.subtle.sign('HMAC', key, messageData);
        return Array.from(new Uint8Array(signature))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    /**
     * HMAC-SHA256 síncrono (fallback simple)
     * Nota: Para producción, considerar usar una librería como crypto-js
     */
    static hmacSHA256Sync(message, secret) {
        // Esta es una implementación simplificada
        // En producción, usar crypto-js o similar
        const crypto = require('crypto');
        return crypto.createHmac('sha256', secret).update(message).digest('hex');
    }

    /**
     * Genera timestamp actual
     */
    static getTimestamp() {
        return Math.floor(Date.now() / 1000);
    }

    /**
     * Genera ID aleatorio seguro
     */
    static generateRandomId(length = 32) {
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Valida que una respuesta del servidor sea reciente
     */
    static validateResponseTimestamp(serverTimestamp, maxAge = 300) {
        const now = this.getTimestamp();
        const diff = Math.abs(now - serverTimestamp);
        return diff <= maxAge;
    }
}

export default LauncherSecurity;
