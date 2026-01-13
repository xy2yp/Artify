/**
 * Global state management module
 * Provides reactive state management for the application
 */

/**
 * Global application state
 */
const state = {
    // Authentication
    isAuthenticated: false,

    // Current session
    currentSessionId: null,

    // Chat state
    images: [], // Array of {base64, mimeType, preview}
    resolution: '2K',
    aspectRatio: '16:9',
    streaming: false, // Disabled by default - SSE not fully implemented

    // UI state
    activeModule: 'chat', // 'chat', 'xhs', 'slicer', 'banana', 'settings'
    sidebarCollapsed: false,
    theme: 'light', // 'light' or 'dark'

    // Loading state
    isGenerating: false,
    loadingText: '',

    // XHS state
    xhsCurrentId: null,

    // Providers
    selectedProviderId: null,
    providers: []
};

/**
 * State change listeners
 */
const listeners = new Map();

/**
 * State management API
 */
export const stateManager = {
    /**
     * Gets the entire state object
     * @returns {Object} Current state
     */
    getState() {
        return { ...state };
    },

    /**
     * Gets a specific state property
     * @param {string} key - Property key
     * @returns {any} Property value
     */
    get(key) {
        return state[key];
    },

    /**
     * Sets a state property and notifies listeners
     * @param {string} key - Property key
     * @param {any} value - New value
     */
    set(key, value) {
        const oldValue = state[key];
        state[key] = value;

        // Notify listeners
        this._notify(key, value, oldValue);

        // Also notify wildcard listeners
        this._notify('*', { key, value, oldValue });
    },

    /**
     * Updates multiple state properties at once
     * @param {Object} updates - Object with key-value pairs
     */
    update(updates) {
        Object.entries(updates).forEach(([key, value]) => {
            this.set(key, value);
        });
    },

    /**
     * Subscribes to state changes
     * @param {string} key - Property key to watch ('*' for all changes)
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    subscribe(key, callback) {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }

        if (!listeners.has(key)) {
            listeners.set(key, new Set());
        }

        listeners.get(key).add(callback);

        // Return unsubscribe function
        return () => {
            const keyListeners = listeners.get(key);
            if (keyListeners) {
                keyListeners.delete(callback);
                if (keyListeners.size === 0) {
                    listeners.delete(key);
                }
            }
        };
    },

    /**
     * Resets state to initial values
     */
    reset() {
        state.currentSessionId = null;
        state.images = [];
        state.resolution = '2K';
        state.aspectRatio = '16:9';
        state.streaming = false; // Disabled by default
        state.isGenerating = false;
        state.loadingText = '';
        state.xhsCurrentId = null;
        state.selectedProviderId = null;

        console.log('[State] State reset');
    },

    /**
     * Notifies listeners of state changes
     * @private
     * @param {string} key - Property key
     * @param {any} value - New value
     * @param {any} oldValue - Old value
     */
    _notify(key, value, oldValue) {
        const keyListeners = listeners.get(key);
        if (keyListeners) {
            keyListeners.forEach(callback => {
                try {
                    callback(value, oldValue);
                } catch (error) {
                    console.error(`[State] Error in listener for ${key}:`, error);
                }
            });
        }
    }
};

// Export state object for direct access (read-only recommended)
export { state };

// Export as default
export default stateManager;
