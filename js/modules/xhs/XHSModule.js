/**
 * XHS Module - 小红薯灵感实验室
 * Handles XHS copywriting and shot generation
 */

import xhsService from '../../services/xhsService.js';
import xhsProviderService from '../../services/xhsProviderService.js';
import dbService from '../../services/dbService.js';
import generateService from '../../services/generateService.js';
import stateManager from '../../core/state.js';
import eventBus, { EVENTS } from '../../core/eventBus.js';
import toast from '../../ui/toast.js';
import loading from '../../ui/loading.js';
import { escapeHtml } from '../../utils/format.js';
import { compressImage, base64ToBlobUrl, stripDataUri, ensureDataUri } from '../../utils/image.js';
import { $, $$, clearElement } from '../../utils/dom.js';

/**
 * Generate XHS system prompt with dynamic image count
 * @param {number} imageCount - Number of images to generate
 * @returns {string} System prompt
 */
function getXHSSystemPrompt(imageCount) {
    return `你是一位资深的小红书内容策划专家，擅长爆款笔记创作和视觉设计。

## 你的任务
根据用户提供的主题和参考图片，策划一篇完整的小红书笔记，包括标题、正文和配图方案。

## 分析要求
1. **理解用户需求**：仔细分析用户的主题描述和上传的参考图片
2. **提取视觉风格**：如果有参考图，分析其色彩、构图、氛围、风格特征
3. **匹配内容调性**：根据主题选择合适的表达风格（种草/教程/测评/OOTD/Vlog等）

## 输出规范
返回严格的 **JSON格式**，结构如下：

{
  "title": "爆款标题（必须包含emoji，控制在20字内，使用数字/符号/反问/悬念等技巧）",
  "content": "正文内容（分段清晰，每段加emoji，自然融入3-5个话题标签如#标签，语气亲切真实，避免广告感）",
  "shots": [
    {
      "desc": "图1-封面图：简短描述图片用途和重点",
      "prompt": "详细的画面描述（中文）：\\n- 主体：具体描述主要元素、人物动作、产品特写等\\n- 环境：场景氛围、背景元素、空间感\\n- 色彩：主色调、配色方案（参考风格图）\\n- 光影：光线方向、明暗对比、氛围营造\\n- 风格：摄影风格、构图方式、视觉质感\\n- 细节：重要的装饰元素、文字排版位置等\\n\\n要求：画面精致、符合小红书审美"
    }
  ]
}

## 创作原则
- **标题**：吸睛但不夸张，真实但有亮点
- **正文**：口语化表达，分享感强，有价值有共鸣
- **配图**：每张图都有明确目的，视觉连贯统一
- **图片描述**：足够详细，让AI能准确生成理想画面

## 注意事项
- shots数组长度必须为 ${imageCount} 张
- 所有prompt必须用中文描述，不要出现英文
- 如果用户上传了参考图，必须在prompt中体现参考图的风格特征
- 确保JSON格式完全正确，可以被直接解析`;
}

/**
 * XHS Module
 */
export class XHSModule {
    constructor() {
        this.currentData = null; // Current outline data
        this.refImages = []; // Reference images
        this.xhsProviders = []; // XHS provider list

        this.elements = {
            modal: null,
            topicInput: null,
            previewBox: null,
            textResult: null,
            contentViewer: null,
            shotList: null,
            historyList: null,
            imageCountInput: null,
            providerSelect: null
        };
    }

