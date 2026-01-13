/**
 * Event bus for decoupled inter-module communication
 * Provides publish-subscribe pattern for application-wide events
 */

/**
 * Event listeners storage
 */
const listeners = new Map();

/**
 * Event history for debugging
 */
const eventHistory = [];
const MAX_HISTORY_SIZE = 100;

/**
 * Event bus API
 */
export const eventBus = {
    /**
     * Subscribes to an event
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     * @param {Object} options - Options { once: boolean }
     * @returns {Function} Unsubscribe function
     */
    on(event, callback, options = {}) {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }

        if (!listeners.has(event)) {
            listeners.set(event, new Set());
        }

        const wrappedCallback = options.once ? (...args) => {
            callback(...args);
            this.off(event, wrappedCallback);
        } : callback;

        // Store original callback reference for unsubscribe
        wrappedCallback._original = callback;

        listeners.get(event).add(wrappedCallback);

        console.log(`[EventBus] Subscribed to "${event}"`);

        // Return unsubscribe function
        return () => this.off(event, callback);
    },

    /**
     * Subscribes to an event (fires only once)
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    once(event, callback) {
        return this.on(event, callback, { once: true });
    },

    /**
     * Unsubscribes from an event
     * @param {string} event - Event name
     * @param {Function} callback - Callback function to remove
     */
    off(event, callback) {
        const eventListeners = listeners.get(event);
        if (!eventListeners) return;

        // Find and remove callback (handle wrapped callbacks)
        for (const listener of eventListeners) {
            if (listener === callback || listener._original === callback) {
                eventListeners.delete(listener);
                console.log(`[EventBus] Unsubscribed from "${event}"`);
                break;
            }
        }

        // Clean up empty listener sets
        if (eventListeners.size === 0) {
            listeners.delete(event);
        }
    },

    /**
     * Publishes an event
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    emit(event, data) {
        console.log(`[EventBus] Emitting "${event}"`, data);

        // Record in history
        this._recordEvent(event, data);

        // Emit to specific event listeners
        const eventListeners = listeners.get(event);
        if (eventListeners) {
            eventListeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`[EventBus] Error in listener for "${event}":`, error);
                }
            });
        }

        // Emit to wildcard listeners
        const wildcardListeners = listeners.get('*');
        if (wildcardListeners) {
            wildcardListeners.forEach(callback => {
                try {
                    callback({ event, data });
                } catch (error) {
                    console.error(`[EventBus] Error in wildcard listener:`, error);
                }
            });
        }
    },

    /**
     * Removes all listeners for an event, or all events if no event specified
     * @param {string} event - Event name (optional)
     */
    clear(event) {
        if (event) {
            listeners.delete(event);
            console.log(`[EventBus] Cleared listeners for "${event}"`);
        } else {
            listeners.clear();
            console.log('[EventBus] Cleared all listeners');
        }
    },

    /**
     * Gets all registered event names
     * @returns {string[]} Array of event names
     */
    getEvents() {
        return Array.from(listeners.keys());
    },

    /**
     * Gets listener count for an event
     * @param {string} event - Event name
     * @returns {number} Number of listeners
     */
    listenerCount(event) {
        const eventListeners = listeners.get(event);
        return eventListeners ? eventListeners.size : 0;
    },

    /**
     * Gets event history (for debugging)
     * @param {number} count - Number of recent events to return
     * @returns {Array} Recent events
     */
    getHistory(count = 10) {
        return eventHistory.slice(-count);
    },

    /**
     * Records event in history
     * @private
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    _recordEvent(event, data) {
        eventHistory.push({
            event,
            data,
            timestamp: Date.now()
        });

        // Keep history size limited
        if (eventHistory.length > MAX_HISTORY_SIZE) {
            eventHistory.shift();
        }
    }
};

// Predefined event constants for type safety
export const EVENTS = {
    // Authentication events
    AUTH_LOGIN: 'auth:login',
    AUTH_LOGOUT: 'auth:logout',
    AUTH_TOKEN_EXPIRED: 'auth:tokenExpired',

    // Session events
    SESSION_CREATED: 'session:created',
    SESSION_LOADED: 'session:loaded',
    SESSION_DELETED: 'session:deleted',

    // Message events
    MESSAGE_SENT: 'message:sent',
    MESSAGE_RECEIVED: 'message:received',
    MESSAGE_ERROR: 'message:error',

    // Generation events
    GENERATION_START: 'generation:start',
    GENERATION_PROGRESS: 'generation:progress',
    GENERATION_COMPLETE: 'generation:complete',
    GENERATION_ERROR: 'generation:error',

    // Provider events
    PROVIDER_CREATED: 'provider:created',
    PROVIDER_UPDATED: 'provider:updated',
    PROVIDER_DELETED: 'provider:deleted',
    PROVIDER_SELECTED: 'provider:selected',

    // XHS Provider events
    XHS_PROVIDER_CREATED: 'xhsProvider:created',
    XHS_PROVIDER_UPDATED: 'xhsProvider:updated',
    XHS_PROVIDER_DELETED: 'xhsProvider:deleted',
    XHS_PROVIDER_SELECTED: 'xhsProvider:selected',

    // Module events
    MODULE_CHANGED: 'module:changed',

    // Theme events
    THEME_CHANGED: 'theme:changed',

    // UI events
    SIDEBAR_TOGGLED: 'sidebar:toggled',
    TOAST_SHOW: 'toast:show',
    LOADING_START: 'loading:start',
    LOADING_END: 'loading:end'
};

// Export as default
export default eventBus;
