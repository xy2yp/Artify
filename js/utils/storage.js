/**
 * LocalStorage utilities
 */

/**
 * Gets an item from localStorage
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value if key doesn't exist
 * @returns {*} Parsed value or default
 */
export function getItem(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        if (item === null) return defaultValue;
        return JSON.parse(item);
    } catch (error) {
        console.error(`[Storage] Error reading ${key}:`, error);
        return defaultValue;
    }
}

/**
 * Sets an item in localStorage
 * @param {string} key - Storage key
 * @param {*} value - Value to store (will be JSON stringified)
 * @returns {boolean} Success status
 */
export function setItem(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error(`[Storage] Error writing ${key}:`, error);
        return false;
    }
}

/**
 * Removes an item from localStorage
 * @param {string} key - Storage key
 * @returns {boolean} Success status
 */
export function removeItem(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error(`[Storage] Error removing ${key}:`, error);
        return false;
    }
}

/**
 * Clears all items from localStorage
 * @returns {boolean} Success status
 */
export function clear() {
    try {
        localStorage.clear();
        return true;
    } catch (error) {
        console.error('[Storage] Error clearing storage:', error);
        return false;
    }
}

/**
 * Gets all keys from localStorage
 * @returns {string[]} Array of keys
 */
export function getAllKeys() {
    try {
        return Object.keys(localStorage);
    } catch (error) {
        console.error('[Storage] Error getting keys:', error);
        return [];
    }
}

/**
 * Checks if a key exists in localStorage
 * @param {string} key - Storage key
 * @returns {boolean}
 */
export function hasItem(key) {
    return localStorage.getItem(key) !== null;
}
