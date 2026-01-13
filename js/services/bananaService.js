/**
 * Banana service - manages prompt library with caching
 * Communicates with backend API for CRUD operations
 * Implements two-level cache: Memory + IndexedDB
 */

import api from '../core/api.js';
import { ENDPOINTS } from '../config/constants.js';

// Cache configuration
const CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
const DB_NAME = 'BananaCacheDB';
const DB_VERSION = 1;
const STORE_NAME = 'cache';

/**
 * Banana prompt service with caching
 */
export const bananaService = {
    // Memory cache
    _cache: new Map(),
    _cacheTimestamp: new Map(),

    // IndexedDB instance
    _db: null,
    _dbReady: null,

    /**
     * Initialize IndexedDB connection
     * @private
     */
    _initDB() {
        if (this._dbReady) return this._dbReady;

        this._dbReady = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('[BananaService] IndexedDB open error:', request.error);
                resolve(null); // Don't reject, fallback to memory cache only
            };

            request.onsuccess = () => {
                this._db = request.result;
                console.log('[BananaService] IndexedDB initialized');
                resolve(this._db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'key' });
                    console.log('[BananaService] IndexedDB store created');
                }
            };
        });

        return this._dbReady;
    },

    /**
     * Get data from IndexedDB
     * @private
     */
    async _getFromDB(key) {
        const db = await this._initDB();
        if (!db) return null;

        return new Promise((resolve) => {
            try {
                const transaction = db.transaction(STORE_NAME, 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.get(key);

                request.onsuccess = () => {
                    const result = request.result;
                    if (result && result.timestamp) {
                        // Check if expired
                        if (Date.now() - result.timestamp < CACHE_TTL) {
                            resolve(result.data);
                        } else {
                            resolve(null); // Expired
                        }
                    } else {
                        resolve(null);
                    }
                };

                request.onerror = () => {
                    console.error('[BananaService] IndexedDB read error:', request.error);
                    resolve(null);
                };
            } catch (error) {
                console.error('[BananaService] IndexedDB read exception:', error);
                resolve(null);
            }
        });
    },

    /**
     * Save data to IndexedDB
     * @private
     */
    async _saveToDB(key, data) {
        const db = await this._initDB();
        if (!db) return;

        return new Promise((resolve) => {
            try {
                const transaction = db.transaction(STORE_NAME, 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.put({
                    key,
                    data,
                    timestamp: Date.now()
                });

                request.onsuccess = () => {
                    console.log(`[BananaService] Saved to IndexedDB: ${key}`);
                    resolve(true);
                };

                request.onerror = () => {
                    console.error('[BananaService] IndexedDB write error:', request.error);
                    resolve(false);
                };
            } catch (error) {
                console.error('[BananaService] IndexedDB write exception:', error);
                resolve(false);
            }
        });
    },

    /**
     * Clear all IndexedDB cache
     * @private
     */
    async _clearDB() {
        const db = await this._initDB();
        if (!db) return;

        return new Promise((resolve) => {
            try {
                const transaction = db.transaction(STORE_NAME, 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.clear();

                request.onsuccess = () => {
                    console.log('[BananaService] IndexedDB cache cleared');
                    resolve(true);
                };

                request.onerror = () => {
                    console.error('[BananaService] IndexedDB clear error:', request.error);
                    resolve(false);
                };
            } catch (error) {
                console.error('[BananaService] IndexedDB clear exception:', error);
                resolve(false);
            }
        });
    },

    /**
     * Generate cache key for prompts
     * @private
     */
    _getCacheKey(source) {
        return source ? `prompts_${source}` : 'prompts_all';
    },

    /**
     * Check if memory cache is valid
     * @private
     */
    _isMemoryCacheValid(key) {
        if (!this._cache.has(key)) return false;
        const timestamp = this._cacheTimestamp.get(key);
        if (!timestamp) return false;
        return Date.now() - timestamp < CACHE_TTL;
    },

    /**
     * Invalidate all caches (memory + IndexedDB)
     * Call this after CRUD operations or sync
     */
    async invalidateCache() {
        console.log('[BananaService] Invalidating cache...');

        // Clear memory cache
        this._cache.clear();
        this._cacheTimestamp.clear();

        // Clear IndexedDB cache
        await this._clearDB();

        console.log('[BananaService] Cache invalidated');
    },

    /**
     * Preload prompts into cache (for background loading)
     * @returns {Promise<void>}
     */
    async preload() {
        try {
            console.log('[BananaService] Preloading prompts...');
            await this.getPrompts();
            console.log('[BananaService] Preload complete');
        } catch (error) {
            // Silently fail - preload should not affect main flow
            console.warn('[BananaService] Preload failed:', error.message);
        }
    },

    /**
     * Gets all prompts with caching
     * @param {string} source - Optional filter: 'github' or 'custom'
     * @returns {Promise<Array>} Array of prompt objects
     */
    async getPrompts(source = null) {
        const cacheKey = this._getCacheKey(source);

        // 1. Check memory cache
        if (this._isMemoryCacheValid(cacheKey)) {
            console.log(`[BananaService] Memory cache hit: ${cacheKey}`);
            return this._cache.get(cacheKey);
        }

        // 2. Check IndexedDB cache
        const dbData = await this._getFromDB(cacheKey);
        if (dbData) {
            console.log(`[BananaService] IndexedDB cache hit: ${cacheKey}`);
            // Write to memory cache
            this._cache.set(cacheKey, dbData);
            this._cacheTimestamp.set(cacheKey, Date.now());
            return dbData;
        }

        // 3. Fetch from API
        try {
            console.log(`[BananaService] Fetching prompts from API: ${cacheKey}`);
            const url = source
                ? `${ENDPOINTS.BANANA_PROMPTS}?source=${source}`
                : ENDPOINTS.BANANA_PROMPTS;
            const prompts = await api.get(url);
            console.log(`[BananaService] Loaded ${prompts.length} prompts from API`);

            // Write to memory cache
            this._cache.set(cacheKey, prompts);
            this._cacheTimestamp.set(cacheKey, Date.now());

            // Write to IndexedDB cache (async, don't wait)
            this._saveToDB(cacheKey, prompts);

            return prompts;
        } catch (error) {
            console.error('[BananaService] Error fetching prompts:', error);
            throw new Error(`Failed to load prompts: ${error.message}`);
        }
    },

    /**
     * Gets custom prompts only
     * @returns {Promise<Array>} Array of custom prompt objects
     */
    async getCustomPrompts() {
        return this.getPrompts('custom');
    },

    /**
     * Gets a single prompt by ID
     * @param {number} id - Prompt ID
     * @returns {Promise<Object>} Prompt object
     */
    async getPrompt(id) {
        try {
            console.log(`[BananaService] Fetching prompt ${id}...`);
            const prompt = await api.get(ENDPOINTS.BANANA_PROMPT_BY_ID(id));
            return prompt;
        } catch (error) {
            console.error(`[BananaService] Error fetching prompt ${id}:`, error);
            throw new Error(`Failed to load prompt: ${error.message}`);
        }
    },

    /**
     * Creates a new custom prompt
     * @param {Object} promptData - Prompt data
     * @param {string} promptData.title - Prompt title
     * @param {string} promptData.prompt - Prompt content
     * @param {string} promptData.mode - Mode: 'generate' or 'edit'
     * @param {string} [promptData.category] - Category
     * @param {string} [promptData.author] - Author (defaults to current user)
     * @param {string} [promptData.link] - Related link
     * @param {string} [promptData.image] - Base64 image
     * @returns {Promise<Object>} Created prompt object
     */
    async createPrompt(promptData) {
        try {
            console.log('[BananaService] Creating prompt:', promptData.title);

            // Validate required fields
            const required = ['title', 'prompt'];
            for (const field of required) {
                if (!promptData[field]) {
                    throw new Error(`Missing required field: ${field}`);
                }
            }

            // Set default mode if not provided
            if (!promptData.mode) {
                promptData.mode = 'generate';
            }

            // Validate mode
            if (!['generate', 'edit'].includes(promptData.mode)) {
                throw new Error('Mode must be "generate" or "edit"');
            }

            const prompt = await api.post(ENDPOINTS.BANANA_PROMPTS, promptData);
            console.log('[BananaService] Prompt created:', prompt.id);

            // Invalidate cache after create
            await this.invalidateCache();

            return prompt;
        } catch (error) {
            console.error('[BananaService] Error creating prompt:', error);
            throw new Error(`Failed to create prompt: ${error.message}`);
        }
    },

    /**
     * Updates an existing custom prompt
     * @param {number} id - Prompt ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated prompt object
     */
    async updatePrompt(id, updates) {
        try {
            console.log(`[BananaService] Updating prompt ${id}...`);

            // Validate mode if provided
            if (updates.mode && !['generate', 'edit'].includes(updates.mode)) {
                throw new Error('Mode must be "generate" or "edit"');
            }

            const prompt = await api.put(ENDPOINTS.BANANA_PROMPT_BY_ID(id), updates);
            console.log('[BananaService] Prompt updated:', prompt.id);

            // Invalidate cache after update
            await this.invalidateCache();

            return prompt;
        } catch (error) {
            console.error(`[BananaService] Error updating prompt ${id}:`, error);
            throw new Error(`Failed to update prompt: ${error.message}`);
        }
    },

    /**
     * Deletes a custom prompt
     * @param {number} id - Prompt ID
     * @returns {Promise<boolean>}
     */
    async deletePrompt(id) {
        try {
            console.log(`[BananaService] Deleting prompt ${id}...`);
            await api.delete(ENDPOINTS.BANANA_PROMPT_BY_ID(id));
            console.log('[BananaService] Prompt deleted:', id);

            // Invalidate cache after delete
            await this.invalidateCache();

            return true;
        } catch (error) {
            console.error(`[BananaService] Error deleting prompt ${id}:`, error);
            throw new Error(`Failed to delete prompt: ${error.message}`);
        }
    },

    /**
     * Triggers manual sync from GitHub
     * @returns {Promise<Object>} Sync result
     */
    async triggerSync() {
        try {
            console.log('[BananaService] Triggering sync...');
            const result = await api.post(ENDPOINTS.BANANA_SYNC);
            console.log('[BananaService] Sync result:', result);

            // Invalidate cache after sync
            await this.invalidateCache();

            return result;
        } catch (error) {
            console.error('[BananaService] Error triggering sync:', error);
            throw new Error(`Failed to sync: ${error.message}`);
        }
    },

    /**
     * Gets the latest sync status
     * @returns {Promise<Object>} Sync status object
     */
    async getSyncStatus() {
        try {
            console.log('[BananaService] Fetching sync status...');
            const status = await api.get(ENDPOINTS.BANANA_SYNC_STATUS);
            return status;
        } catch (error) {
            // 404 is expected when no sync has been done yet
            if (error.message?.includes('404')) {
                return null;
            }
            console.error('[BananaService] Error fetching sync status:', error);
            throw new Error(`Failed to get sync status: ${error.message}`);
        }
    },

    /**
     * Uploads image for a prompt (for frontend image supplement)
     * @param {number} id - Prompt ID
     * @param {string} base64 - Base64 encoded image data
     * @returns {Promise<Object>} Result
     */
    async uploadImage(id, base64) {
        try {
            console.log(`[BananaService] Uploading image for prompt ${id}...`);
            const result = await api.patch(`${ENDPOINTS.BANANA_PROMPTS}/${id}/image`, {
                image: base64
            });
            console.log(`[BananaService] Image uploaded for prompt ${id}`);

            // Note: We don't invalidate cache here because this is called
            // during background sync which already manages the local data
            return result;
        } catch (error) {
            console.error(`[BananaService] Error uploading image for prompt ${id}:`, error);
            throw new Error(`Failed to upload image: ${error.message}`);
        }
    }
};

// Export as default
export default bananaService;
