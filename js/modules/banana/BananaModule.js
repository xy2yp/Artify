/**
 * Banana Module - Prompt library browser with management
 * Loads prompts from backend API with custom prompt management
 */

import toast from '../../ui/toast.js';
import { escapeHtml } from '../../utils/format.js';
import { $, $$, clearElement } from '../../utils/dom.js';
import bananaService from '../../services/bananaService.js';
import auth from '../../core/auth.js';

/**
 * Banana Module
 */
export class BananaModule {
    constructor() {
        this.allData = [];
        this.customData = [];
        this.currentFilter = 'all';
        this.searchTerm = '';
        this.isManageMode = false;
        this.editingPrompt = null;

        this.elements = {
            modal: null,
            grid: null,
            loadingEl: null,
            errorEl: null,
            searchInput: null,
            manageBtn: null,
            formModal: null
        };

        // Max image size (10MB)
        this.maxImageSize = 10 * 1024 * 1024;
    }

    /**
     * Initializes the banana module
     */
    init() {
        console.log('[BananaModule] Initializing...');

        // Create modal HTML if not exists
        if (!$('#banana-modal')) {
            this._createModal();
        }

        // Get UI elements
        this.elements = {
            modal: $('#banana-modal'),
            grid: $('#banana-grid'),
            loadingEl: $('#banana-loading'),
            errorEl: $('#banana-error'),
            searchInput: $('.banana-search-input'),
            manageBtn: $('#banana-manage-btn')
        };

        // Bind events
        this._bindEvents();

        console.log('[BananaModule] Initialized');
    }

