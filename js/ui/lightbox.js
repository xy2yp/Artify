/**
 * Lightbox for image preview
 * Displays images in a full-screen overlay
 */

/**
 * Lightbox elements
 */
let lightboxElement = null;
let lightboxImage = null;
let lightboxClose = null;

/**
 * Lightbox manager
 */
export const lightbox = {
    /**
     * Initializes lightbox
     * Gets or creates lightbox elements
     */
    init() {
        if (!lightboxElement) {
            lightboxElement = document.getElementById('lightbox');
            lightboxImage = document.getElementById('lightbox-img');
            lightboxClose = document.querySelector('.lightbox-close');

            // Create lightbox if it doesn't exist
            if (!lightboxElement) {
                this._createLightbox();
            }

            // Bind close events
            if (lightboxElement) {
                lightboxElement.addEventListener('click', (e) => {
                    if (e.target === lightboxElement) {
                        this.close();
                    }
                });
            }

            if (lightboxClose) {
                lightboxClose.addEventListener('click', () => this.close());
            }

            // Close on Escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isOpen()) {
                    this.close();
                }
            });
        }
    },

    /**
     * Opens lightbox with an image
     * @param {string} src - Image source URL
     */
    open(src) {
        this.init();

        if (lightboxImage) {
            lightboxImage.src = src;
        }
        if (lightboxElement) {
            lightboxElement.classList.add('active');
        }

        // Prevent body scroll
        document.body.style.overflow = 'hidden';

        console.log('[Lightbox] Opened');
    },

    /**
     * Closes lightbox
     */
    close() {
        if (lightboxElement) {
            lightboxElement.classList.remove('active');
        }

        // Restore body scroll
        document.body.style.overflow = '';

        // Clear image after animation
        setTimeout(() => {
            if (lightboxImage) {
                lightboxImage.src = '';
            }
        }, 200);

        console.log('[Lightbox] Closed');
    },

    /**
     * Checks if lightbox is open
     * @returns {boolean} True if lightbox is open
     */
    isOpen() {
        return lightboxElement?.classList.contains('active');
    },

    /**
     * Creates lightbox elements
     * @private
     */
    _createLightbox() {
        const container = document.createElement('div');
        container.id = 'lightbox';
        container.className = 'lightbox';
        container.innerHTML = `
            <span class="lightbox-close">&times;</span>
            <img id="lightbox-img" class="lightbox-content" alt="Preview" />
        `;

        document.body.appendChild(container);

        lightboxElement = container;
        lightboxImage = container.querySelector('#lightbox-img');
        lightboxClose = container.querySelector('.lightbox-close');
    },

    /**
     * Adds lightbox functionality to all images with a specific selector
     * @param {string} selector - CSS selector for images (default: '.generated-image')
     */
    attachToImages(selector = '.generated-image') {
        document.querySelectorAll(selector).forEach(img => {
            img.style.cursor = 'pointer';
            img.onclick = () => this.open(img.src);
        });
    }
};

// Export as default
export default lightbox;
