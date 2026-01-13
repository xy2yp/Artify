/**
 * Chat Module - Main chat interface
 * Handles chat sessions, message sending, and history
 */

import stateManager from '../../core/state.js';
import eventBus, { EVENTS } from '../../core/eventBus.js';
import dbService from '../../services/dbService.js';
import providerService from '../../services/providerService.js';
import generateService from '../../services/generateService.js';
import toast from '../../ui/toast.js';
import loading from '../../ui/loading.js';
import lightbox from '../../ui/lightbox.js';
import { escapeHtml } from '../../utils/format.js';
import { compressImage, base64ToBlobUrl, ensureDataUri, downloadImage } from '../../utils/image.js';
import { $, $$, scrollToBottom, clearElement } from '../../utils/dom.js';
import { getFirstThinkingMessage, getNextThinkingMessage, resetThinkingIndex, getRandomInterval } from '../../config/thinkingMessages.js';

/**
 * Chat Module
 */
export class ChatModule {
    constructor() {
        this.currentSessionId = null;
        this.activeGenerations = new Set();
        this.blobManager = new Map(); // Store blob URLs for cleanup
        this.emptyStateElement = null; // Store empty-state element reference
        this.thinkingTimer = null; // Timer for thinking message rotation

        // UI elements
        this.elements = {
            chatHistory: null,
            textarea: null,
            sendBtn: null,
            fileInput: null,
            previewArea: null,
            sessionList: null,
            newChatBtn: null
        };
    }

    /**
     * Initializes the chat module
     */
    async init() {
        console.log('[ChatModule] Initializing...');

        // Get UI elements
        this.elements = {
            chatHistory: $('#chat-history'),
            textarea: $('#user-input'),
            sendBtn: $('#send-btn'),
            fileInput: $('#file-input'),
            uploadBtn: $('#upload-btn-icon'),
            previewArea: $('#preview-area'),
            sessionList: $('#session-list'),
            newChatBtn: $('#new-chat-btn')
        };

        // Bind events
        this._bindEvents();

        // Subscribe to state changes
        stateManager.subscribe('isGenerating', () => {
            this._checkInput(); // Update button state when generation status changes
        });

        // Save empty-state element reference
        this.emptyStateElement = $('#empty-state');

        // Load first session or create new one
        await this._loadInitialSession();

        // Initialize lightbox
        lightbox.init();

        console.log('[ChatModule] Initialized');
    }

    /**
     * Binds event listeners
     * @private
     */
    _bindEvents() {
        // Send button
        this.elements.sendBtn?.addEventListener('click', () => this.sendMessage());

        // Textarea events
        this.elements.textarea?.addEventListener('input', () => {
            this._adjustTextareaHeight();
            this._checkInput();
        });

        this.elements.textarea?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Paste images
        this.elements.textarea?.addEventListener('paste', async (e) => {
            await this._handlePaste(e);
        });

        // File input
        this.elements.fileInput?.addEventListener('change', async (e) => {
            await this._handleFiles(e.target.files);
            e.target.value = ''; // Reset input
        });

        // Upload button - triggers file input
        this.elements.uploadBtn?.addEventListener('click', () => {
            this.elements.fileInput?.click();
        });

        // Note: New chat button is handled by main.js with auth check

        // Event bus subscriptions
        eventBus.on(EVENTS.SESSION_LOADED, (data) => {
            this.currentSessionId = data.sessionId;
        });

        eventBus.on(EVENTS.PROVIDER_SELECTED, (data) => {
            stateManager.set('selectedProviderId', data.providerId);
        });
    }

    /**
     * Loads initial session or creates new one
     * @private
     */
    async _loadInitialSession() {
        const sessions = await dbService.chat.getAllSessions();
        if (sessions.length > 0) {
            await this.loadSession(sessions[0].id);
        } else {
            await this.createNewSession();
        }
        // renderSessionList is already called in loadSession/createNewSession
    }

    /**
     * Creates a new chat session
     * @param {string} title - Session title
     */
    async createNewSession(title = '新对话') {
        try {
            const sessionId = await dbService.chat.createSession(title);
            await this.loadSession(sessionId);
            await this.renderSessionList();

            eventBus.emit(EVENTS.SESSION_CREATED, { sessionId, title });
            toast.success('创建新对话');
        } catch (error) {
            console.error('[ChatModule] Create session error:', error);
            toast.error('创建对话失败');
        }
    }

