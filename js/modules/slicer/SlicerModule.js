/**
 * Slicer Module - Image slicing tool
 * Slices images into grids for batch processing
 */

import toast from '../../ui/toast.js';
import { $, clearElement } from '../../utils/dom.js';

/**
 * Slicer Module
 */
export class SlicerModule {
    constructor() {
        this.sourceImage = null;
        this.canvas = null;
        this.ctx = null;
        this.resultGrid = null;
        this.slicedImages = [];
        this.lines = { horizontal: [], vertical: [] };
        this.mode = 'horizontal';

        this.elements = {
            modal: null,
            sourceImg: null,
            overlayCanvas: null,
            resultGrid: null,
            fileInput: null,
            forceSquareCheckbox: null,
            bgColorInput: null,
            colorPickerBox: null,
            processBtn: null,
            downloadAllBtn: null,
            clearBtn: null,
            emptyMsg: null
        };
    }

    /**
     * Initializes the slicer module
     */
    init() {
        console.log('[SlicerModule] Initializing...');

        // Create modal HTML if not exists
        if (!$('#slice-modal')) {
            this._createModal();
        }

        // Get UI elements
        this.elements = {
            modal: $('#slice-modal'),
            sourceImg: $('#slice-source-image'),
            overlayCanvas: $('#slice-overlay-canvas'),
            resultGrid: $('#slice-result-grid'),
            fileInput: $('#slice-file-input'),
            forceSquareCheckbox: $('#slice-force-square'),
            bgColorInput: $('#slice-bg-color'),
            colorPickerBox: $('#slice-color-picker-box'),
            processBtn: $('#slice-process-btn'),
            downloadAllBtn: $('#slice-download-all-btn'),
            clearBtn: $('#slice-clear-btn'),
            emptyMsg: $('#slice-empty-msg')
        };

        this.resultGrid = this.elements.resultGrid;

        // Bind events
        this._bindEvents();

        console.log('[SlicerModule] Initialized');
    }

