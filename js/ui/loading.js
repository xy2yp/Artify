/**
 * Loading overlay and progress bar management
 * Displays loading indicators for async operations
 */

import eventBus, { EVENTS } from '../core/eventBus.js';

/**
 * Loading elements
 */
let loadingElement = null;
let loadingTextElement = null;
let progressBarContainer = null;
let progressBar = null;

/**
 * Loading manager
 */
export const loading = {
    /**
     * Initializes loading system
     * Gets references to loading elements
     */
    init() {
        if (!loadingElement) {
            loadingElement = document.getElementById('global-loading');
            loadingTextElement = document.getElementById('global-loading-text');
            progressBarContainer = document.getElementById('progress-bar-container');
            progressBar = document.getElementById('progress-bar');

            // Create elements if they don't exist
            if (!loadingElement) {
                loadingElement = this._createLoadingOverlay();
            }
            if (!progressBarContainer) {
                const elements = this._createProgressBar();
                progressBarContainer = elements.container;
                progressBar = elements.bar;
            }
        }
    },

    /**
     * Shows loading overlay
     * @param {string} text - Loading text
     */
    show(text = '加载中...') {
        this.init();

        if (loadingTextElement) {
            loadingTextElement.textContent = text;
        }
        if (loadingElement) {
            loadingElement.classList.add('active');
        }

        // Emit event
        eventBus.emit(EVENTS.LOADING_START, { text });

        console.log('[Loading] Show:', text);
    },

    /**
     * Hides loading overlay
     */
    hide() {
        if (loadingElement) {
            loadingElement.classList.remove('active');
        }

        // Emit event
        eventBus.emit(EVENTS.LOADING_END);

        console.log('[Loading] Hide');
    },

    /**
     * Updates loading text
     * @param {string} text - New loading text
     */
    updateText(text) {
        if (loadingTextElement) {
            loadingTextElement.textContent = text;
        }
    },

    /**
     * Progress bar methods
     */
    progress: {
        /**
         * Shows progress bar
         */
        show() {
            if (progressBarContainer) {
                progressBarContainer.style.display = 'block';
            }
        },

        /**
         * Hides progress bar
         */
        hide() {
            if (progressBarContainer) {
                progressBarContainer.style.display = 'none';
            }
            this.reset();
        },

        /**
         * Sets progress percentage
         * @param {number} percent - Progress percentage (0-100)
         */
        set(percent) {
            if (progressBar) {
                progressBar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
            }
        },

        /**
         * Resets progress to 0%
         */
        reset() {
            this.set(0);
        },

        /**
         * Animates progress from current to target
         * @param {number} target - Target percentage
         * @param {number} duration - Animation duration in ms
         */
        animate(target, duration = 500) {
            if (!progressBar) return;

            const start = parseFloat(progressBar.style.width) || 0;
            const diff = target - start;
            const startTime = Date.now();

            const step = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const current = start + diff * progress;

                this.set(current);

                if (progress < 1) {
                    requestAnimationFrame(step);
                }
            };

            requestAnimationFrame(step);
        }
    },

    /**
     * Creates loading overlay element
     * @private
     * @returns {HTMLElement} Loading overlay element
     */
    _createLoadingOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'global-loading';
        overlay.className = 'global-loading';
        overlay.innerHTML = `
            <div class="global-loading-spinner"></div>
            <div class="global-loading-text" id="global-loading-text">加载中...</div>
        `;
        document.body.appendChild(overlay);

        loadingTextElement = overlay.querySelector('#global-loading-text');

        return overlay;
    },

    /**
     * Creates progress bar element
     * @private
     * @returns {{container: HTMLElement, bar: HTMLElement}} Progress bar elements
     */
    _createProgressBar() {
        const container = document.createElement('div');
        container.id = 'progress-bar-container';
        container.className = 'progress-bar-container';
        container.style.display = 'none';

        const bar = document.createElement('div');
        bar.id = 'progress-bar';
        bar.className = 'progress-bar';
        bar.style.width = '0%';

        container.appendChild(bar);
        document.body.appendChild(container);

        return { container, bar };
    }
};

// Export as default
export default loading;
