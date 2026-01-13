/**
 * Theme management
 * Handles light/dark theme switching
 */

import { getItem, setItem } from '../utils/storage.js';
import eventBus, { EVENTS } from '../core/eventBus.js';

/**
 * Theme constants
 */
const THEME_KEY = 'theme';
const THEMES = {
    LIGHT: 'light',
    DARK: 'dark'
};

/**
 * Theme manager
 */
export const theme = {
    /**
     * Initializes theme system
     * Applies saved theme or defaults to light
     */
    init() {
        const savedTheme = this.getTheme();
        this.apply(savedTheme);
        console.log('[Theme] Initialized:', savedTheme);
    },

    /**
     * Gets current theme
     * @returns {string} Current theme ('light' or 'dark')
     */
    getTheme() {
        return getItem(THEME_KEY, THEMES.LIGHT);
    },

    /**
     * Sets and applies a theme
     * @param {string} themeName - Theme name ('light' or 'dark')
     */
    setTheme(themeName) {
        if (!Object.values(THEMES).includes(themeName)) {
            console.error('[Theme] Invalid theme:', themeName);
            return;
        }

        this.apply(themeName);
        setItem(THEME_KEY, themeName);

        // Emit event
        eventBus.emit(EVENTS.THEME_CHANGED, { theme: themeName });

        console.log('[Theme] Changed to:', themeName);
    },

    /**
     * Toggles between light and dark theme
     * @returns {string} New theme
     */
    toggle() {
        const currentTheme = this.getTheme();
        const newTheme = currentTheme === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT;
        this.setTheme(newTheme);
        return newTheme;
    },

    /**
     * Applies a theme to the document
     * @param {string} themeName - Theme name
     */
    apply(themeName) {
        document.documentElement.setAttribute('data-theme', themeName);
    },

    /**
     * Checks if current theme is dark
     * @returns {boolean} True if dark theme is active
     */
    isDark() {
        return this.getTheme() === THEMES.DARK;
    },

    /**
     * Checks if current theme is light
     * @returns {boolean} True if light theme is active
     */
    isLight() {
        return this.getTheme() === THEMES.LIGHT;
    },

    /**
     * Gets system preferred theme
     * @returns {string} System preferred theme ('light' or 'dark')
     */
    getSystemPreference() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return THEMES.DARK;
        }
        return THEMES.LIGHT;
    },

    /**
     * Applies system preferred theme
     */
    applySystemPreference() {
        const systemTheme = this.getSystemPreference();
        this.setTheme(systemTheme);
    },

    /**
     * Watches for system theme changes
     * @param {Function} callback - Callback function when system theme changes
     * @returns {Function} Unsubscribe function
     */
    watchSystemPreference(callback) {
        if (!window.matchMedia) return () => {};

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = (e) => {
            const newTheme = e.matches ? THEMES.DARK : THEMES.LIGHT;
            callback(newTheme);
        };

        // Modern API
        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handler);
            return () => mediaQuery.removeEventListener('change', handler);
        }
        // Legacy API
        else if (mediaQuery.addListener) {
            mediaQuery.addListener(handler);
            return () => mediaQuery.removeListener(handler);
        }

        return () => {};
    }
};

// Export theme constants
export { THEMES };

// Export as default
export default theme;