    /**
     * Loads a chat session
     * @param {number} sessionId - Session ID
     */
    async loadSession(sessionId) {
        try {
            this.currentSessionId = sessionId;
            stateManager.set('currentSessionId', sessionId);

            // Save empty-state before clearing (if it's still in DOM)
            const emptyState = this.elements.chatHistory.querySelector('#empty-state');
            if (emptyState && !this.emptyStateElement) {
                this.emptyStateElement = emptyState;
            }

            // Clear current UI
            clearElement(this.elements.chatHistory);
            stateManager.set('images', []);
            this._renderPreviews();

            // Load messages
            const messages = await dbService.chat.getSessionMessages(sessionId);

            // Show empty-state if no messages, otherwise show messages
            if (messages.length === 0 && this.emptyStateElement) {
                this.elements.chatHistory.appendChild(this.emptyStateElement);
            } else {
                messages.forEach(msg => {
                    this._appendMessageToUI(msg.role, msg.rawHtml || msg.content, msg.content, msg.images);
                });
            }

            // Update session list UI (after currentSessionId is set)
            await this.renderSessionList();

            // Scroll to bottom
            scrollToBottom(this.elements.chatHistory);

            eventBus.emit(EVENTS.SESSION_LOADED, { sessionId });
            console.log('[ChatModule] Session loaded:', sessionId);
        } catch (error) {
            console.error('[ChatModule] Load session error:', error);
            toast.error('加载对话失败');
        }
    }

    /**
     * Deletes a session
     * @param {number} sessionId - Session ID
     */
    async deleteSession(sessionId) {
        if (!confirm('确定删除此对话？')) return;

        try {
            await dbService.chat.deleteSession(sessionId);

            // If deleted current session, load another
            if (sessionId === this.currentSessionId) {
                const sessions = await dbService.chat.getAllSessions();
                if (sessions.length > 0) {
                    await this.loadSession(sessions[0].id);
                } else {
                    await this.createNewSession();
                }
            }

            await this.renderSessionList();
            eventBus.emit(EVENTS.SESSION_DELETED, { sessionId });
            toast.success('对话已删除');
        } catch (error) {
            console.error('[ChatModule] Delete session error:', error);
            toast.error('删除失败');
        }
    }