    /**
     * Creates the modal HTML structure
     * @private
     */
    _createModal() {
        const modalHTML = `
            <div id="banana-modal" class="xhs-modal">
                <div class="slice-header-bar">
                    <div class="slice-title">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px; color:#d97706;">
                            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                        </svg>
                        <span id="banana-title-text">提示词快查</span>
                        <button id="banana-manage-btn" class="banana-header-btn">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="3"></circle>
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                            </svg>
                            <span>管理</span>
                        </button>
                    </div>
                    <div class="slice-close" id="banana-close-btn">
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </div>
                </div>
                <!-- 固定的筛选栏 -->
                <div class="banana-filter-bar">
                    <div class="banana-search-wrapper">
                        <svg class="banana-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                        <input type="text" class="banana-search-input" placeholder="搜索关键词 (标题、提示词、分类)...">
                    </div>
                    <div class="banana-tabs" id="banana-tabs">
                        <div class="banana-tab active" data-filter="all">全部</div>
                        <div class="banana-tab" data-filter="generate">绘图</div>
                        <div class="banana-tab" data-filter="edit">生活</div>
                        <div class="banana-tab" data-filter="nsfw">NSFW</div>
                        <div class="banana-tab" data-filter="study">学习</div>
                        <div class="banana-tab" data-filter="work">工作</div>
                    </div>
                </div>
                <!-- 可滚动的内容区域 -->
                <div class="banana-content-area">
                    <div id="banana-loading" style="text-align:center; padding:40px; color:#666;">
                        <div class="loading-spinner" style="margin:0 auto 10px auto;"></div>
                        正在获取提示词...
                    </div>
                    <div id="banana-error" style="text-align:center; padding:40px; color:#d93025; display:none;">
                        获取失败，请检查网络连接
                        <br><button class="config-btn" id="banana-retry-btn" style="margin-top:10px; width:auto; padding:6px 20px;">重试</button>
                    </div>
                    <div id="banana-grid" class="banana-grid"></div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    /**
     * Creates the form modal for add/edit
     * @private
     */
    _createFormModal() {
        if ($('#banana-form-modal')) return;

        const currentUser = auth.getUsername() || 'admin';

        const formHTML = `
            <div id="banana-form-modal" class="banana-form-modal">
                <div class="banana-form-content">
                    <div class="banana-form-header">
                        <h3 id="banana-form-title">新增提示词</h3>
                        <button class="banana-form-close" id="banana-form-close">×</button>
                    </div>
                    <div class="banana-form-body">
                        <div class="banana-form-group">
                            <label>预览图片 <span class="banana-form-optional">(可选, 最大10MB)</span></label>
                            <div class="banana-image-upload" id="banana-image-upload">
                                <input type="file" id="banana-image-input" accept="image/*" style="display:none;">
                                <div class="banana-image-placeholder" id="banana-image-placeholder">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                        <polyline points="21 15 16 10 5 21"></polyline>
                                    </svg>
                                    <span>点击或拖拽上传图片</span>
                                </div>
                                <img id="banana-image-preview" class="banana-image-preview" style="display:none;">
                                <button id="banana-image-remove" class="banana-image-remove" style="display:none;">×</button>
                            </div>
                        </div>
                        <div class="banana-form-group">
                            <label>标题 <span class="banana-form-required">*</span></label>
                            <input type="text" id="banana-form-title-input" placeholder="输入提示词标题">
                        </div>
                        <div class="banana-form-group">
                            <label>提示词内容 <span class="banana-form-required">*</span></label>
                            <textarea id="banana-form-prompt" rows="5" placeholder="输入提示词内容"></textarea>
                        </div>
                        <div class="banana-form-row">
                            <div class="banana-form-group">
                                <label>模式 <span class="banana-form-required">*</span></label>
                                <select id="banana-form-mode">
                                    <option value="generate">generate (文生图)</option>
                                    <option value="edit">edit (图生图)</option>
                                </select>
                            </div>
                            <div class="banana-form-group">
                                <label>分类</label>
                                <select id="banana-form-category">
                                    <option value="">未分类</option>
                                    <option value="NSFW">NSFW</option>
                                    <option value="学习">学习</option>
                                    <option value="工作">工作</option>
                                </select>
                            </div>
                        </div>
                        <div class="banana-form-row">
                            <div class="banana-form-group">
                                <label>作者</label>
                                <input type="text" id="banana-form-author" placeholder="默认为当前用户" value="${escapeHtml(currentUser)}">
                            </div>
                            <div class="banana-form-group">
                                <label>链接 <span class="banana-form-optional">(可选)</span></label>
                                <input type="text" id="banana-form-link" placeholder="相关链接">
                            </div>
                        </div>
                    </div>
                    <div class="banana-form-footer">
                        <button class="banana-form-btn banana-form-cancel" id="banana-form-cancel">取消</button>
                        <button class="banana-form-btn banana-form-save" id="banana-form-save">保存</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', formHTML);
        this.elements.formModal = $('#banana-form-modal');
        this._bindFormEvents();
    }

    /**
     * Binds form modal events
     * @private
     */
    _bindFormEvents() {
        const formModal = this.elements.formModal;
        if (!formModal) return;

        // Close button
        $('#banana-form-close')?.addEventListener('click', () => this._closeForm());
        $('#banana-form-cancel')?.addEventListener('click', () => this._closeForm());

        // Save button
        $('#banana-form-save')?.addEventListener('click', () => this._savePrompt());

        // Click outside to close
        formModal.addEventListener('click', (e) => {
            if (e.target === formModal) {
                this._closeForm();
            }
        });

        // Image upload
        const imageUpload = $('#banana-image-upload');
        const imageInput = $('#banana-image-input');
        const imagePlaceholder = $('#banana-image-placeholder');
        const imagePreview = $('#banana-image-preview');
        const imageRemove = $('#banana-image-remove');

        imagePlaceholder?.addEventListener('click', () => imageInput?.click());

        imageInput?.addEventListener('change', (e) => {
            const file = e.target.files?.[0];
            if (file) this._handleImageSelect(file);
        });

        // Drag and drop
        imageUpload?.addEventListener('dragover', (e) => {
            e.preventDefault();
            imageUpload.classList.add('dragover');
        });

        imageUpload?.addEventListener('dragleave', () => {
            imageUpload.classList.remove('dragover');
        });

        imageUpload?.addEventListener('drop', (e) => {
            e.preventDefault();
            imageUpload.classList.remove('dragover');
            const file = e.dataTransfer?.files?.[0];
            if (file) this._handleImageSelect(file);
        });

        // Remove image
        imageRemove?.addEventListener('click', (e) => {
            e.stopPropagation();
            this._clearFormImage();
        });
    }

