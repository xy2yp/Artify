/**
 * Authentication management module
 * Handles JWT token storage, login, logout, and verification
 */

import { API_BASE_URL, ENDPOINTS, TOKEN_KEY } from '../config/constants.js';
import { getItem, setItem, removeItem } from '../utils/storage.js';

/**
 * Authentication manager
 */
export const auth = {
    /**
     * Login with username and password
     * @param {string} username - Username
     * @param {string} password - Password
     * @returns {Promise<{token: string}>} Token object
     */
    async login(username, password) {
        try {
            const response = await fetch(`${API_BASE_URL}${ENDPOINTS.LOGIN}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Login failed');
            }

            const data = await response.json();

            // Store token
            setItem(TOKEN_KEY, data.token);

            // Trigger auth change event
            this._triggerAuthChange(true);

            console.log('[Auth] Login successful');
            return data;
        } catch (error) {
            console.error('[Auth] Login error:', error);
            throw error;
        }
    },

    /**
     * Logout and clear token
     */
    logout() {
        removeItem(TOKEN_KEY);
        this._triggerAuthChange(false);
        console.log('[Auth] Logged out');
    },

    /**
     * Get stored token
     * @returns {string|null} JWT token
     */
    getToken() {
        return getItem(TOKEN_KEY);
    },

    /**
     * Verify current token with backend
     * @returns {Promise<boolean>} True if token is valid
     */
    async verifyToken() {
        const token = this.getToken();
        if (!token) {
            return false;
        }

        try {
            const response = await fetch(`${API_BASE_URL}${ENDPOINTS.VERIFY}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                // Token is invalid, clear it
                this.logout();
                return false;
            }

            const data = await response.json();
            return data.valid === true;
        } catch (error) {
            console.error('[Auth] Token verification error:', error);
            // On network error, assume token is still valid (offline tolerance)
            return true;
        }
    },

    /**
     * Check if user is authenticated (has token)
     * @returns {boolean}
     */
    isAuthenticated() {
        return this.getToken() !== null;
    },

    /**
     * Get username from JWT token
     * @returns {string|null} Username or null if not logged in
     */
    getUsername() {
        const token = this.getToken();
        if (!token) return null;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.sub || null;
        } catch (e) {
            console.warn('[Auth] Failed to parse username from token');
            return null;
        }
    },

    /**
     * Register callback for authentication state changes
     * @param {Function} callback - Callback function (receives isAuthenticated boolean)
     */
    onAuthChange(callback) {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }

        if (!this._authCallbacks) {
            this._authCallbacks = [];
        }

        this._authCallbacks.push(callback);

        // Return unsubscribe function
        return () => {
            const index = this._authCallbacks.indexOf(callback);
            if (index > -1) {
                this._authCallbacks.splice(index, 1);
            }
        };
    },

    /**
     * Trigger authentication change callbacks
     * @private
     * @param {boolean} isAuthenticated - New authentication state
     */
    _triggerAuthChange(isAuthenticated) {
        if (this._authCallbacks) {
            this._authCallbacks.forEach(callback => {
                try {
                    callback(isAuthenticated);
                } catch (error) {
                    console.error('[Auth] Error in auth change callback:', error);
                }
            });
        }
    }
};

// Export as default for convenience
export default auth;
