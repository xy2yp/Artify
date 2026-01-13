/**
 * Toast notification system
 * Displays temporary notification messages
 */

import { TOAST_DURATION } from '../config/constants.js';
import eventBus, { EVENTS } from '../core/eventBus.js';

/**
 * Toast element reference
 */
let toastElement = null;
let currentTimeout = null;

/**
 * Toast service
 */
export const toast = {
    /**
     * Initializes toast system
     * Creates toast element if it doesn't exist
     */
    init() {
        if (!toastElement) {
            toastElement = document.getElementById('toast');
            if (!toastElement) {
                // Create toast element
                toastElement = document.createElement('div');
                toastElement.id = 'toast';
                toastElement.className = 'toast-msg';
                toastElement.style.display = 'none';
                document.body.appendChild(toastElement);
            }
        }
    },

    /**
     * Shows a toast message
     * @param {string} message - Message to display
     * @param {string} type - Toast type ('default', 'success', 'error', 'warning', 'info')
     * @param {number} duration - Duration in milliseconds
     */
    show(message, type = 'default', duration = TOAST_DURATION) {
        this.init();

        // Clear existing timeout
        if (currentTimeout) {
            clearTimeout(currentTimeout);
        }

        // Set message and type
        toastElement.textContent = message;
        toastElement.className = 'toast-msg';
        if (type !== 'default') {
            toastElement.classList.add(type);
        }

        // Show toast
        toastElement.style.display = 'block';

        // Emit event
        eventBus.emit(EVENTS.TOAST_SHOW, { message, type, duration });

        // Auto hide after duration
        currentTimeout = setTimeout(() => {
            toastElement.style.display = 'none';
            currentTimeout = null;
        }, duration);

        console.log(`[Toast] ${type}: ${message}`);
    },

    /**
     * Shows a success toast
     * @param {string} message - Success message
     * @param {number} duration - Duration in milliseconds
     */
    success(message, duration = TOAST_DURATION) {
        this.show(message, 'success', duration);
    },

    /**
     * Shows an error toast
     * @param {string} message - Error message
     * @param {number} duration - Duration in milliseconds
     */
    error(message, duration = TOAST_DURATION) {
        this.show(message, 'error', duration);
    },

    /**
     * Shows a warning toast
     * @param {string} message - Warning message
     * @param {number} duration - Duration in milliseconds
     */
    warning(message, duration = TOAST_DURATION) {
        this.show(message, 'warning', duration);
    },

    /**
     * Shows an info toast
     * @param {string} message - Info message
     * @param {number} duration - Duration in milliseconds
     */
    info(message, duration = TOAST_DURATION) {
        this.show(message, 'info', duration);
    },

    /**
     * Hides the current toast immediately
     */
    hide() {
        if (currentTimeout) {
            clearTimeout(currentTimeout);
            currentTimeout = null;
        }

        if (toastElement) {
            toastElement.style.display = 'none';
        }
    }
};

// Export as default
export default toast;