    /**
     * Handles image file selection
     * @private
     */
    _handleImageSelect(file) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('请选择图片文件');
            return;
        }

        // Validate file size
        if (file.size > this.maxImageSize) {
            toast.error('图片大小不能超过10MB');
            return;
        }

        // Read and preview
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64 = e.target.result;
            this._setFormImage(base64);
        };
        reader.readAsDataURL(file);
    }

    /**
     * Sets form image preview
     * @private
     */
    _setFormImage(base64) {
        const placeholder = $('#banana-image-placeholder');
        const preview = $('#banana-image-preview');
        const removeBtn = $('#banana-image-remove');

        if (placeholder) placeholder.style.display = 'none';
        if (preview) {
            preview.src = base64;
            preview.style.display = 'block';
        }
        if (removeBtn) removeBtn.style.display = 'block';
    }

    /**
     * Clears form image
     * @private
     */
    _clearFormImage() {
        const placeholder = $('#banana-image-placeholder');
        const preview = $('#banana-image-preview');
        const removeBtn = $('#banana-image-remove');
        const input = $('#banana-image-input');

        if (placeholder) placeholder.style.display = 'flex';
        if (preview) {
            preview.src = '';
            preview.style.display = 'none';
        }
        if (removeBtn) removeBtn.style.display = 'none';
        if (input) input.value = '';
    }

    /**
     * Opens the banana modal
     */
    open() {
        this.show();

        // Load data if not loaded yet
        if (this.allData.length === 0) {
            this.fetchData();
        }
    }

    /**
     * Shows the modal
     */
    show() {
        if (this.elements.modal) {
            this.elements.modal.classList.add('active');
        }
    }

    /**
     * Hides the modal
     */
    hide() {
        if (this.elements.modal) {
            this.elements.modal.classList.remove('active');
        }
        // Reset to browse mode when closing
        if (this.isManageMode) {
            this._toggleManageMode();
        }
    }

    /**
     * Binds event listeners
     * @private
     */
    _bindEvents() {
        // Close button
        const closeBtn = $('#banana-close-btn');
        closeBtn?.addEventListener('click', () => this.hide());

        // Search input
        this.elements.searchInput?.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });

        // Filter tabs
        $$('.banana-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const filter = tab.dataset.filter;
                this.filter(filter, tab);
            });
        });

        // Retry button
        const retryBtn = $('#banana-retry-btn');
        retryBtn?.addEventListener('click', () => this.fetchData());

        // Manage button
        this.elements.manageBtn?.addEventListener('click', () => this._toggleManageMode());
    }

    /**
     * Toggles between browse and manage mode
     * @private
     */
    _toggleManageMode() {
        this.isManageMode = !this.isManageMode;

        const titleText = $('#banana-title-text');
        const manageBtn = this.elements.manageBtn;
        const filterBar = $('.banana-filter-bar');
        const contentArea = $('.banana-content-area');

        if (this.isManageMode) {
            // Switch to manage mode
            if (titleText) titleText.textContent = '提示词快查 · 管理';
            if (manageBtn) {
                manageBtn.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                    <span>返回</span>
                `;
            }
            // Hide entire filter bar in manage mode
            if (filterBar) filterBar.style.display = 'none';
            // Add top margin to content area to compensate for hidden filter bar
            if (contentArea) contentArea.style.marginTop = '60px';

            // Load custom prompts
            this._loadCustomPrompts();
        } else {
            // Switch back to browse mode
            if (titleText) titleText.textContent = '提示词快查';
            if (manageBtn) {
                manageBtn.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                    </svg>
                    <span>管理</span>
                `;
            }
            // Show filter bar
            if (filterBar) filterBar.style.display = '';
            // Remove top margin from content area
            if (contentArea) contentArea.style.marginTop = '';

            // Reload all prompts
            this.render();
        }
    }

    /**
     * Loads custom prompts for manage mode
     * @private
     */
    async _loadCustomPrompts() {
        if (this.elements.loadingEl) {
            this.elements.loadingEl.style.display = 'block';
        }
        clearElement(this.elements.grid);

        try {
            this.customData = await bananaService.getCustomPrompts();
            if (this.elements.loadingEl) {
                this.elements.loadingEl.style.display = 'none';
            }
            this._renderManageView();
        } catch (error) {
            console.error('[BananaModule] Error loading custom prompts:', error);
            if (this.elements.loadingEl) {
                this.elements.loadingEl.style.display = 'none';
            }
            if (this.elements.errorEl) {
                this.elements.errorEl.style.display = 'block';
            }
            toast.error('加载自定义提示词失败');
        }
    }

    /**
     * Renders the manage view
     * @private
     */
    _renderManageView() {
        if (!this.elements.grid) return;

        clearElement(this.elements.grid);

        // Add placeholder card for creating new prompt
        const addCard = this._createAddCard();
        this.elements.grid.appendChild(addCard);

        // Add custom prompts
        this.customData.forEach(item => {
            const card = this._createManageCard(item);
            this.elements.grid.appendChild(card);
        });

        // Add hint if no custom prompts
        if (this.customData.length === 0) {
            const hint = document.createElement('div');
            hint.className = 'banana-manage-hint';
            hint.innerHTML = '💡 点击左侧卡片添加您的第一个自定义提示词';
            this.elements.grid.appendChild(hint);
        }
    }

    /**
     * Creates the add new prompt card
     * @private
     */
    _createAddCard() {
        const card = document.createElement('div');
        card.className = 'banana-card banana-add-card';
        card.innerHTML = `
            <div class="banana-add-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
            </div>
            <div class="banana-add-text">新增提示词</div>
        `;

        card.addEventListener('click', () => this._openForm());

        return card;
    }

    /**
     * Creates a card for manage view
     * @private
     */
    _createManageCard(item) {
        const card = document.createElement('div');
        card.className = 'banana-card';

        const modeTagClass = item.mode === 'generate' ? 'mode-generate' : 'mode-edit';
        const placeholder = 'https://placehold.co/600x400/e2e8f0/94a3b8?text=No+Preview';
        // Use image (base64) first, then image_url (original URL), then placeholder
        const preview = item.image || item.image_url || placeholder;
        // Always use placeholder as fallback to avoid loading same failing URL twice
        const fallbackUrl = placeholder;
        const title = item.title || '无标题';
        const category = item.category || '未分类';
        const mode = item.mode || 'generate';
        const content = item.prompt || '';
        const author = item.author || 'Unknown';

        card.innerHTML = `
            <div class="banana-preview-box">
                <img src="${escapeHtml(preview)}" class="banana-img" loading="lazy"
                     referrerpolicy="no-referrer"
                     onerror="this.onerror=null; this.src='${escapeHtml(fallbackUrl)}'">
                <div class="banana-tags">
                    <span class="banana-tag">${escapeHtml(category)}</span>
                    <span class="banana-tag ${modeTagClass}">${escapeHtml(mode)}</span>
                </div>
            </div>
            <div class="banana-content">
                <div class="banana-title">${escapeHtml(title)}</div>
                <div class="banana-prompt-box banana-prompt-box-readonly">
                    <div class="banana-prompt-text">${escapeHtml(content.substring(0, 150))}${content.length > 150 ? '...' : ''}</div>
                </div>
                <div class="banana-footer">
                    <div class="banana-author">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        ${escapeHtml(author.split('@')[0])}
                    </div>
                    <div class="banana-actions">
                        <div class="banana-icon-btn banana-edit-btn" data-id="${item.id}">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </div>
                        <div class="banana-icon-btn banana-delete-btn" data-id="${item.id}">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Edit button
        card.querySelector('.banana-edit-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this._openForm(item);
        });

        // Delete button
        card.querySelector('.banana-delete-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this._confirmDelete(item);
        });

        return card;
    }

    /**
     * Opens the form modal
     * @private
     */
    _openForm(item = null) {
        this._createFormModal();
        // 确保 formModal 引用是最新的（即使表单已存在）
        this.elements.formModal = $('#banana-form-modal');
        this.editingPrompt = item;

        const formTitle = $('#banana-form-title');
        const titleInput = $('#banana-form-title-input');
        const promptInput = $('#banana-form-prompt');
        const modeSelect = $('#banana-form-mode');
        const categoryInput = $('#banana-form-category');
        const authorInput = $('#banana-form-author');
        const linkInput = $('#banana-form-link');

        // Reset form
        this._clearFormImage();

        if (item) {
            // Edit mode
            if (formTitle) formTitle.textContent = '编辑提示词';
            if (titleInput) titleInput.value = item.title || '';
            if (promptInput) promptInput.value = item.prompt || '';
            if (modeSelect) modeSelect.value = item.mode || 'generate';
            if (categoryInput) categoryInput.value = item.category || '';
            if (authorInput) authorInput.value = item.author || '';
            if (linkInput) linkInput.value = item.link || '';
            if (item.image) this._setFormImage(item.image);
        } else {
            // Create mode
            if (formTitle) formTitle.textContent = '新增提示词';
            if (titleInput) titleInput.value = '';
            if (promptInput) promptInput.value = '';
            if (modeSelect) modeSelect.value = 'generate';
            if (categoryInput) categoryInput.value = '';
            if (authorInput) authorInput.value = auth.getUsername() || 'admin';
            if (linkInput) linkInput.value = '';
        }

        // Show modal
        if (this.elements.formModal) {
            this.elements.formModal.classList.add('active');
        }
    }

    /**
     * Closes the form modal
     * @private
     */
    _closeForm() {
        if (this.elements.formModal) {
            this.elements.formModal.classList.remove('active');
        }
        this.editingPrompt = null;
    }

    /**
     * Saves the prompt (create or update)
     * @private
     */
    async _savePrompt() {
        const titleInput = $('#banana-form-title-input');
        const promptInput = $('#banana-form-prompt');
        const modeSelect = $('#banana-form-mode');
        const categoryInput = $('#banana-form-category');
        const authorInput = $('#banana-form-author');
        const linkInput = $('#banana-form-link');
        const imagePreview = $('#banana-image-preview');

        // Validate
        const title = titleInput?.value?.trim();
        const prompt = promptInput?.value?.trim();

        if (!title) {
            toast.error('请输入标题');
            titleInput?.focus();
            return;
        }

        if (!prompt) {
            toast.error('请输入提示词内容');
            promptInput?.focus();
            return;
        }

        const data = {
            title,
            prompt,
            mode: modeSelect?.value || 'generate',
            category: categoryInput?.value?.trim() || null,
            author: authorInput?.value?.trim() || null,
            link: linkInput?.value?.trim() || null,
            image: imagePreview?.src && imagePreview.style.display !== 'none' ? imagePreview.src : null
        };

        try {
            if (this.editingPrompt) {
                // Update
                await bananaService.updatePrompt(this.editingPrompt.id, data);
                toast.success('提示词已更新');
            } else {
                // Create
                await bananaService.createPrompt(data);
                toast.success('提示词已创建');
            }

            this._closeForm();

            // Reload custom prompts
            await this._loadCustomPrompts();

            // Also refresh all data to include new custom prompts
            this.fetchData();

        } catch (error) {
            console.error('[BananaModule] Error saving prompt:', error);
            toast.error(error.message || '保存失败');
        }
    }

    /**
     * Confirms and deletes a prompt
     * @private
     */
    async _confirmDelete(item) {
        if (!confirm(`确定要删除提示词 "${item.title}" 吗？`)) {
            return;
        }

        try {
            await bananaService.deletePrompt(item.id);
            toast.success('提示词已删除');

            // Reload custom prompts
            await this._loadCustomPrompts();

            // Also refresh all data
            this.fetchData();

        } catch (error) {
            console.error('[BananaModule] Error deleting prompt:', error);
            toast.error(error.message || '删除失败');
        }
    }

    /**
     * Fetches prompt data from backend API
     */
    async fetchData() {
        // Show loading
        if (this.elements.loadingEl) {
            this.elements.loadingEl.style.display = 'block';
        }
        if (this.elements.errorEl) {
            this.elements.errorEl.style.display = 'none';
        }
        clearElement(this.elements.grid);

        try {
            console.log('[BananaModule] Fetching prompts from backend...');
            const data = await bananaService.getPrompts();

            this.allData = data;

            if (this.elements.loadingEl) {
                this.elements.loadingEl.style.display = 'none';
            }

            this.render();
            toast.success(`成功加载 ${data.length} 个提示词`);

            console.log('[BananaModule] Data loaded:', data.length);

            // Trigger background image sync (non-blocking)
            console.log('[BananaModule] About to call _startImageSync...');
            this._startImageSync(data).catch(err => {
                console.error('[BananaModule] Image sync error:', err);
            });

        } catch (error) {
            console.error('[BananaModule] Failed to fetch data:', error);

            if (this.elements.loadingEl) {
                this.elements.loadingEl.style.display = 'none';
            }
            if (this.elements.errorEl) {
                this.elements.errorEl.style.display = 'block';
            }

            toast.error('加载提示词失败');
        }
    }

    /**
     * Filters prompts by category
     * @param {string} type - Filter type
     * @param {HTMLElement} btnEl - Button element
     */
    filter(type, btnEl) {
        this.currentFilter = type;

        // Update active tab
        $$('.banana-tab').forEach(t => t.classList.remove('active'));
        btnEl?.classList.add('active');

        this.render();
    }

    /**
     * Handles search input
     * @param {string} value - Search term
     */
    handleSearch(value) {
        this.searchTerm = value.toLowerCase().trim();
        this.render();
    }

    /**
     * Renders the prompt grid
     */
    render() {
        if (!this.elements.grid) return;
        if (this.isManageMode) return; // Don't render in manage mode

        clearElement(this.elements.grid);

        // Filter data
        const filtered = this.allData.filter(item => {
            // Filter by tab
            let tabMatch = true;

            if (this.currentFilter === 'all') {
                tabMatch = true;
            } else if (this.currentFilter === 'generate') {
                tabMatch = item.mode === 'generate';
            } else if (this.currentFilter === 'edit') {
                tabMatch = item.mode === 'edit';
            } else if (this.currentFilter === 'nsfw') {
                tabMatch = (item.category || '').toLowerCase() === 'nsfw';
            } else if (this.currentFilter === 'study') {
                tabMatch = (item.category || '').toLowerCase() === '学习';
            } else if (this.currentFilter === 'work') {
                tabMatch = (item.category || '').toLowerCase() === '工作';
            }

            // Filter by search term
            let searchMatch = true;
            if (this.searchTerm) {
                const s = this.searchTerm;
                const searchText = (item.title || '') + ' ' +
                                  (item.prompt || '') + ' ' +
                                  (item.category || '');
                searchMatch = searchText.toLowerCase().includes(s);
            }

            return tabMatch && searchMatch;
        });

        // Render cards
        if (filtered.length === 0) {
            this.elements.grid.innerHTML = '<div class="banana-empty">没有找到匹配的提示词</div>';
            return;
        }

        filtered.forEach(item => {
            const card = this._createCard(item);
            this.elements.grid.appendChild(card);
        });

        console.log('[BananaModule] Rendered:', filtered.length);
    }

    /**
     * Creates a prompt card
     * @private
     */
    _createCard(item) {
        const card = document.createElement('div');
        card.className = 'banana-card';

        const modeTagClass = item.mode === 'generate' ? 'mode-generate' : 'mode-edit';
        const placeholder = 'https://placehold.co/600x400/e2e8f0/94a3b8?text=No+Preview';
        // Use image (base64) first, then image_url (original URL), then placeholder
        const preview = item.image || item.image_url || placeholder;
        // Always use placeholder as fallback to avoid loading same failing URL twice
        const fallbackUrl = placeholder;
        const title = item.title || '无标题';
        const category = item.category || '未分类';
        const mode = item.mode || 'generate';
        const content = item.prompt || '';
        const author = item.author || 'Unknown';

        card.innerHTML = `
            <div class="banana-preview-box">
                <img src="${escapeHtml(preview)}" class="banana-img" loading="lazy"
                     referrerpolicy="no-referrer"
                     onerror="this.onerror=null; this.src='${escapeHtml(fallbackUrl)}'">
                <div class="banana-tags">
                    <span class="banana-tag">${escapeHtml(category)}</span>
                    <span class="banana-tag ${modeTagClass}">${escapeHtml(mode)}</span>
                </div>
            </div>
            <div class="banana-content">
                <div class="banana-title">${escapeHtml(title)}</div>
                <div class="banana-prompt-box">
                    <div class="banana-prompt-text">${escapeHtml(content.substring(0, 150))}${content.length > 150 ? '...' : ''}</div>
                    <div class="banana-prompt-tip"><span>点击复制</span></div>
                </div>
                <div class="banana-footer">
                    <div class="banana-author">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        ${escapeHtml(author.split('@')[0])}
                    </div>
                    <div class="banana-actions">
                        ${item.link ? `
                            <a href="${escapeHtml(item.link)}" target="_blank" class="banana-icon-btn">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                    <polyline points="15 3 21 3 21 9"></polyline>
                                    <line x1="10" y1="14" x2="21" y2="3"></line>
                                </svg>
                            </a>
                        ` : ''}
                        <div class="banana-icon-btn banana-copy-btn-icon">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Copy button (on prompt box)
        card.querySelector('.banana-prompt-box').addEventListener('click', () => {
            this.copyPrompt(content);
        });

        // Copy button (icon)
        card.querySelector('.banana-copy-btn-icon').addEventListener('click', (e) => {
            e.stopPropagation();
            this.copyPrompt(content);
        });

        return card;
    }

    /**
     * Copies prompt to clipboard
     * @param {string} content - Prompt content
     */
    async copyPrompt(content) {
        try {
            await navigator.clipboard.writeText(content);
            toast.success('提示词已复制');
        } catch (error) {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = content;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();

            try {
                const successful = document.execCommand('copy');
                if (successful) {
                    toast.success('提示词已复制');
                } else {
                    toast.error('复制失败');
                }
            } catch (err) {
                toast.error('浏览器不支持自动复制');
            }

            document.body.removeChild(textarea);
        }
    }

    /**
     * Starts background image sync for items missing images
     * @private
     */
    async _startImageSync(data) {
        console.log('[BananaModule] _startImageSync called with', data.length, 'items');

        // Debug: Log sample item structure
        if (data.length > 0) {
            const sample = data[0];
            console.log('[BananaModule] Sample item:', {
                id: sample.id,
                title: sample.title,
                hasImage: !!sample.image,
                imageUrl: sample.image_url,
                imageLength: sample.image ? sample.image.length : 0
            });
        }

        // Filter items that need image supplement
        const pending = data.filter(item => !item.image && item.image_url);

        console.log('[BananaModule] Items needing sync:', pending.length);

        if (pending.length === 0) {
            console.log('[BananaModule] No images need syncing');
            return;
        }

        console.log(`[BananaModule] Starting image sync: ${pending.length} images to download`);

        // Process in batches with concurrency limit
        const concurrency = 3;
        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < pending.length; i += concurrency) {
            const batch = pending.slice(i, i + concurrency);
            const results = await Promise.allSettled(
                batch.map(item => this._syncSingleImage(item))
            );

            // Count successes and failures
            results.forEach(result => {
                if (result.status === 'fulfilled' && result.value) {
                    successCount++;
                } else {
                    failCount++;
                }
            });
        }

        console.log(`[BananaModule] Image sync complete: ${successCount} succeeded, ${failCount} failed`);
    }

    /**
     * Downloads and uploads a single image
     * Uses img element to bypass CORS, then canvas to get base64
     * @private
     * @returns {Promise<boolean>} True if successful
     */
    async _syncSingleImage(item) {
        console.log(`[BananaModule] Syncing image for: ${item.title}`);

        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';  // 尝试请求 CORS（如果服务器支持）

            let resolved = false;
            const timeout = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    console.warn(`[BananaModule] Image load timeout for "${item.title}"`);
                    img.src = '';  // 取消加载
                    resolve(false);
                }
            }, 15000);

            img.onload = async () => {
                if (resolved) return;
                clearTimeout(timeout);

                try {
                    // 用 canvas 转 base64
                    const canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth;
                    canvas.height = img.naturalHeight;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);

                    // 转为 base64
                    const base64 = canvas.toDataURL('image/jpeg', 0.9);
                    console.log(`[BananaModule] Converted to base64: ${base64.length} chars`);

                    // 上传到后端
                    await bananaService.uploadImage(item.id, base64);
                    console.log(`[BananaModule] Uploaded to backend for: ${item.title}`);

                    // 更新本地缓存
                    item.image = base64;

                    // 刷新卡片显示
                    this._refreshCardImage(item.id, base64);

                    console.log(`[BananaModule] Image synced: ${item.title}`);
                    resolved = true;
                    resolve(true);
                } catch (error) {
                    console.warn(`[BananaModule] Canvas/upload failed for "${item.title}":`, error.message);
                    resolved = true;
                    resolve(false);
                }
            };

            img.onerror = () => {
                if (resolved) return;
                clearTimeout(timeout);
                console.warn(`[BananaModule] Image load failed for "${item.title}": ${item.image_url}`);
                resolved = true;
                resolve(false);
            };

            // 开始加载
            img.src = item.image_url;
        });
    }

    /**
     * Converts a Blob to base64 data URL
     * @private
     */
    _blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Failed to read blob'));
            reader.readAsDataURL(blob);
        });
    }

    /**
     * Refreshes a card's image after successful sync
     * @private
     */
    _refreshCardImage(id, base64) {
        // Find the card with matching data-id or by searching through the grid
        const cards = this.elements.grid?.querySelectorAll('.banana-card');
        if (!cards) return;

        // Find the item in allData to match
        const item = this.allData.find(d => d.id === id);
        if (!item) return;

        // Find the card by matching title (since cards don't have data-id in browse mode)
        for (const card of cards) {
            const titleEl = card.querySelector('.banana-title');
            if (titleEl && titleEl.textContent === item.title) {
                const img = card.querySelector('.banana-img');
                if (img) {
                    img.src = base64;
                }
                break;
            }
        }
    }
}

// Export as default
export default BananaModule;
