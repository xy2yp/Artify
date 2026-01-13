/**
 * Main Application Entry Point
 * Initializes all modules and coordinates the application
 */

// Import core modules
import auth from './core/auth.js';
import stateManager from './core/state.js';
import eventBus, { EVENTS } from './core/eventBus.js';

// Import UI tools
import toast from './ui/toast.js';
import loading from './ui/loading.js';
import theme from './ui/theme.js';
import lightbox from './ui/lightbox.js';

// Import feature modules
import ChatModule from './modules/chat/ChatModule.js';
import SettingsModule from './modules/settings/SettingsModule.js';
import XHSModule from './modules/xhs/XHSModule.js';
import SlicerModule from './modules/slicer/SlicerModule.js';
import BananaModule from './modules/banana/BananaModule.js';

// Import services for preloading
import bananaService from './services/bananaService.js';

/**
 * Application instance
 */
class Application {
    constructor() {
        this.modules = {
            chat: null,
            settings: null,
            xhs: null,
            slicer: null,
            banana: null
        };

        this.initialized = false;
    }

    /**
     * Initializes the application
     */
    async init() {
        if (this.initialized) {
            console.warn('[App] Already initialized');
            return;
        }

        console.log('[App] Initializing application...');

        try {
            // 1. Initialize theme (before loading overlay)
            theme.init();

            // 2. Initialize UI tools
            toast.init();
            lightbox.init();

            // 3. Initialize modules
            this.modules.settings = new SettingsModule();
            this.modules.chat = new ChatModule();
            this.modules.xhs = new XHSModule();
            this.modules.slicer = new SlicerModule();
            this.modules.banana = new BananaModule();

            await this.modules.settings.init(); // Initialize settings first (handles auth)
            await this.modules.chat.init();
            await this.modules.xhs.init();
            this.modules.slicer.init();
            this.modules.banana.init();

            // 4. Setup global event listeners
            this._setupGlobalEvents();

            // 5. Setup navigation and UI controls
            this._setupNavigation();
            this._setupSidebarControls();

            // 6. Expose to window for compatibility
            this._exposeToWindow();

            this.initialized = true;

            // 7. Preload data in background (non-blocking)
            this._preloadData();

            console.log('[App] Application initialized successfully');

        } catch (error) {
            console.error('[App] Initialization error:', error);
            toast.error('初始化失败: ' + error.message);
        }
    }

