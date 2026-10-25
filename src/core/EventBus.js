/**
 * @fileoverview Bus de eventos Pub/Sub ligero y síncrono para desacoplar subsistemas.
 * Capa 1: Sin dependencias externas.
 */

export class EventBus {
    constructor() {
        /** @type {Map<string, Set<Function>>} */
        this.listeners = new Map();
    }

    /**
     * Suscribe un callback a un evento.
     * @param {string} eventName
     * @param {Function} callback
     * @returns {Function} Función para cancelar la suscripción.
     */
    on(eventName, callback) {
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, new Set());
        }
        this.listeners.get(eventName).add(callback);
        return () => this.off(eventName, callback);
    }

    /**
     * Suscribe un callback que se ejecutará una única vez.
     * @param {string} eventName
     * @param {Function} callback
     */
    once(eventName, callback) {
        const wrapper = (payload) => {
            this.off(eventName, wrapper);
            callback(payload);
        };
        this.on(eventName, wrapper);
    }

    /**
     * Elimina un callback de un evento.
     * @param {string} eventName
     * @param {Function} callback
     */
    off(eventName, callback) {
        const set = this.listeners.get(eventName);
        if (set) {
            set.delete(callback);
            if (set.size === 0) {
                this.listeners.delete(eventName);
            }
        }
    }

    /**
     * Emite un evento con datos opcionales a todos los suscriptores.
     * @param {string} eventName
     * @param {*} [payload]
     */
    emit(eventName, payload) {
        const set = this.listeners.get(eventName);
        if (!set) return;
        for (const callback of Array.from(set)) {
            try {
                callback(payload);
            } catch (err) {
                console.error(`[EventBus] Error en listener de "${eventName}":`, err);
            }
        }
    }

    /**
     * Limpia todos los listeners registrados.
     */
    clear() {
        this.listeners.clear();
    }
}

export const eventBus = new EventBus();