    /**
     * Initializes the XHS module
     */
    async init() {
        console.log('[XHSModule] Initializing...');

        // Create modal HTML if not exists
        if (!$('#xhs-modal')) {
            this._createModal();
        }

        // Get UI elements
        this.elements = {
            modal: $('#xhs-modal'),
            topicInput: $('#xhs-topic'),
            previewBox: $('#xhs-previews'),
            textResult: $('#xhs-text-result'),
            contentViewer: $('#xhs-content-viewer'),
            shotList: $('#xhs-shot-list'),
            historyList: $('#xhs-history-list'),
            imageCountInput: $('#xhs-img-count'),
            providerSelect: $('#xhs-provider-select')
        };

        // Bind events
        this._bindEvents();

        // Load XHS providers
        await this.loadXHSProviders();

        // Load history
        await this.renderHistory();

        // Listen to provider updates
        eventBus.on(EVENTS.XHS_PROVIDER_CREATED, () => this.loadXHSProviders());
        eventBus.on(EVENTS.XHS_PROVIDER_UPDATED, () => this.loadXHSProviders());
        eventBus.on(EVENTS.XHS_PROVIDER_DELETED, () => this.loadXHSProviders());

        console.log('[XHSModule] Initialized');
    }

    /**
     * Creates the modal HTML structure
     * @private
     */
    _createModal() {
        const modalHTML = `
            <div id="xhs-modal" class="xhs-modal" style="display:none;">
                <div class="xhs-header">
                    <div class="xhs-toggle-btn" id="xhs-toggle-sidebar-btn">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
                    </div>
                    <div class="xhs-title-bar">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                        <span style="margin-left:8px;">小红薯灵感实验室</span>
                    </div>
                    <div class="xhs-toggle-btn" id="xhs-close-btn">✕</div>
                </div>

                <div class="xhs-sidebar-overlay" id="xhs-sidebar-overlay"></div>
                <div class="xhs-layout">
                    <!-- Left: Settings & History -->
                    <div class="xhs-sidebar collapsed" id="xhs-sidebar">
                        <div class="xhs-sidebar-inner">
                            <div class="xhs-config-card">
                                <div class="xhs-section-label" style="margin-bottom:12px;">
                                    <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px;"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"/></svg>文案渠道</span>
                                </div>
                                <select id="xhs-provider-select" class="xhs-input" style="width:100%;">
                                    <option value="">请选择渠道...</option>
                                </select>
                                <div style="font-size:11px;color:#666;margin-top:8px;">在系统设置中添加更多渠道</div>
                            </div>
                            <div class="xhs-section-label">
                                <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px;"><path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>历史记录</span>
                                <span style="cursor:pointer;color:#d93025" id="xhs-clear-history-btn">清空</span>
                            </div>
                            <div id="xhs-history-list"></div>
                        </div>
                    </div>

                    <!-- Middle: Input & Text -->
                    <div class="xhs-middle">
                        <div class="xhs-middle-content">
                            <div class="xhs-input-box">
                                <div class="xhs-section-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px;"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>灵感输入</div>
                                <textarea class="xhs-textarea-lg" id="xhs-topic" placeholder="输入你的想法，例如："分析图片，生成复古风格的OOTD文案"..."></textarea>

                                <div class="xhs-upload-row">
                                    <div class="xhs-upload-btn" id="xhs-upload-btn">
                                        <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                    </div>
                                    <input type="file" id="xhs-file-input" hidden multiple accept="image/*">
                                    <div id="xhs-previews" style="display:flex;gap:8px;"></div>
                                </div>
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:15px;">
                                    <div style="font-size:12px;color:#666">图片数量: <input type="number" id="xhs-img-count" value="4" min="1" max="9" style="width:40px;padding:4px;border:1px solid #ddd;border-radius:4px;text-align:center"></div>
                                    <button class="xhs-action-btn" id="xhs-generate-btn" style="width:auto; padding:8px 24px; margin-top:0;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>生成方案</button>
                                </div>
                            </div>

                            <div id="xhs-text-result" style="display:none;">
                                <div class="xhs-section-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>文案预览</div>
                                <div class="xhs-copy-group">
                                    <button class="xhs-mini-btn" id="xhs-copy-title-btn">复制标题</button>
                                    <button class="xhs-mini-btn" id="xhs-copy-content-btn">复制正文</button>
                                    <button class="xhs-mini-btn" id="xhs-save-btn">保存</button>
                                </div>
                                <div id="xhs-content-viewer" style="font-size:14px;line-height:1.6;color:#333"></div>
                            </div>
                        </div>
                    </div>

                    <!-- Right: Visual Wall -->
                    <div class="xhs-right">
                        <div class="xhs-gallery-bar">
                            <div style="font-weight:700; color:#333; display:flex; align-items:center;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px;"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>分镜</div>
                            <div class="xhs-gallery-opts">
                                <select id="xhs-paint-ratio" class="xhs-select">
                                    <option value="3:4">3:4 (默认)</option><option value="1:1">1:1</option><option value="16:9">16:9</option>
                                    <option value="9:16">9:16</option><option value="4:3">4:3</option><option value="3:2">3:2</option>
                                    <option value="2:3">2:3</option><option value="21:9">21:9</option><option value="5:4">5:4</option><option value="4:5">4:5</option>
                                </select>
                                <select id="xhs-paint-quality" class="xhs-select">
                                    <option value="1K">1K (标准)</option><option value="2K">2K (高清)</option><option value="4K">4K (超清)</option>
                                </select>
                                <button class="xhs-mini-btn" id="xhs-batch-generate-btn" style="background:#1a73e8;color:white;border:none;height:36px;padding:0 16px;display:flex;align-items:center;gap:6px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>批量生成</button>
                            </div>
                        </div>
                        <div class="shot-grid" id="xhs-shot-list"></div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    /**
     * Shows the XHS modal
     */
    show() {
        if (this.elements.modal) {
            this.elements.modal.style.display = 'flex';
        }
    }

    /**
     * Opens the XHS modal (alias for show)
     */
    open() {
        this.show();
    }

    /**
     * Hides the XHS modal
     */
    hide() {
        if (this.elements.modal) {
            this.elements.modal.style.display = 'none';
        }
    }

    /**
     * Closes the XHS modal (alias for hide)
     */
    close() {
        this.hide();
    }

    /**
     * Binds event listeners
     * @private
     */
    _bindEvents() {
        // Generate button
        const generateBtn = $('#xhs-generate-btn');
        generateBtn?.addEventListener('click', () => this.generateOutline());

        // Upload images
        const uploadBtn = $('#xhs-upload-btn');
        const fileInput = $('#xhs-file-input');
        uploadBtn?.addEventListener('click', () => fileInput?.click());
        fileInput?.addEventListener('change', (e) => this._handleImageUpload(e));

        // Save button
        const saveBtn = $('#xhs-save-btn');
        saveBtn?.addEventListener('click', () => this.saveToHistory());

        // Copy buttons
        const copyTitleBtn = $('#xhs-copy-title-btn');
        copyTitleBtn?.addEventListener('click', () => this._copyTitle());

        const copyContentBtn = $('#xhs-copy-content-btn');
        copyContentBtn?.addEventListener('click', () => this._copyContent());

        // Clear history button
        const clearHistoryBtn = $('#xhs-clear-history-btn');
        clearHistoryBtn?.addEventListener('click', () => this._clearHistory());

        // Batch generate button
        const batchGenerateBtn = $('#xhs-batch-generate-btn');
        batchGenerateBtn?.addEventListener('click', () => this._batchGenerate());

        // Sidebar toggle button
        const toggleSidebarBtn = $('#xhs-toggle-sidebar-btn');
        const sidebar = $('#xhs-sidebar');
        const sidebarOverlay = $('#xhs-sidebar-overlay');

        toggleSidebarBtn?.addEventListener('click', () => {
            sidebar?.classList.toggle('collapsed');
            sidebarOverlay?.classList.toggle('active');
        });

        sidebarOverlay?.addEventListener('click', () => {
            sidebar?.classList.add('collapsed');
            sidebarOverlay?.classList.remove('active');
        });

        // Close button
        const closeBtn = $('#xhs-close-btn');
        closeBtn?.addEventListener('click', () => this.close());

        // Provider select change
        const providerSelect = $('#xhs-provider-select');
        providerSelect?.addEventListener('change', (e) => {
            const providerId = parseInt(e.target.value);
            if (providerId) {
                stateManager.set('selectedXHSProviderId', providerId);
                toast.success('已选择文案渠道');
            }
        });
    }

    /**
     * Loads XHS providers and populates the select dropdown
     */
    async loadXHSProviders() {
        try {
            this.xhsProviders = await xhsProviderService.getProviders();
            console.log(`[XHSModule] Loaded ${this.xhsProviders.length} XHS providers`);

            // Populate select dropdown
            const select = this.elements.providerSelect || $('#xhs-provider-select');
            if (!select) return;

            // Clear existing options (keep first placeholder)
            while (select.options.length > 1) {
                select.remove(1);
            }

            // Add provider options
            this.xhsProviders.forEach(provider => {
                const option = document.createElement('option');
                option.value = provider.id;
                option.textContent = `${provider.name} (${provider.model})`;
                select.appendChild(option);
            });

            // Restore selected provider from state
            const state = stateManager.getState();
            if (state.selectedXHSProviderId) {
                select.value = state.selectedXHSProviderId;
            } else if (this.xhsProviders.length > 0) {
                // Auto-select first provider
                select.value = this.xhsProviders[0].id;
                stateManager.set('selectedXHSProviderId', this.xhsProviders[0].id);
            }

        } catch (error) {
            console.error('[XHSModule] Load XHS providers error:', error);
        }
    }

    /**
     * Generates XHS outline (title + content + shots)
     */
    async generateOutline() {
        const topic = this.elements.topicInput?.value.trim();
        const imageCount = parseInt(this.elements.imageCountInput?.value || '9');

        if (!topic) {
            toast.warning('请输入主题');
            return;
        }

        // Check for selected XHS provider
        const state = stateManager.getState();
        if (!state.selectedXHSProviderId) {
            toast.warning('请先选择文案渠道');
            return;
        }

        try {
            loading.show('正在生成文案...');

            // Prepare reference images
            const images = this.refImages.map(img => img.src);

            // Call XHS service with selected provider
            const result = await xhsService.generate({
                topic,
                images,
                imageCount,
                providerId: state.selectedXHSProviderId,
                systemPrompt: getXHSSystemPrompt(imageCount)
            });

            // Store current data
            this.currentData = result;
            stateManager.set('xhsCurrentId', result.id);

            // Render result
            this._renderOutline(result);

            loading.hide();
            toast.success('文案生成成功');

        } catch (error) {
            console.error('[XHSModule] Generate error:', error);
            loading.hide();
            toast.error('生成失败: ' + error.message);
        }
    }

    /**
     * Renders the generated outline
     * @private
     */
    _renderOutline(data) {
        // Render title and content
        if (this.elements.contentViewer) {
            this.elements.contentViewer.innerHTML = `
                <h1>${escapeHtml(data.title)}</h1>
                <div class="xhs-content">${this._formatContent(data.content)}</div>
            `;
        }

        // Show text result area
        if (this.elements.textResult) {
            this.elements.textResult.style.display = 'block';
        }

        // Render shots
        this._renderShots(data.shots);
    }

    /**
     * Renders shot cards
     * @private
     */
    _renderShots(shots) {
        if (!this.elements.shotList) return;

        clearElement(this.elements.shotList);

        shots.forEach((shot, index) => {
            const card = document.createElement('div');
            card.className = 'shot-card';
            card.innerHTML = `
                <div class="shot-header">
                    <span class="shot-number">#${shot.order}</span>
                    <span class="shot-scene">${escapeHtml(shot.scene)}</span>
                </div>
                <div class="shot-body">
                    <div class="shot-img-wrap">
                        ${shot.image ? `<img src="${shot.image}" class="shot-img" />` : '<div class="shot-placeholder">待生成</div>'}
                    </div>
                    <div class="shot-prompt">${escapeHtml(shot.prompt)}</div>
                </div>
                <div class="shot-footer">
                    <button class="xhs-mini-btn" onclick="window.xhsModule.generateShotImage(${index})">生成图片</button>
                    ${shot.image ? '<button class="xhs-mini-btn" onclick="window.xhsModule.downloadShot(' + index + ')">下载</button>' : ''}
                </div>
            `;

            this.elements.shotList.appendChild(card);
        });
    }

    /**
     * Generates image for a specific shot
     * @param {number} index - Shot index
     */
    async generateShotImage(index) {
        if (!this.currentData || !this.currentData.shots[index]) {
            toast.error('无效的分镜索引');
            return;
        }

        const shot = this.currentData.shots[index];
        const state = stateManager.getState();

        if (!state.selectedProviderId) {
            toast.warning('请先选择Provider');
            return;
        }

        try {
            // Show loading on card
            const card = this.elements.shotList?.children[index];
            if (card) {
                card.classList.add('shot-loading');
            }

            loading.show(`正在生成分镜 #${shot.order}...`);

            // Generate image
            const result = await generateService.generate({
                providerId: state.selectedProviderId,
                prompt: shot.prompt,
                images: this.refImages.map(img => img.src),
                settings: {
                    resolution: state.resolution,
                    aspect_ratio: state.aspectRatio
                }
            });

            // Update shot with generated image
            if (result.images && result.images.length > 0) {
                shot.image = result.images[0].base64;
                this.currentData.shots[index] = shot;

                // Re-render shots
                this._renderShots(this.currentData.shots);

                toast.success(`分镜 #${shot.order} 生成成功`);
            }

            loading.hide();

        } catch (error) {
            console.error('[XHSModule] Generate shot error:', error);
            loading.hide();
            toast.error('生成失败: ' + error.message);
        }
    }

    /**
     * Downloads a shot image
     * @param {number} index - Shot index
     */
    downloadShot(index) {
        if (!this.currentData || !this.currentData.shots[index]?.image) return;

        const shot = this.currentData.shots[index];
        const link = document.createElement('a');
        link.href = shot.image;
        link.download = `shot-${shot.order}.jpg`;
        link.click();
        toast.success('下载完成');
    }

    /**
     * Saves current data to history
     */
    async saveToHistory() {
        if (!this.currentData) {
            toast.warning('没有可保存的内容');
            return;
        }

        try {
            await dbService.xhs.add({
                id: this.currentData.id,
                title: this.currentData.title,
                content: this.currentData.content,
                shots: this.currentData.shots,
                topic: this.elements.topicInput?.value,
                timestamp: Date.now()
            });

            await this.renderHistory();
            toast.success('已保存到历史记录');

        } catch (error) {
            console.error('[XHSModule] Save error:', error);
            toast.error('保存失败');
        }
    }

    /**
     * Renders history list
     */
    async renderHistory() {
        if (!this.elements.historyList) return;

        try {
            const history = await dbService.xhs.getAll();
            clearElement(this.elements.historyList);

            if (history.length === 0) {
                this.elements.historyList.innerHTML = '<div style="padding:20px;text-align:center;color:#999;">暂无历史记录</div>';
                return;
            }

            history.forEach(item => {
                const div = document.createElement('div');
                div.className = 'xhs-history-item';
                div.innerHTML = `
                    <div class="xhs-h-title">${escapeHtml(item.title)}</div>
                    <div class="xhs-h-date">${new Date(item.timestamp).toLocaleDateString()}</div>
                    <button class="xhs-h-delete" onclick="window.xhsModule.deleteHistory(${item.id})">删除</button>
                `;

                div.addEventListener('click', () => this._loadHistory(item));

                this.elements.historyList.appendChild(div);
            });

        } catch (error) {
            console.error('[XHSModule] Render history error:', error);
        }
    }

    /**
     * Loads a history item
     * @private
     */
    _loadHistory(item) {
        this.currentData = item;
        stateManager.set('xhsCurrentId', item.id);

        if (this.elements.topicInput) {
            this.elements.topicInput.value = item.topic || '';
        }

        this._renderOutline(item);
        this._toggleHistory(); // Close history panel
        toast.success('已加载历史记录');
    }

    /**
     * Deletes a history item
     * @param {number} id - History item ID
     */
    async deleteHistory(id) {
        if (!confirm('确定删除这条记录？')) return;

        try {
            await dbService.xhs.delete(id);
            await this.renderHistory();
            toast.success('已删除');
        } catch (error) {
            console.error('[XHSModule] Delete history error:', error);
            toast.error('删除失败');
        }
    }

    /**
     * Handles image upload
     * @private
     */
    async _handleImageUpload(e) {
        const files = Array.from(e.target.files);

        if (this.refImages.length + files.length > 4) {
            toast.warning('最多4张参考图');
            return;
        }

        for (const file of files) {
            if (!file.type.startsWith('image/')) continue;

            try {
                const compressed = await compressImage(file);
                this.refImages.push({
                    src: ensureDataUri(compressed.base64, compressed.mimeType)
                });
            } catch (error) {
                console.error('[XHSModule] Compress error:', error);
            }
        }

        this._renderPreviews();
        e.target.value = ''; // Reset
        toast.success(`已添加 ${files.length} 张参考图`);
    }

    /**
     * Renders reference image previews
     * @private
     */
    _renderPreviews() {
        if (!this.elements.previewBox) return;

        clearElement(this.elements.previewBox);

        this.refImages.forEach((img, index) => {
            const div = document.createElement('div');
            div.className = 'xhs-preview-item';
            div.style.backgroundImage = `url(${img.src})`;
            div.innerHTML = '<div class="preview-close">×</div>';

            div.querySelector('.preview-close').addEventListener('click', () => {
                this.refImages.splice(index, 1);
                this._renderPreviews();
            });

            this.elements.previewBox.appendChild(div);
        });
    }

    /**
     * Copies title to clipboard
     * @private
     */
    _copyTitle() {
        if (!this.currentData?.title) {
            toast.warning('没有可复制的标题');
            return;
        }

        navigator.clipboard.writeText(this.currentData.title).then(() => {
            toast.success('标题已复制');
        }).catch(err => {
            console.error('[XHSModule] Copy error:', err);
            toast.error('复制失败');
        });
    }

    /**
     * Copies content to clipboard
     * @private
     */
    _copyContent() {
        if (!this.currentData?.content) {
            toast.warning('没有可复制的内容');
            return;
        }

        navigator.clipboard.writeText(this.currentData.content).then(() => {
            toast.success('内容已复制');
        }).catch(err => {
            console.error('[XHSModule] Copy error:', err);
            toast.error('复制失败');
        });
    }

    /**
     * Clears all history
     * @private
     */
    async _clearHistory() {
        if (!confirm('确定清空所有历史记录？')) return;

        try {
            await dbService.xhs.clear();
            await this.renderHistory();
            toast.success('历史记录已清空');
        } catch (error) {
            console.error('[XHSModule] Clear history error:', error);
            toast.error('清空失败');
        }
    }

    /**
     * Batch generates all shot images
     * @private
     */
    async _batchGenerate() {
        if (!this.currentData?.shots) {
            toast.warning('没有可生成的分镜');
            return;
        }

        const ungenerated = this.currentData.shots
            .map((shot, index) => ({ shot, index }))
            .filter(({ shot }) => !shot.image);

        if (ungenerated.length === 0) {
            toast.info('所有分镜已生成');
            return;
        }

        toast.info(`开始批量生成 ${ungenerated.length} 个分镜...`);

        for (const { index } of ungenerated) {
            await this.generateShotImage(index);
        }

        toast.success('批量生成完成');
    }

    /**
     * Toggles history panel
     * @private
     */
    _toggleHistory() {
        const historyPanel = $('#xhs-history-panel');
        if (historyPanel) {
            const isVisible = historyPanel.style.display === 'block';
            historyPanel.style.display = isVisible ? 'none' : 'block';
        }
    }

    /**
     * Formats content text to HTML
     * @private
     */
    _formatContent(content) {
        return escapeHtml(content).replace(/\n/g, '<br>');
    }
}

// Export as default
export default XHSModule;