    /**
     * Sets up global event listeners
     * @private
     */
    _setupGlobalEvents() {
        // Listen for auth state changes
        eventBus.on(EVENTS.AUTH_LOGIN, () => {
            console.log('[App] User logged in');
            toast.success('登录成功');
        });

        eventBus.on(EVENTS.AUTH_LOGOUT, () => {
            console.log('[App] User logged out');
            toast.info('已退出登录');
        });

        // Listen for theme changes
        eventBus.on(EVENTS.THEME_CHANGED, (data) => {
            console.log('[App] Theme changed to:', data.theme);
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            this._handleResize();
        });

        // Handle visibility change (tab focus)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                console.log('[App] Tab visible');
            }
        });

        // Handle beforeunload (warn if generating)
        window.addEventListener('beforeunload', (e) => {
            const state = stateManager.getState();
            if (state.isGenerating) {
                e.preventDefault();
                e.returnValue = '正在生成中，确定要离开吗？';
                return e.returnValue;
            }
        });
    }

    /**
     * Sets up sidebar open/close controls
     * @private
     */
    _setupSidebarControls() {
        const leftSidebar = document.getElementById('left-sidebar');
        const rightSidebar = document.getElementById('right-sidebar');
        const overlay = document.getElementById('overlay');

        // Mobile menu button (opens left sidebar)
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        mobileMenuBtn?.addEventListener('click', () => {
            this._toggleSidebar('left');
        });

        // Note: Mobile and desktop settings buttons are now handled by SettingsModule
        // to open system settings modal instead of toggling sidebar

        // Desktop new chat button
        const desktopNewChatBtn = document.getElementById('desktop-new-chat-btn');
        desktopNewChatBtn?.addEventListener('click', () => {
            if (!this._requireAuth()) return;
            this.modules.chat?.createNewSession();
        });

        // Overlay click (closes all sidebars)
        overlay?.addEventListener('click', () => {
            this._closeAllSidebars();
        });
    }

    /**
     * Sets up navigation between modules
     * @private
     */
    _setupNavigation() {
        // New chat button in sidebar
        const newChatBtn = document.getElementById('new-chat-btn');
        newChatBtn?.addEventListener('click', () => {
            if (!this._requireAuth()) return;
            this.modules.chat?.createNewSession();
            this._closeAllSidebars(); // Close on mobile
        });

        // XHS button
        const xhsNavBtn = document.getElementById('xhs-nav-btn');
        xhsNavBtn?.addEventListener('click', () => {
            if (!this._requireAuth()) return;
            this.modules.xhs?.open();
            this._closeAllSidebars();
        });

        // Banana button
        const bananaNavBtn = document.getElementById('banana-nav-btn');
        bananaNavBtn?.addEventListener('click', () => {
            if (!this._requireAuth()) return;
            this.modules.banana?.open();
            this._closeAllSidebars();
        });

        // Sticker button (activates sticker mode in chat)
        const stickerNavBtn = document.getElementById('sticker-nav-btn');
        stickerNavBtn?.addEventListener('click', () => {
            if (!this._requireAuth()) return;
            this.modules.chat?.activateStickerMode();
            this._closeAllSidebars();
        });

        // Slicer button
        const slicerNavBtn = document.getElementById('slicer-nav-btn');
        slicerNavBtn?.addEventListener('click', () => {
            if (!this._requireAuth()) return;
            this.modules.slicer?.openLocal();
            this._closeAllSidebars();
        });
    }

    /**
     * Check if user is authenticated, show toast if not
     * @private
     * @returns {boolean} true if authenticated
     */
    _requireAuth() {
        if (!auth.isAuthenticated()) {
            toast.warning('请先登录');
            return false;
        }
        return true;
    }

    /**
     * Toggles a sidebar (left or right)
     * @private
     * @param {string} side - 'left' or 'right'
     */
    _toggleSidebar(side) {
        const leftSidebar = document.getElementById('left-sidebar');
        const rightSidebar = document.getElementById('right-sidebar');
        const overlay = document.getElementById('overlay');

        if (side === 'left') {
            const isOpen = leftSidebar?.classList.contains('open');

            // Close right sidebar
            rightSidebar?.classList.remove('open');

            // Toggle left sidebar
            if (isOpen) {
                leftSidebar?.classList.remove('open');
                overlay?.classList.remove('active');
            } else {
                leftSidebar?.classList.add('open');
                overlay?.classList.add('active');
            }
        } else if (side === 'right') {
            const isOpen = rightSidebar?.classList.contains('open');

            // Close left sidebar
            leftSidebar?.classList.remove('open');

            // Toggle right sidebar
            if (isOpen) {
                rightSidebar?.classList.remove('open');
                overlay?.classList.remove('active');
            } else {
                rightSidebar?.classList.add('open');
                overlay?.classList.add('active');
            }
        }
    }

    /**
     * Closes all sidebars
     * @private
     */
    _closeAllSidebars() {
        const leftSidebar = document.getElementById('left-sidebar');
        const rightSidebar = document.getElementById('right-sidebar');
        const overlay = document.getElementById('overlay');

        leftSidebar?.classList.remove('open');
        rightSidebar?.classList.remove('open');
        overlay?.classList.remove('active');
    }

    /**
     * Handles window resize
     * @private
     */
    _handleResize() {
        const isMobile = window.innerWidth <= 768;

        // Auto-close sidebars on desktop
        if (!isMobile) {
            this._closeAllSidebars();
        }
    }

    /**
     * Preloads data in background for better UX
     * @private
     */
    _preloadData() {
        // Use requestIdleCallback if available, otherwise setTimeout
        const schedulePreload = window.requestIdleCallback || ((cb) => setTimeout(cb, 1000));

        schedulePreload(() => {
            console.log('[App] Starting background preload...');
            // Preload banana prompts
            bananaService.preload();
        });
    }

    /**
     * Exposes modules to window for debugging
     * @private
     */
    _exposeToWindow() {
        // Expose module instances
        window.chatModule = this.modules.chat;
        window.settingsModule = this.modules.settings;
        window.xhsModule = this.modules.xhs;
        window.slicerModule = this.modules.slicer;
        window.bananaModule = this.modules.banana;

        // Expose utilities
        window.toast = toast;
        window.loading = loading;
        window.lightbox = lightbox;
        window.theme = theme;
        window.auth = auth;
        window.stateManager = stateManager;
        window.eventBus = eventBus;

        // Expose app instance
        window.app = this;

        console.log('[App] Global objects exposed to window');
    }

    /**
     * Cleanup on app destroy
     */
    destroy() {
        // Cleanup modules
        Object.values(this.modules).forEach(module => {
            if (module && typeof module.destroy === 'function') {
                module.destroy();
            }
        });

        // Clear event listeners
        eventBus.clear();

        console.log('[App] Application destroyed');
    }
}

/**
 * Initialize application when DOM is ready
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[App] DOM Content Loaded');

    // Create and initialize app
    const app = new Application();
    await app.init();

    // Expose app globally
    window.app = app;
});

/**
 * Export for module usage
 */
export default Application;
