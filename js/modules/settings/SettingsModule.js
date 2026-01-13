/**
 * Settings Module - Application settings and configuration
 * Handles provider management, authentication, and app settings
 */

import auth from '../../core/auth.js';
import providerService from '../../services/providerService.js';
import xhsService from '../../services/xhsService.js';
import xhsProviderService from '../../services/xhsProviderService.js';
import stateManager from '../../core/state.js';
import eventBus, { EVENTS } from '../../core/eventBus.js';
import toast from '../../ui/toast.js';
import loading from '../../ui/loading.js';
import theme from '../../ui/theme.js';
import { escapeHtml } from '../../utils/format.js';
import { $, $$, clearElement } from '../../utils/dom.js';

/**
 * Settings Module
 */
export class SettingsModule {
    constructor() {
        this.providers = [];
        this.xhsProviders = [];
        this.xhsConfig = null;

        // 当前编辑状态
        this.editingProviderId = null;
        this.editingXHSProviderId = null;

        // 系统设置中查看选中的渠道（仅用于UI显示，不影响实际使用的渠道）
        // 使用统一的选中状态，格式: { type: 'provider'|'xhs', id: number }
        this.selectedCard = null;

        this.elements = {};
    }

    /**
     * Initializes the settings module
     */
    async init() {
        console.log('[SettingsModule] Initializing...');

        // Render modal HTML first
        this._renderModal();

        // Get UI elements
        this.elements = {
            sidebar: $('#right-sidebar'),
            loginSection: $('#login-section'),
            loggedInSection: $('#logged-in-section'),
            loggedInSectionContent: $('#logged-in-section-content'),
            loginUsername: $('#login-username'),
            loginPassword: $('#login-password'),
            loginBtn: $('#login-btn'),
            logoutBtn: $('#logout-btn'),
            currentUsername: $('#current-username'),

            // Right sidebar provider selection (simplified)
            providerSelectList: $('#provider-select-list'),

            // System settings modal
            systemSettingsModal: $('#system-settings-modal'),
            systemSettingsClose: $('#system-settings-close'),
            systemSettingsOverlay: $('.system-settings-overlay'),

            // Provider lists in settings modal
            settingsProviderList: $('#settings-provider-list'),
            settingsXhsProviderList: $('#settings-xhs-provider-list'),

            // Theme toggle and user settings button
            themeToggleBtn: $('#theme-toggle-btn'),
            userSettingsBtn: $('#user-settings-btn'),

            // Session area (history list)
            sessionArea: $('#session-area')
        };

        // Bind events
        this._bindEvents();

        // Check authentication
        await this._checkAuth();

        console.log('[SettingsModule] Initialized');
    }