    /**
     * Creates the modal HTML structure
     * @private
     */
    _createModal() {
        const modalHTML = `
            <div id="slice-modal" style="position:fixed; inset:0; z-index:2500; background:#f8f9fa; display:none; flex-direction:column;">
                <div class="slice-header-bar">
                    <div class="slice-title">
                        <svg width="22" height="22" style="margin-right:8px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="6" cy="6" r="3"/>
                            <circle cx="6" cy="18" r="3"/>
                            <line x1="20" y1="4" x2="8.12" y2="15.88"/>
                            <line x1="14.47" y1="14.48" x2="20" y2="20"/>
                            <line x1="8.12" y1="8.12" x2="12" y2="12"/>
                        </svg>
                        图片分割工厂
                    </div>
                    <div class="slice-close" id="slice-close-btn">
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </div>
                </div>
                <div class="slice-scroll-area">
                    <div class="slice-toolbar">
                        <input type="file" id="slice-file-input" accept="image/*" style="display:none">
                        <button class="slice-action-btn secondary" id="slice-upload-btn">
                            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="17 8 12 3 7 8"/>
                                <line x1="12" y1="3" x2="12" y2="15"/>
                            </svg>
                            更换图片
                        </button>
                        <div class="slice-btn-group">
                            <label class="radio-label active" id="slice-mode-horizontal">
                                <input type="radio" name="slice-mode" value="horizontal" checked>
                                <span>横线 —</span>
                            </label>
                            <label class="radio-label" id="slice-mode-vertical">
                                <input type="radio" name="slice-mode" value="vertical">
                                <span>竖线 |</span>
                            </label>
                        </div>
                        <div class="slice-btn-group">
                            <label class="radio-label" style="display:flex; align-items:center; gap:4px;">
                                <input type="checkbox" id="slice-force-square" style="margin:0;">
                                <span>1:1 补全</span>
                            </label>
                            <div id="slice-color-picker-box" style="display:none; align-items:center; padding:0 8px;">
                                <input type="color" id="slice-bg-color" value="#ffffff" style="width:24px; height:24px; padding:0; border:none; cursor:pointer;">
                            </div>
                        </div>
                        <button class="slice-action-btn secondary" id="slice-clear-btn">清空辅助线</button>
                        <button class="slice-action-btn primary" id="slice-process-btn" disabled>⚡ 生成切片</button>
                        <button class="slice-action-btn download-all" id="slice-download-all-btn" disabled>
                            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="7 10 12 15 17 10"/>
                                <line x1="12" y1="15" x2="12" y2="3"/>
                            </svg>
                            一键打包下载
                        </button>
                    </div>
                    <div id="slice-editor-container">
                        <div id="slice-empty-msg">
                            <div style="margin-bottom:10px;">
                                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#dadce0" stroke-width="1.5">
                                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                                </svg>
                            </div>
                            <div>点击上传本地图片</div>
                        </div>
                        <img id="slice-source-image" src="" alt="Source" style="display:none;" crossorigin="anonymous">
                        <div id="slice-overlay-canvas"></div>
                    </div>
                    <div id="slice-result-grid"></div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    /**
     * Opens slicer with an image
     * @param {string} imageSrc - Image source (base64 or URL)
     */
    open(imageSrc) {
        this.show();

        if (imageSrc) {
            this.loadImage(imageSrc);
        }
    }

    /**
     * Opens slicer for local file upload
     */
    openLocal() {
        this.show();
        // Show empty state
        if (this.elements.emptyMsg) {
            this.elements.emptyMsg.style.display = 'flex';
        }
    }

    /**
     * Loads an image
     * @param {string} imageSrc - Image source
     */
    loadImage(imageSrc) {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
            this.sourceImage = img;

            // Hide empty message
            if (this.elements.emptyMsg) {
                this.elements.emptyMsg.style.display = 'none';
            }

            // Show image
            if (this.elements.sourceImg) {
                this.elements.sourceImg.src = imageSrc;
                this.elements.sourceImg.style.display = 'block';
            }

            // Enable process button
            if (this.elements.processBtn) {
                this.elements.processBtn.disabled = false;
            }

            // Initialize canvas overlay
            this._initOverlay();

            // Auto create 3x3 grid (for 9-grid layout)
            this.autoGrid(3, 3);

            toast.success('图片已加载');
        };

        img.onerror = () => {
            toast.error('图片加载失败');
        };

        img.src = imageSrc;
    }

    /**
     * Shows the slicer modal
     */
    show() {
        if (this.elements.modal) {
            this.elements.modal.style.display = 'flex';
        }
    }

    /**
     * Hides the slicer modal
     */
    hide() {
        if (this.elements.modal) {
            this.elements.modal.style.display = 'none';
        }
        this._reset();
    }

    /**
     * Binds event listeners
     * @private
     */
    _bindEvents() {
        // Close button
        const closeBtn = $('#slice-close-btn');
        closeBtn?.addEventListener('click', () => this.hide());

        // Upload button
        const uploadBtn = $('#slice-upload-btn');
        uploadBtn?.addEventListener('click', () => {
            this.elements.fileInput?.click();
        });

        // File input
        this.elements.fileInput?.addEventListener('change', (e) => {
            this._handleUpload(e);
        });

        // Empty message click (also triggers upload)
        this.elements.emptyMsg?.addEventListener('click', () => {
            this.elements.fileInput?.click();
        });

        // Mode selection
        const modeHorizontal = $('#slice-mode-horizontal');
        const modeVertical = $('#slice-mode-vertical');

        modeHorizontal?.addEventListener('click', () => {
            this.setMode('horizontal', modeHorizontal);
        });

        modeVertical?.addEventListener('click', () => {
            this.setMode('vertical', modeVertical);
        });

        // Force square checkbox
        this.elements.forceSquareCheckbox?.addEventListener('change', (e) => {
            if (this.elements.colorPickerBox) {
                this.elements.colorPickerBox.style.display = e.target.checked ? 'flex' : 'none';
            }
        });

        // Clear button
        this.elements.clearBtn?.addEventListener('click', () => {
            this.clearLines();
        });

        // Process button
        this.elements.processBtn?.addEventListener('click', () => {
            this.process();
        });

        // Download all button
        this.elements.downloadAllBtn?.addEventListener('click', () => {
            this.downloadAll();
        });

        // Canvas click to add lines
        this.elements.overlayCanvas?.addEventListener('click', (e) => {
            this._handleCanvasClick(e);
        });
    }

    /**
     * Sets the slicing mode
     * @param {string} mode - 'horizontal' or 'vertical'
     * @param {HTMLElement} btnEl - Button element
     */
    setMode(mode, btnEl) {
        this.mode = mode;

        // Update active class
        const labels = document.querySelectorAll('#slice-modal .radio-label');
        labels.forEach(l => l.classList.remove('active'));
        btnEl?.classList.add('active');
    }

    /**
     * Auto-creates a grid of lines
     * @param {number} rows - Number of rows
     * @param {number} cols - Number of columns
     */
    autoGrid(rows, cols) {
        if (!this.canvas || !this.sourceImage) return;

        // Add horizontal lines
        for (let i = 1; i < rows; i++) {
            const y = (i / rows) * this.sourceImage.height;
            this.lines.horizontal.push(y);
        }

        // Add vertical lines
        for (let j = 1; j < cols; j++) {
            const x = (j / cols) * this.sourceImage.width;
            this.lines.vertical.push(x);
        }

        this._drawLines();
    }

    /**
     * Initializes the overlay canvas
     * @private
     */
    _initOverlay() {
        if (!this.elements.overlayCanvas || !this.elements.sourceImg) return;

        // Create canvas element
        const canvas = document.createElement('canvas');
        canvas.style.cssText = 'position:absolute; top:0; left:0; cursor:crosshair;';

        // Clear and append
        clearElement(this.elements.overlayCanvas);
        this.elements.overlayCanvas.appendChild(canvas);

        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Set canvas size to match image
        const img = this.elements.sourceImg;
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;

        // Clear lines
        this.lines = { horizontal: [], vertical: [] };
        this._drawLines();
    }

    /**
     * Handles canvas click to add lines
     * @private
     */
    _handleCanvasClick(e) {
        if (!this.canvas || !this.sourceImage) return;

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        if (this.mode === 'horizontal') {
            this.lines.horizontal.push(y);
        } else {
            this.lines.vertical.push(x);
        }

        this._drawLines();
    }

    /**
     * Draws cutting lines on canvas
     * @private
     */
    _drawLines() {
        if (!this.canvas || !this.ctx) return;

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw horizontal lines
        this.ctx.strokeStyle = '#ff4444';
        this.ctx.lineWidth = 2;

        this.lines.horizontal.forEach(y => {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        });

        // Draw vertical lines
        this.lines.vertical.forEach(x => {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        });
    }

    /**
     * Clears all cutting lines
     */
    clearLines() {
        this.lines = { horizontal: [], vertical: [] };
        this._drawLines();
        toast.info('已清空辅助线');
    }

    /**
     * Processes the image and generates slices
     */
    process() {
        if (!this.sourceImage) {
            toast.warning('请先上传图片');
            return;
        }

        const hLines = [0, ...this.lines.horizontal.sort((a, b) => a - b), this.sourceImage.height];
        const vLines = [0, ...this.lines.vertical.sort((a, b) => a - b), this.sourceImage.width];

        if (hLines.length < 2 || vLines.length < 2) {
            toast.warning('请至少添加一条切割线');
            return;
        }

        try {
            // Show processing message
            this.resultGrid.innerHTML = '<div style="width:100%;text-align:center;padding:20px;color:#666;">⚡ 正在处理...</div>';

            this.slicedImages = [];

            const isForceSquare = this.elements.forceSquareCheckbox?.checked;
            const fillColor = this.elements.bgColorInput?.value || '#FFFFFF';

            // Use setTimeout to allow UI to update
            setTimeout(() => {
                clearElement(this.resultGrid);

                // Generate slices
                for (let i = 0; i < hLines.length - 1; i++) {
                    for (let j = 0; j < vLines.length - 1; j++) {
                        const srcX = vLines[j];
                        const srcY = hLines[i];
                        const srcW = vLines[j + 1] - vLines[j];
                        const srcH = hLines[i + 1] - hLines[i];

                        if (srcW < 1 || srcH < 1) continue;

                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');

                        if (isForceSquare) {
                            // Make square with padding
                            const maxDim = Math.max(srcW, srcH);
                            canvas.width = maxDim;
                            canvas.height = maxDim;

                            // Fill background
                            ctx.fillStyle = fillColor;
                            ctx.fillRect(0, 0, maxDim, maxDim);

                            // Draw image centered
                            ctx.drawImage(
                                this.sourceImage,
                                srcX, srcY, srcW, srcH,
                                (maxDim - srcW) / 2, (maxDim - srcH) / 2, srcW, srcH
                            );
                        } else {
                            // Original aspect ratio
                            canvas.width = srcW;
                            canvas.height = srcH;
                            ctx.drawImage(
                                this.sourceImage,
                                srcX, srcY, srcW, srcH,
                                0, 0, srcW, srcH
                            );
                        }

                        const dataUrl = canvas.toDataURL('image/png', 1.0);
                        this.slicedImages.push({
                            dataUrl,
                            index: i * (vLines.length - 1) + j + 1
                        });

                        // Render preview
                        this._renderSlicedPreview(dataUrl, i * (vLines.length - 1) + j + 1);
                    }
                }

                // Enable download all button
                if (this.elements.downloadAllBtn) {
                    this.elements.downloadAllBtn.disabled = false;
                }

                toast.success(`切割完成，共 ${this.slicedImages.length} 张`);
            }, 100);

        } catch (error) {
            console.error('[SlicerModule] Process error:', error);
            toast.error('切割失败');
        }
    }

    /**
     * Renders a sliced image preview
     * @private
     */
    _renderSlicedPreview(dataUrl, index) {
        const div = document.createElement('div');
        div.className = 'slice-card';

        // Get image dimensions from canvas
        const img = new Image();
        img.src = dataUrl;

        const imgEl = document.createElement('img');
        imgEl.src = dataUrl;
        imgEl.className = 'slice-img-result';
        imgEl.alt = `Slice ${index}`;

        const info = document.createElement('div');
        info.className = 'slice-info';

        // Calculate dimensions
        img.onload = () => {
            info.innerText = `${img.width} x ${img.height}`;
        };

        // Click to download
        div.onclick = () => {
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `slice_${index}.png`;
            link.click();
        };

        div.appendChild(imgEl);
        div.appendChild(info);

        this.resultGrid?.appendChild(div);
    }

    /**
     * Downloads a single sliced image
     * @param {number} index - Image index
     */
    downloadSingle(index) {
        if (!this.slicedImages[index]) return;

        const link = document.createElement('a');
        link.href = this.slicedImages[index].dataUrl;
        link.download = `slice_${this.slicedImages[index].index}.png`;
        link.click();
        toast.success('下载完成');
    }

    /**
     * Downloads all sliced images as a ZIP
     */
    async downloadAll() {
        if (this.slicedImages.length === 0) {
            toast.warning('没有可下载的图片');
            return;
        }

        // Check if JSZip is available
        if (typeof JSZip === 'undefined') {
            // Fall back to download individually
            this.slicedImages.forEach((img, i) => {
                setTimeout(() => this.downloadSingle(i), i * 200);
            });
            toast.info('正在逐个下载...');
            return;
        }

        try {
            toast.info('正在打包...');

            const zip = new JSZip();
            const folder = zip.folder('sliced-images');

            // Add images to ZIP
            this.slicedImages.forEach(img => {
                const base64 = img.dataUrl.split(',')[1];
                folder.file(`slice_${img.index}.png`, base64, { base64: true });
            });

            // Generate ZIP
            const blob = await zip.generateAsync({ type: 'blob' });

            // Download ZIP
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `sliced-images-${Date.now()}.zip`;
            link.click();

            toast.success('打包下载完成');

        } catch (error) {
            console.error('[SlicerModule] Download all error:', error);
            toast.error('打包失败，尝试逐个下载');

            // Fallback
            this.slicedImages.forEach((img, i) => {
                setTimeout(() => this.downloadSingle(i), i * 200);
            });
        }
    }

    /**
     * Handles image upload
     * @private
     */
    _handleUpload(e) {
        const file = e.target.files[0];
        if (!file || !file.type.startsWith('image/')) {
            toast.error('请选择图片文件');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            this.open(event.target.result);
        };
        reader.readAsDataURL(file);

        e.target.value = ''; // Reset
    }

    /**
     * Resets the slicer state
     * @private
     */
    _reset() {
        this.sourceImage = null;
        this.slicedImages = [];

        if (this.canvas) {
            this.ctx?.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }

        clearElement(this.resultGrid);
    }
}

// Export as default
export default SlicerModule;