    /**
     * Renders the session list
     */
    async renderSessionList() {
        if (!this.elements.sessionList) return;

        try {
            const sessions = await dbService.chat.getAllSessions();
            clearElement(this.elements.sessionList);

            sessions.forEach(session => {
                const item = document.createElement('div');
                item.className = 'session-item';
                if (session.id === this.currentSessionId) {
                    item.classList.add('active');
                }

                item.innerHTML = `
                    <span class="session-title">${escapeHtml(session.title)}</span>
                    <span class="session-delete">×</span>
                `;

                // Click anywhere on the card to load session
                item.addEventListener('click', () => {
                    this.loadSession(session.id);
                });

                // Click delete button to delete (stop propagation to prevent loading)
                item.querySelector('.session-delete').addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.deleteSession(session.id);
                });

                this.elements.sessionList.appendChild(item);
            });
        } catch (error) {
            console.error('[ChatModule] Render session list error:', error);
        }
    }

    /**
     * Sends a message
     */
    async sendMessage() {
        const state = stateManager.getState();
        const text = this.elements.textarea?.value.trim();
        const hasImages = state.images.length > 0;

        if (!text && !hasImages) return;

        // Prevent sending while generating
        if (state.isGenerating) {
            toast.warning('正在生成中，请稍候...');
            return;
        }

        // Ensure we have a session
        if (!this.currentSessionId) {
            await this.createNewSession();
        }

        // Check provider
        if (!state.selectedProviderId) {
            toast.warning('请先选择Provider');
            return;
        }

        try {
            // Save user message
            const userImages = state.images.map(img => img.base64);
            await dbService.chat.saveMessage(
                this.currentSessionId,
                'user',
                text,
                userImages
            );

            // Render user message
            this._appendMessageToUI('user', escapeHtml(text), text, userImages);

            // Clear input
            this.elements.textarea.value = '';
            stateManager.set('images', []);
            this._renderPreviews();
            this._adjustTextareaHeight();
            this._checkInput(); // Update button state

            // Generate response
            await this._generateResponse(text, userImages);

        } catch (error) {
            console.error('[ChatModule] Send message error:', error);
            toast.error('发送失败: ' + error.message);
        }
    }

    /**
     * Generates AI response
     * @private
     */
    async _generateResponse(prompt, images) {
        const state = stateManager.getState();
        const generationId = Date.now();

        this.activeGenerations.add(generationId);
        stateManager.set('isGenerating', true);

        // Show loading with thought-box style
        const thinkingMessageId = `thinking-msg-${generationId}`;
        const initialMessage = getFirstThinkingMessage();
        const loadingHtml = `
            <details class="thought-box" open>
                <summary>Painting</summary>
                <div class="thought-content" style="display:flex; align-items:center; gap:10px;">
                    <div class="loading-spinner"></div>
                    <span id="${thinkingMessageId}" class="thinking-text" style="color:#5f6368;">${initialMessage}</span>
                </div>
            </details>
        `;
        const loadingDiv = this._appendMessageToUI('bot', loadingHtml, null, []);

        // Start thinking message rotation
        this._startThinkingRotation(thinkingMessageId);

        try {
            eventBus.emit(EVENTS.GENERATION_START, { prompt, images });

            // Get history messages for context (last 5 rounds = 10 messages)
            let historyMessages = [];
            let contextImages = [];

            try {
                const allMessages = await dbService.chat.getSessionMessages(this.currentSessionId);
                // Get recent messages, excluding the just-saved current user message
                // 5 rounds × 2 messages = 10 messages, plus 1 to exclude current = slice(-11, -1)
                const recentMessages = allMessages.slice(-11, -1);

                console.log('[ChatModule] Context: Found', recentMessages.length, 'history messages');

                // Separate text and images from history
                recentMessages.forEach(msg => {
                    // Add text content to history messages
                    if (msg.content) {
                        historyMessages.push({
                            role: msg.role === 'user' ? 'user' : 'assistant',
                            content: msg.content
                        });
                    }

                    // Collect images from history (will be sent with current message)
                    if (msg.images && msg.images.length > 0) {
                        msg.images.forEach(imgBase64 => {
                            contextImages.push(ensureDataUri(imgBase64));
                        });
                    }
                });

                console.log('[ChatModule] Context: Collected', historyMessages.length, 'text messages,', contextImages.length, 'images');

            } catch (contextError) {
                // If context loading fails, continue without context
                console.warn('[ChatModule] Failed to load context, continuing without:', contextError);
                historyMessages = [];
                contextImages = [];
            }

            // Call generate service with context
            const result = await generateService.generate({
                providerId: state.selectedProviderId,
                prompt,
                images: images.map(img => ensureDataUri(img)),
                historyMessages,
                contextImages,
                settings: {
                    resolution: state.resolution,
                    aspect_ratio: state.aspectRatio,
                    streaming: state.streaming
                }
            });

            // Remove loading
            this._stopThinkingRotation();
            if (loadingDiv) loadingDiv.remove();

            // Format response
            const html = this._formatResponse(result);
            // 后端已统一返回 base64 格式
            const rawImages = result.images.map(img => img.base64);

            // Save bot message
            await dbService.chat.saveMessage(
                this.currentSessionId,
                'bot',
                result.text,
                rawImages,
                html
            );

            // Render bot message
            this._appendMessageToUI('bot', html, result.text, rawImages);

            eventBus.emit(EVENTS.GENERATION_COMPLETE, result);

        } catch (error) {
            console.error('[ChatModule] Generation error:', error);

            this._stopThinkingRotation();
            if (loadingDiv) loadingDiv.remove();

            this._appendMessageToUI('bot', `<div class="error-message">生成失败: ${escapeHtml(error.message)}</div>`, null, []);

            toast.error('生成失败: ' + error.message);
            eventBus.emit(EVENTS.GENERATION_ERROR, { error: error.message });

        } finally {
            this.activeGenerations.delete(generationId);
            if (this.activeGenerations.size === 0) {
                stateManager.set('isGenerating', false);
            }
            // Update button state after generation completes/fails
            this._checkInput();
        }
    }

    /**
     * Starts thinking message rotation
     * @private
     * @param {string} elementId - ID of the thinking message element
     */
    _startThinkingRotation(elementId) {
        // Clear any existing timer
        this._stopThinkingRotation();

        // Function to update the message
        const updateMessage = () => {
            const element = document.getElementById(elementId);
            if (element) {
                const newMessage = getNextThinkingMessage();

                // Add fade-out class
                element.classList.add('fade-out');

                // After fade-out, change text and fade-in
                setTimeout(() => {
                    element.textContent = newMessage;
                    element.classList.remove('fade-out');
                    element.classList.add('fade-in');

                    // Remove fade-in class after animation
                    setTimeout(() => {
                        element.classList.remove('fade-in');
                    }, 300);
                }, 300);
            }

            // Schedule next update with random interval
            const nextInterval = getRandomInterval();
            this.thinkingTimer = setTimeout(updateMessage, nextInterval);
        };

        // Start the first update after a random interval
        const firstInterval = getRandomInterval();
        this.thinkingTimer = setTimeout(updateMessage, firstInterval);

        console.log('[ChatModule] Started thinking message rotation (sequential)');
    }

    /**
     * Stops thinking message rotation
     * @private
     */
    _stopThinkingRotation() {
        if (this.thinkingTimer) {
            clearTimeout(this.thinkingTimer);
            this.thinkingTimer = null;
            resetThinkingIndex(); // Reset index for next generation
            console.log('[ChatModule] Stopped thinking message rotation and reset index');
        }
    }

    /**
     * Formats generation response to HTML
     * @private
     */
    _formatResponse(result) {
        let html = '';

        // Add text as collapsible thought-box
        if (result.text) {
            html += `
                <details class="thought-box" open>
                    <summary>Thinking / Output</summary>
                    <div class="thought-content">${escapeHtml(result.text)}</div>
                </details>
            `;
        }

        // Add images (后端已统一返回 base64 格式)
        if (result.images && result.images.length > 0) {
            result.images.forEach((img) => {
                const src = img.base64;
                const timestamp = Date.now();
                html += `
                    <div class="img-result-group">
                        <img src="${src}" class="generated-image" alt="Generated" />
                        <div class="btn-group">
                            <div class="tool-btn download" onclick="window.chatModule.downloadImage('${src}', 'generated-${timestamp}.png')">
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                    <polyline points="7 10 12 15 17 10"/>
                                    <line x1="12" y1="15" x2="12" y2="3"/>
                                </svg>
                                下载原图
                            </div>
                            <div class="tool-btn" onclick="window.chatModule.useAsReference('${src}')">
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                    <circle cx="8.5" cy="8.5" r="1.5"/>
                                    <polyline points="21 15 16 10 5 21"/>
                                </svg>
                                设为参考图
                            </div>
                            <div class="tool-btn slice-btn" onclick="window.slicerModule.open('${src}')">
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M6 3L6 21"/>
                                    <path d="M18 3L18 21"/>
                                    <path d="M2 12L22 12"/>
                                </svg>
                                切割/表情包
                            </div>
                        </div>
                    </div>
                `;
            });
        }

        return html;
    }

    /**
     * Appends a message to the UI
     * @private
     */
    _appendMessageToUI(role, html, rawText = null, rawImages = []) {
        // Remove empty-state when adding first message
        const emptyState = this.elements.chatHistory.querySelector('#empty-state');
        if (emptyState) {
            emptyState.remove();
        }

        const div = document.createElement('div');
        div.className = `message-row ${role}`;

        if (role === 'user') {
            // User message with image thumbnails and action buttons
            let imagesHtml = '';
            if (rawImages && rawImages.length > 0) {
                imagesHtml = '<div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:8px;">';
                rawImages.forEach(imgBase64 => {
                    const src = imgBase64.startsWith('data:') ? imgBase64 : `data:image/jpeg;base64,${imgBase64}`;
                    imagesHtml += `<img src="${src}" style="width:60px; height:60px; object-fit:cover; border-radius:6px; cursor:pointer;" onclick="window.lightbox.open('${src}')" />`;
                });
                imagesHtml += '</div>';
            }

            // Escape raw text for data attribute
            const escapedText = rawText ? rawText.replace(/'/g, "\\'").replace(/"/g, '&quot;') : '';
            const imagesJson = rawImages ? JSON.stringify(rawImages).replace(/'/g, "\\'") : '[]';

            div.innerHTML = `
                <div class="message-bubble-container">
                    <div class="msg-content">
                        ${imagesHtml}
                        ${html}
                    </div>
                </div>
                <div class="msg-actions">
                    <span class="action-btn" data-text="${escapedText}" onclick="window.chatModule.copyText(this)">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                        复制
                    </span>
                    <span class="action-btn" onclick="window.chatModule.handleEdit('${escapedText}', ${imagesJson})">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                        编辑
                    </span>
                    <span class="action-btn" onclick="window.chatModule.handleRegenerate('${escapedText}', ${imagesJson})">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="23 4 23 10 17 10"/>
                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                        </svg>
                        重新生成
                    </span>
                </div>
            `;
        } else {
            // Bot message
            div.innerHTML = `
                <div class="message-bubble-container">
                    <div class="msg-content" style="padding:0; display:flex; flex-direction:column; gap:12px;">
                        ${html}
                    </div>
                </div>
            `;
        }

        this.elements.chatHistory.appendChild(div);
        scrollToBottom(this.elements.chatHistory);

        // Attach lightbox to images
        div.querySelectorAll('.generated-image').forEach(img => {
            img.onclick = () => lightbox.open(img.src);
        });

        return div;
    }

    /**
     * Handles file upload
     * @private
     */
    async _handleFiles(files) {
        const state = stateManager.getState();
        const filesArray = Array.from(files);

        if (state.images.length + filesArray.length > 14) {
            toast.warning('最多14张图片');
            return;
        }

        for (const file of filesArray) {
            if (!file.type.startsWith('image/')) continue;

            try {
                const compressed = await compressImage(file);
                state.images.push(compressed);
            } catch (error) {
                console.error('[ChatModule] Compress image error:', error);
            }
        }

        stateManager.set('images', state.images);
        this._renderPreviews();
        this._checkInput();
        toast.success(`已添加 ${filesArray.length} 张图片`);
    }

    /**
     * Handles paste event
     * @private
     */
    async _handlePaste(e) {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (const item of items) {
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                const file = item.getAsFile();
                if (file) {
                    await this._handleFiles([file]);
                    toast.success('已粘贴图片');
                }
            }
        }
    }

    /**
     * Renders image previews
     * @private
     */
    _renderPreviews() {
        const state = stateManager.getState();

        if (!this.elements.previewArea) return;

        clearElement(this.elements.previewArea);

        if (state.images.length > 0) {
            this.elements.previewArea.classList.add('has-images');

            state.images.forEach((img, index) => {
                const div = document.createElement('div');
                div.className = 'preview-item';
                div.style.backgroundImage = `url(${img.preview})`;
                div.innerHTML = `<div class="preview-close">×</div>`;

                div.querySelector('.preview-close').addEventListener('click', () => {
                    state.images.splice(index, 1);
                    stateManager.set('images', state.images);
                    this._renderPreviews();
                    this._checkInput();
                });

                this.elements.previewArea.appendChild(div);
            });
        } else {
            this.elements.previewArea.classList.remove('has-images');
        }
    }

    /**
     * Checks input and updates send button state
     * @private
     */
    _checkInput() {
        const state = stateManager.getState();
        const hasText = this.elements.textarea?.value.trim().length > 0;
        const hasImages = state.images.length > 0;
        const isGenerating = state.isGenerating;

        // Button should be active only if: (has content) AND (not generating)
        if ((hasText || hasImages) && !isGenerating) {
            this.elements.sendBtn?.classList.add('active');
        } else {
            this.elements.sendBtn?.classList.remove('active');
        }
    }

    /**
     * Adjusts textarea height based on content
     * @private
     */
    _adjustTextareaHeight() {
        if (!this.elements.textarea) return;

        this.elements.textarea.style.height = 'auto';
        const maxHeight = 150;
        const scrollHeight = this.elements.textarea.scrollHeight;

        if (scrollHeight > maxHeight) {
            this.elements.textarea.style.height = maxHeight + 'px';
            this.elements.textarea.style.overflowY = 'auto';
        } else {
            this.elements.textarea.style.height = scrollHeight + 'px';
            this.elements.textarea.style.overflowY = 'hidden';
        }
    }

    /**
     * Uses an image as reference
     * @param {string} base64 - Image base64
     */
    useAsReference(base64) {
        const state = stateManager.getState();
        const fullB64 = ensureDataUri(base64);
        const raw = base64.includes(',') ? base64.split(',')[1] : base64;

        state.images.push({
            base64: raw,
            mimeType: 'image/jpeg',
            preview: base64ToBlobUrl(fullB64)
        });

        stateManager.set('images', state.images);
        this._renderPreviews();
        this._checkInput();
        this.elements.textarea?.focus();
        toast.success('已设为参考图');
    }

    /**
     * Downloads an image
     * @param {string} base64 - Image base64
     * @param {string} filename - Filename
     */
    downloadImage(base64, filename) {
        downloadImage(base64, filename);
    }

    /**
     * Copies text to clipboard
     * @param {HTMLElement} btn - The button element with data-text attribute
     */
    copyText(btn) {
        const text = btn.getAttribute('data-text');
        if (!text) {
            toast.warning('没有可复制的内容');
            return;
        }

        navigator.clipboard.writeText(text).then(() => {
            toast.success('已复制到剪贴板');
        }).catch(err => {
            console.error('[ChatModule] Copy failed:', err);
            toast.error('复制失败');
        });
    }

    /**
     * Handles editing a message - fills content back to input
     * @param {string} text - Message text
     * @param {Array<string>} images - Message images (base64)
     */
    handleEdit(text, images = []) {
        const state = stateManager.getState();

        // Prevent editing while generating
        if (state.isGenerating) {
            toast.warning('正在生成中，请稍候...');
            return;
        }

        // Fill text to textarea
        if (this.elements.textarea) {
            this.elements.textarea.value = text || '';
            this._adjustTextareaHeight();
        }

        // Add images to preview
        state.images = [];

        if (images && images.length > 0) {
            images.forEach(imgBase64 => {
                const fullB64 = imgBase64.startsWith('data:') ? imgBase64 : `data:image/jpeg;base64,${imgBase64}`;
                const raw = imgBase64.includes(',') ? imgBase64.split(',')[1] : imgBase64;
                state.images.push({
                    base64: raw,
                    mimeType: 'image/jpeg',
                    preview: base64ToBlobUrl(fullB64)
                });
            });
        }

        stateManager.set('images', state.images);
        this._renderPreviews();
        this._checkInput();
        this.elements.textarea?.focus();
        toast.info('已填入输入框，可修改后发送');
    }

    /**
     * Handles regenerating a message - fills content and sends
     * @param {string} text - Message text
     * @param {Array<string>} images - Message images (base64)
     */
    handleRegenerate(text, images = []) {
        const state = stateManager.getState();

        // Prevent regenerating while generating
        if (state.isGenerating) {
            toast.warning('正在生成中，请稍候...');
            return;
        }

        this.handleEdit(text, images);
        // Auto send after a short delay
        setTimeout(() => {
            this.sendMessage();
        }, 100);
    }

    /**
     * Activates sticker/emoji mode
     */
    async activateStickerMode() {
        // Create new session for sticker making
        await this.createNewSession('表情包制作');

        // Set sticker prompt
        const stickerPrompt = '为我生成图中角色的绘制 Q 版的，LINE 风格的半身像表情包，注意头饰要正确\n彩色手绘风格，使用 4x6 布局，涵盖各种各样的常用聊天语句，或是一些有关的娱乐 meme\n其他需求：不要原图复制。所有标注为手写简体中文。';

        if (this.elements.textarea) {
            this.elements.textarea.value = stickerPrompt;
            this._adjustTextareaHeight();
        }

        // Set resolution to 4K
        stateManager.set('resolution', '4K');
        $$('.res-btn').forEach(btn => btn.classList.remove('active'));
        const resBtn4K = document.querySelector('.res-btn[data-val="4K"]');
        if (resBtn4K) {
            resBtn4K.classList.add('active');
        }

        // Set aspect ratio to 16:9
        stateManager.set('aspectRatio', '16:9');
        $$('.ratio-card').forEach(card => card.classList.remove('active'));
        const ratio16_9 = document.querySelector('.ratio-card[data-val="16:9"]');
        if (ratio16_9) {
            ratio16_9.classList.add('active');
        }

        // Show alert
        alert('已进入表情包模式！\n请点击输入框左侧图标上传一张角色参考图，然后点击发送。');

        // Check input state
        this._checkInput();

        // Close sidebar on mobile
        if (window.innerWidth <= 768) {
            const leftSidebar = document.getElementById('left-sidebar');
            const overlay = document.getElementById('overlay');
            leftSidebar?.classList.remove('open');
            overlay?.classList.remove('active');
        }
    }

    /**
     * Cleanup
     */
    destroy() {
        // Clean up blob URLs
        this.blobManager.forEach(url => URL.revokeObjectURL(url));
        this.blobManager.clear();
        console.log('[ChatModule] Destroyed');
    }
}

// Export as default
export default ChatModule;