    /**
     * Renders the system settings modal HTML
     * @private
     */
    _renderModal() {
        const container = document.getElementById('system-settings-modal');
        if (!container) return;

        container.innerHTML = `
            <div class="system-settings-overlay"></div>
            <div class="system-settings-dialog">
                <div class="system-settings-header">
                    <h2 class="system-settings-title">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="3"/>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                        </svg>
                        系统设置
                    </h2>
                    <button class="system-settings-close" id="system-settings-close">
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
                <div class="system-settings-content">
                    <div class="settings-columns">
                        <div class="settings-column">
                            <h3 class="settings-column-title">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                    <circle cx="8.5" cy="8.5" r="1.5"/>
                                    <polyline points="21 15 16 10 5 21"/>
                                </svg>
                                绘图API管理
                            </h3>
                            <div id="settings-provider-list" class="provider-list"></div>
                        </div>
                        <div class="settings-column">
                            <h3 class="settings-column-title">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                    <polyline points="14 2 14 8 20 8"/>
                                    <line x1="16" y1="13" x2="8" y2="13"/>
                                    <line x1="16" y1="17" x2="8" y2="17"/>
                                    <polyline points="10 9 9 9 8 9"/>
                                </svg>
                                文案API管理
                            </h3>
                            <div id="settings-xhs-provider-list" class="provider-list"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Renders a provider card with inline form
     * @private
     */
    _renderProviderCard(provider, isEditing = false, isAdd = false) {
        const id = provider?.id || 'new';
        const isSelected = this.selectedCard?.type === 'provider' && this.selectedCard?.id === provider?.id;

        return `
            <div class="provider-card ${isSelected ? 'selected' : ''} ${isEditing ? 'editing' : ''} ${isAdd ? 'is-add' : ''}" data-id="${id}">
                <div class="provider-card-header">
                    <div class="provider-card-info">
                        <div class="provider-card-name">
                            ${isAdd ? `
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                                添加渠道
                            ` : escapeHtml(provider.name)}
                        </div>
                        ${!isAdd && provider ? `
                            <div class="provider-card-meta">
                                <span class="tag">${escapeHtml(provider.type)}</span>
                                <span class="tag">${escapeHtml(provider.model)}</span>
                            </div>
                        ` : ''}
                    </div>
                    ${!isAdd ? `
                        <div class="provider-card-actions">
                            <button class="provider-action-btn edit" title="编辑">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                            </button>
                            <button class="provider-action-btn delete" title="删除">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3 6 5 6 21 6"/>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                </svg>
                            </button>
                        </div>
                    ` : ''}
                </div>
                <div class="provider-card-form">
                    <div class="form-group">
                        <label>渠道名称</label>
                        <input type="text" class="form-input" data-field="name" placeholder="如: 官方API" value="${provider?.name || ''}">
                    </div>
                    <div class="form-group">
                        <label>接口类型</label>
                        <select class="form-input" data-field="type">
                            <option value="gemini" ${provider?.type === 'gemini' ? 'selected' : ''}>Gemini 原生接口</option>
                            <option value="openai" ${provider?.type === 'openai' ? 'selected' : ''}>OpenAI 兼容接口</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>API Base URL</label>
                        <input type="text" class="form-input" data-field="host" placeholder="https://..." value="${provider?.host || ''}">
                    </div>
                    <div class="form-group">
                        <label>API Key ${isAdd ? '' : '(留空则不修改)'}</label>
                        <input type="password" class="form-input" data-field="api_key" placeholder="API Key">
                    </div>
                    <div class="form-group">
                        <label>Model</label>
                        <input type="text" class="form-input" data-field="model" placeholder="如 gemini-2.0-flash" value="${provider?.model || ''}">
                    </div>
                    <div class="form-actions">
                        <button class="btn-cancel">取消</button>
                        <button class="btn-save">${isAdd ? '添加' : '保存'}</button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Renders an XHS provider card with inline form
     * @private
     */
    _renderXHSProviderCard(provider, isEditing = false, isAdd = false) {
        const id = provider?.id || 'new';
        const isSelected = this.selectedCard?.type === 'xhs' && this.selectedCard?.id === provider?.id;

        return `
            <div class="provider-card ${isSelected ? 'selected' : ''} ${isEditing ? 'editing' : ''} ${isAdd ? 'is-add' : ''}" data-id="${id}">
                <div class="provider-card-header">
                    <div class="provider-card-info">
                        <div class="provider-card-name">
                            ${isAdd ? `
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                                添加渠道
                            ` : escapeHtml(provider.name)}
                        </div>
                        ${!isAdd && provider ? `
                            <div class="provider-card-meta">
                                <span class="tag">${escapeHtml(provider.model)}</span>
                            </div>
                        ` : ''}
                    </div>
                    ${!isAdd ? `
                        <div class="provider-card-actions">
                            <button class="provider-action-btn edit" title="编辑">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                            </button>
                            <button class="provider-action-btn delete" title="删除">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3 6 5 6 21 6"/>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                </svg>
                            </button>
                        </div>
                    ` : ''}
                </div>
                <div class="provider-card-form">
                    <div class="form-group">
                        <label>渠道名称</label>
                        <input type="text" class="form-input" data-field="name" placeholder="如: OpenAI官方" value="${provider?.name || ''}">
                    </div>
                    <div class="form-group">
                        <label>API Base URL</label>
                        <input type="text" class="form-input" data-field="host" placeholder="https://..." value="${provider?.host || ''}">
                    </div>
                    <div class="form-group">
                        <label>API Key ${isAdd ? '' : '(留空则不修改)'}</label>
                        <input type="password" class="form-input" data-field="api_key" placeholder="API Key">
                    </div>
                    <div class="form-group">
                        <label>Model</label>
                        <input type="text" class="form-input" data-field="model" placeholder="如 gpt-4o" value="${provider?.model || ''}">
                    </div>
                    <div class="form-actions">
                        <button class="btn-cancel">取消</button>
                        <button class="btn-save">${isAdd ? '添加' : '保存'}</button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Binds event listeners
     * @private
     */
    _bindEvents() {
        // Login
        this.elements.loginBtn?.addEventListener('click', () => this.handleLogin());
        this.elements.loginPassword?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });

        // Logout
        this.elements.logoutBtn?.addEventListener('click', () => this.handleLogout());

        // Theme toggle
        this.elements.themeToggleBtn?.addEventListener('click', () => {
            theme.toggle();
        });

        // System settings modal - open from user settings button
        this.elements.userSettingsBtn?.addEventListener('click', () => this.openSystemSettings());

        // System settings modal - close
        this.elements.systemSettingsClose?.addEventListener('click', () => this.closeSystemSettings());
        this.elements.systemSettingsOverlay?.addEventListener('click', () => this.closeSystemSettings());

        // Event bus subscriptions
        eventBus.on(EVENTS.AUTH_LOGIN, () => {
            this._onAuthChange(true);
        });

        eventBus.on(EVENTS.AUTH_LOGOUT, () => {
            this._onAuthChange(false);
        });

        // Listen to auth token expired event
        window.addEventListener('auth:tokenExpired', () => {
            this._showLoginPrompt();
        });

        // Resolution selector
        const resButtons = $$('.res-btn');
        resButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                resButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const resolution = btn.dataset.val;
                stateManager.set('resolution', resolution);
                console.log('[Settings] Resolution changed to:', resolution);
            });
        });

        // Aspect ratio selector
        const ratioCards = $$('.ratio-card');
        ratioCards.forEach(card => {
            card.addEventListener('click', () => {
                ratioCards.forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                const ratio = card.dataset.val;
                stateManager.set('aspectRatio', ratio);
                console.log('[Settings] Aspect ratio changed to:', ratio);
            });
        });
    }

    /**
     * Checks authentication status
     * @private
     */
    async _checkAuth() {
        if (auth.isAuthenticated()) {
            const isValid = await auth.verifyToken();
            if (isValid) {
                await this._onAuthChange(true);
            } else {
                this._showLoginPrompt();
            }
        } else {
            this._showLoginPrompt();
        }
    }

    /**
     * Handles authentication state changes
     * @private
     */
    async _onAuthChange(isAuthenticated) {
        stateManager.set('isAuthenticated', isAuthenticated);

        if (isAuthenticated) {
            this._showLoggedInUI();
            await this.loadProviders();
            await this.loadXHSProviders();
        } else {
            this._showLoginUI();
            this.providers = [];
            this.xhsProviders = [];
            this._renderProviders();
            this._renderXHSProviders();
        }
    }

    /**
     * Shows login prompt
     * @private
     */
    _showLoginPrompt() {
        this._showLoginUI();
        toast.warning('请先登录');
    }

    /**
     * Shows login UI
     * @private
     */
    _showLoginUI() {
        if (this.elements.loginSection) {
            this.elements.loginSection.style.display = 'block';
        }
        if (this.elements.loggedInSection) {
            this.elements.loggedInSection.style.display = 'none';
        }
        if (this.elements.loggedInSectionContent) {
            this.elements.loggedInSectionContent.style.display = 'none';
        }
        // 未登录时隐藏历史对话列表
        if (this.elements.sessionArea) {
            this.elements.sessionArea.style.display = 'none';
        }
    }

    /**
     * Shows logged in UI
     * @private
     */
    _showLoggedInUI() {
        if (this.elements.loginSection) {
            this.elements.loginSection.style.display = 'none';
        }
        if (this.elements.loggedInSection) {
            this.elements.loggedInSection.style.display = 'flex';
        }
        if (this.elements.loggedInSectionContent) {
            this.elements.loggedInSectionContent.style.display = 'block';
        }
        // 登录后显示历史对话列表
        if (this.elements.sessionArea) {
            this.elements.sessionArea.style.display = 'block';
        }

        // Update username display
        const token = auth.getToken();
        if (token && this.elements.currentUsername) {
            // Decode JWT to get username (simple decode, not verified here)
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                this.elements.currentUsername.textContent = payload.sub || 'User';
            } catch (e) {
                this.elements.currentUsername.textContent = 'User';
            }
        }
    }

    /**
     * Handles login
     */
    async handleLogin() {
        const username = this.elements.loginUsername?.value.trim();
        const password = this.elements.loginPassword?.value;

        if (!username || !password) {
            toast.warning('请输入用户名和密码');
            return;
        }

        try {
            loading.show('登录中...');

            await auth.login(username, password);

            loading.hide();
            toast.success('登录成功');

            // Clear password
            if (this.elements.loginPassword) {
                this.elements.loginPassword.value = '';
            }

            // Load data
            await this._onAuthChange(true);

            eventBus.emit(EVENTS.AUTH_LOGIN);

        } catch (error) {
            console.error('[SettingsModule] Login error:', error);
            loading.hide();
            toast.error('登录失败: ' + error.message);
        }
    }

    /**
     * Handles logout
     */
    handleLogout() {
        if (!confirm('确定要退出登录吗？')) return;

        auth.logout();
        toast.success('已退出登录');

        this._onAuthChange(false);
        eventBus.emit(EVENTS.AUTH_LOGOUT);
    }

    /**
     * Loads providers from backend
     */
    async loadProviders() {
        try {
            this.providers = await providerService.getProviders();
            this._renderProviders();

            // Select first provider if none selected
            const state = stateManager.getState();
            if (!state.selectedProviderId && this.providers.length > 0) {
                stateManager.set('selectedProviderId', this.providers[0].id);
            }

        } catch (error) {
            console.error('[SettingsModule] Load providers error:', error);
            toast.error('加载Provider失败');
        }
    }

    /**
     * Renders provider lists (both settings and sidebar)
     * @private
     */
    _renderProviders() {
        this.loadProvidersToSettings();
        this.loadProvidersToSidebar();
    }

    /**
     * Loads providers to settings modal for management
     */
    loadProvidersToSettings() {
        const container = this.elements.settingsProviderList;
        if (!container) return;

        let html = '';

        // Render existing providers
        this.providers.forEach(provider => {
            const isEditing = provider.id === this.editingProviderId;
            html += this._renderProviderCard(provider, isEditing, false);
        });

        // Add "new provider" card
        const isAddingNew = this.editingProviderId === 'new';
        html += this._renderProviderCard(null, isAddingNew, true);

        container.innerHTML = html;

        // Bind card events
        this._bindProviderCardEvents(container);
    }

    /**
     * Refreshes both provider lists (for unified selection state)
     * @private
     */
    _refreshAllCards() {
        this.loadProvidersToSettings();
        this.loadXHSProvidersToSettings();
    }

    /**
     * Binds events to provider cards
     * @private
     */
    _bindProviderCardEvents(container) {
        const cards = container.querySelectorAll('.provider-card');

        cards.forEach(card => {
            const id = card.dataset.id;
            const isAdd = card.classList.contains('is-add');

            // Click header to select or toggle add form
            const header = card.querySelector('.provider-card-header');
            header?.addEventListener('click', (e) => {
                if (e.target.closest('.provider-action-btn')) return;

                if (isAdd) {
                    // Toggle add form
                    this.editingProviderId = this.editingProviderId === 'new' ? null : 'new';
                    this._refreshAllCards();
                } else {
                    // Toggle selection - click again to deselect
                    const currentlySelected = this.selectedCard?.type === 'provider' && this.selectedCard?.id === parseInt(id);
                    this.selectedCard = currentlySelected ? null : { type: 'provider', id: parseInt(id) };
                    this._refreshAllCards();
                }
            });

            // Edit button
            card.querySelector('.provider-action-btn.edit')?.addEventListener('click', async (e) => {
                e.stopPropagation();
                this.editingProviderId = parseInt(id);
                this.selectedCard = { type: 'provider', id: parseInt(id) };
                // Load full provider data
                try {
                    const fullProvider = await providerService.getProvider(parseInt(id));
                    const idx = this.providers.findIndex(p => p.id === parseInt(id));
                    if (idx !== -1) {
                        this.providers[idx] = fullProvider;
                    }
                } catch (err) {
                    console.error('Failed to load provider details:', err);
                }
                this._refreshAllCards();
            });

            // Delete button
            card.querySelector('.provider-action-btn.delete')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteProvider(parseInt(id));
            });

            // Cancel button
            card.querySelector('.btn-cancel')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.editingProviderId = null;
                this._refreshAllCards();
            });

            // Save button
            card.querySelector('.btn-save')?.addEventListener('click', async (e) => {
                e.stopPropagation();
                await this.saveProviderFromCard(card, isAdd);
            });
        });
    }

    /**
     * Saves provider from card form
     */
    async saveProviderFromCard(card, isNew) {
        const name = card.querySelector('[data-field="name"]')?.value.trim();
        const type = card.querySelector('[data-field="type"]')?.value;
        const host = card.querySelector('[data-field="host"]')?.value.trim();
        const apiKey = card.querySelector('[data-field="api_key"]')?.value.trim();
        const model = card.querySelector('[data-field="model"]')?.value.trim();

        if (!name || !type || !host || !model) {
            toast.warning('请填写所有必填字段');
            return;
        }

        if (isNew && !apiKey) {
            toast.warning('新建渠道时必须填写API Key');
            return;
        }

        const data = { name, type, host, model };
        if (apiKey) {
            data.api_key = apiKey;
        }

        try {
            loading.show(isNew ? '添加中...' : '更新中...');

            if (isNew) {
                await providerService.createProvider(data);
                toast.success('渠道已添加');
            } else {
                const id = parseInt(card.dataset.id);
                await providerService.updateProvider(id, data);
                toast.success('渠道已更新');
            }

            this.editingProviderId = null;
            await this.loadProviders();
            loading.hide();

        } catch (error) {
            console.error('[SettingsModule] Save provider error:', error);
            loading.hide();
            toast.error('保存失败: ' + error.message);
        }
    }

    /**
     * Loads providers to sidebar for selection
     */
    loadProvidersToSidebar() {
        if (!this.elements.providerSelectList) return;

        clearElement(this.elements.providerSelectList);

        if (this.providers.length === 0) {
            this.elements.providerSelectList.innerHTML = '<div style="padding:12px; color:#666; text-align:center; font-size:13px;">暂无Provider</div>';
            return;
        }

        const state = stateManager.getState();

        this.providers.forEach(provider => {
            const card = document.createElement('div');
            card.className = 'provider-select-card';

            if (provider.id === state.selectedProviderId) {
                card.classList.add('selected');
            }

            card.innerHTML = `
                <div class="provider-select-card-name">${escapeHtml(provider.name)}</div>
                <div class="provider-select-card-type">${escapeHtml(provider.type)} · ${escapeHtml(provider.model)}</div>
            `;

            // Select provider on click
            card.addEventListener('click', () => {
                this.selectProvider(provider.id);
            });

            this.elements.providerSelectList.appendChild(card);
        });
    }

    /**
     * Selects a provider
     * @param {number} providerId - Provider ID
     */
    selectProvider(providerId) {
        stateManager.set('selectedProviderId', providerId);
        this._renderProviders();
        eventBus.emit(EVENTS.PROVIDER_SELECTED, { providerId });
        toast.success('已选择Provider');
    }

    /**
     * Deletes a provider
     * @param {number} id - Provider ID
     */
    async deleteProvider(id) {
        if (!confirm('确定删除此渠道？')) return;

        try {
            loading.show('删除中...');
            await providerService.deleteProvider(id);
            await this.loadProviders();
            loading.hide();
            toast.success('渠道已删除');
        } catch (error) {
            console.error('[SettingsModule] Delete provider error:', error);
            loading.hide();
            toast.error('删除失败: ' + error.message);
        }
    }

    /**
     * Opens system settings modal
     */
    openSystemSettings() {
        // Check authentication
        if (!auth.isAuthenticated()) {
            toast.warning('请先登录');
            return;
        }

        if (this.elements.systemSettingsModal) {
            this.elements.systemSettingsModal.classList.add('active');

            // Reset editing state
            this.editingProviderId = null;
            this.editingXHSProviderId = null;

            // Load latest data into settings modal
            this.loadProvidersToSettings();
            this.loadXHSProvidersToSettings();
        }
    }

    /**
     * Closes system settings modal
     */
    closeSystemSettings() {
        if (this.elements.systemSettingsModal) {
            this.elements.systemSettingsModal.classList.remove('active');

            // Reset states
            this.editingProviderId = null;
            this.editingXHSProviderId = null;
            this.selectedCard = null;
        }

        // Also ensure the global overlay is closed
        const globalOverlay = document.getElementById('overlay');
        if (globalOverlay) {
            globalOverlay.classList.remove('active');
        }
    }

    // ==================== XHS Provider Management ====================

    /**
     * Loads XHS providers from backend
     */
    async loadXHSProviders() {
        try {
            this.xhsProviders = await xhsProviderService.getProviders();
            this._renderXHSProviders();

            // Select first XHS provider if none selected
            const state = stateManager.getState();
            if (!state.selectedXHSProviderId && this.xhsProviders.length > 0) {
                stateManager.set('selectedXHSProviderId', this.xhsProviders[0].id);
            }

        } catch (error) {
            console.error('[SettingsModule] Load XHS providers error:', error);
        }
    }

    /**
     * Renders XHS provider lists
     * @private
     */
    _renderXHSProviders() {
        this.loadXHSProvidersToSettings();
    }

    /**
     * Loads XHS providers to settings modal for management
     */
    loadXHSProvidersToSettings() {
        const container = this.elements.settingsXhsProviderList;
        if (!container) return;

        let html = '';

        // Render existing providers
        this.xhsProviders.forEach(provider => {
            const isEditing = provider.id === this.editingXHSProviderId;
            html += this._renderXHSProviderCard(provider, isEditing, false);
        });

        // Add "new provider" card
        const isAddingNew = this.editingXHSProviderId === 'new';
        html += this._renderXHSProviderCard(null, isAddingNew, true);

        container.innerHTML = html;

        // Bind card events
        this._bindXHSProviderCardEvents(container);
    }

    /**
     * Binds events to XHS provider cards
     * @private
     */
    _bindXHSProviderCardEvents(container) {
        const cards = container.querySelectorAll('.provider-card');

        cards.forEach(card => {
            const id = card.dataset.id;
            const isAdd = card.classList.contains('is-add');

            // Click header to select or toggle add form
            const header = card.querySelector('.provider-card-header');
            header?.addEventListener('click', (e) => {
                if (e.target.closest('.provider-action-btn')) return;

                if (isAdd) {
                    // Toggle add form
                    this.editingXHSProviderId = this.editingXHSProviderId === 'new' ? null : 'new';
                    this._refreshAllCards();
                } else {
                    // Toggle selection - click again to deselect
                    const currentlySelected = this.selectedCard?.type === 'xhs' && this.selectedCard?.id === parseInt(id);
                    this.selectedCard = currentlySelected ? null : { type: 'xhs', id: parseInt(id) };
                    this._refreshAllCards();
                }
            });

            // Edit button
            card.querySelector('.provider-action-btn.edit')?.addEventListener('click', async (e) => {
                e.stopPropagation();
                this.editingXHSProviderId = parseInt(id);
                this.selectedCard = { type: 'xhs', id: parseInt(id) };
                // Load full provider data
                try {
                    const fullProvider = await xhsProviderService.getProvider(parseInt(id));
                    const idx = this.xhsProviders.findIndex(p => p.id === parseInt(id));
                    if (idx !== -1) {
                        this.xhsProviders[idx] = fullProvider;
                    }
                } catch (err) {
                    console.error('Failed to load XHS provider details:', err);
                }
                this._refreshAllCards();
            });

            // Delete button
            card.querySelector('.provider-action-btn.delete')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteXHSProvider(parseInt(id));
            });

            // Cancel button
            card.querySelector('.btn-cancel')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.editingXHSProviderId = null;
                this._refreshAllCards();
            });

            // Save button
            card.querySelector('.btn-save')?.addEventListener('click', async (e) => {
                e.stopPropagation();
                await this.saveXHSProviderFromCard(card, isAdd);
            });
        });
    }

    /**
     * Saves XHS provider from card form
     */
    async saveXHSProviderFromCard(card, isNew) {
        const name = card.querySelector('[data-field="name"]')?.value.trim();
        const host = card.querySelector('[data-field="host"]')?.value.trim();
        const apiKey = card.querySelector('[data-field="api_key"]')?.value.trim();
        const model = card.querySelector('[data-field="model"]')?.value.trim();

        if (!name || !host || !model) {
            toast.warning('请填写所有必填字段');
            return;
        }

        if (isNew && !apiKey) {
            toast.warning('新建渠道时必须填写API Key');
            return;
        }

        const data = { name, host, model };
        if (apiKey) {
            data.api_key = apiKey;
        }

        try {
            loading.show(isNew ? '添加中...' : '更新中...');

            if (isNew) {
                await xhsProviderService.createProvider(data);
                toast.success('渠道已添加');
            } else {
                const id = parseInt(card.dataset.id);
                await xhsProviderService.updateProvider(id, data);
                toast.success('渠道已更新');
            }

            this.editingXHSProviderId = null;
            await this.loadXHSProviders();
            loading.hide();

        } catch (error) {
            console.error('[SettingsModule] Save XHS provider error:', error);
            loading.hide();
            toast.error('保存失败: ' + error.message);
        }
    }

    /**
     * Deletes an XHS provider
     * @param {number} id - Provider ID
     */
    async deleteXHSProvider(id) {
        if (!confirm('确定删除此渠道？')) return;

        try {
            loading.show('删除中...');
            await xhsProviderService.deleteProvider(id);
            await this.loadXHSProviders();
            loading.hide();
            toast.success('渠道已删除');
        } catch (error) {
            console.error('[SettingsModule] Delete XHS provider error:', error);
            loading.hide();
            toast.error('删除失败: ' + error.message);
        }
    }
}

// Export as default
export default SettingsModule;
