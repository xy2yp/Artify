/**
 * Database service - IndexedDB wrapper for local data storage
 * Handles chat sessions, messages, and XHS history
 */

/**
 * Chat database configuration
 */
const CHAT_DB = {
    name: 'GeminiProDB',
    version: 2,
    stores: {
        sessions: { keyPath: 'id' },
        messages: { keyPath: 'id', autoIncrement: true, indexes: [{ name: 'sessionId', keyPath: 'sessionId' }] }
    }
};

/**
 * XHS database configuration
 */
const XHS_DB = {
    name: 'XHSHistoryDB',
    version: 1,
    stores: {
        history: { keyPath: 'id' }
    }
};

/**
 * Database service
 */
export const dbService = {
    /**
     * Opens a database connection
     * @private
     * @param {Object} config - Database configuration
     * @returns {Promise<IDBDatabase>} Database instance
     */
    async _openDB(config) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(config.name, config.version);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create object stores
                Object.entries(config.stores).forEach(([storeName, storeConfig]) => {
                    if (!db.objectStoreNames.contains(storeName)) {
                        const objectStore = db.createObjectStore(storeName, {
                            keyPath: storeConfig.keyPath,
                            autoIncrement: storeConfig.autoIncrement
                        });

                        // Create indexes
                        if (storeConfig.indexes) {
                            storeConfig.indexes.forEach(index => {
                                objectStore.createIndex(index.name, index.keyPath, { unique: false });
                            });
                        }

                        console.log(`[DB] Created object store: ${storeName}`);
                    }
                });
            };

            request.onsuccess = (event) => {
                resolve(event.target.result);
            };

            request.onerror = (event) => {
                reject(new Error(`Failed to open database ${config.name}: ${event.target.error}`));
            };
        });
    },

    /**
     * Chat database operations
     */
    chat: {
        _db: null,

        async _getDB() {
            if (!this._db) {
                this._db = await dbService._openDB(CHAT_DB);
            }
            return this._db;
        },

        /**
         * Gets all chat sessions
         * @returns {Promise<Array>} Array of session objects
         */
        async getAllSessions() {
            const db = await this._getDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction('sessions', 'readonly');
                const request = tx.objectStore('sessions').getAll();
                request.onsuccess = () => {
                    const sessions = request.result.sort((a, b) => b.id - a.id);
                    resolve(sessions);
                };
                request.onerror = () => reject(request.error);
            });
        },

        /**
         * Creates a new chat session
         * @param {string} title - Session title
         * @returns {Promise<number>} New session ID
         */
        async createSession(title = '新对话') {
            const db = await this._getDB();
            const id = Date.now();

            return new Promise((resolve, reject) => {
                const tx = db.transaction('sessions', 'readwrite');
                const request = tx.objectStore('sessions').add({
                    id,
                    title,
                    timestamp: id
                });
                tx.oncomplete = () => resolve(id);
                tx.onerror = () => reject(tx.error);
            });
        },

        /**
         * Deletes a chat session and its messages
         * @param {number} sessionId - Session ID
         * @returns {Promise<void>}
         */
        async deleteSession(sessionId) {
            const db = await this._getDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(['sessions', 'messages'], 'readwrite');

                // Delete session
                tx.objectStore('sessions').delete(sessionId);

                // Delete all messages for this session
                const index = tx.objectStore('messages').index('sessionId');
                const request = index.openCursor(IDBKeyRange.only(sessionId));

                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        cursor.delete();
                        cursor.continue();
                    }
                };

                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
        },

        /**
         * Updates a session title
         * @param {number} sessionId - Session ID
         * @param {string} title - New title
         * @returns {Promise<void>}
         */
        async updateSessionTitle(sessionId, title) {
            const db = await this._getDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction('sessions', 'readwrite');
                const store = tx.objectStore('sessions');

                const getRequest = store.get(sessionId);
                getRequest.onsuccess = () => {
                    const session = getRequest.result;
                    if (session) {
                        session.title = title;
                        store.put(session);
                    }
                };

                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
        },

        /**
         * Gets all messages for a session
         * @param {number} sessionId - Session ID
         * @returns {Promise<Array>} Array of message objects
         */
        async getSessionMessages(sessionId) {
            const db = await this._getDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction('messages', 'readonly');
                const index = tx.objectStore('messages').index('sessionId');
                const request = index.getAll(sessionId);

                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        },

        /**
         * Saves a message to a session
         * @param {number} sessionId - Session ID
         * @param {string} role - Message role ('user' or 'bot')
         * @param {string} content - Message content
         * @param {Array} images - Message images (base64 array)
         * @param {string} rawHtml - Raw HTML content
         * @returns {Promise<void>}
         */
        async saveMessage(sessionId, role, content, images = [], rawHtml = null) {
            const db = await this._getDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction('messages', 'readwrite');
                const request = tx.objectStore('messages').add({
                    sessionId,
                    role,
                    content,
                    images,
                    rawHtml,
                    timestamp: Date.now()
                });

                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
        }
    },

    /**
     * XHS history operations
     */
    xhs: {
        _db: null,

        async _getDB() {
            if (!this._db) {
                this._db = await dbService._openDB(XHS_DB);
            }
            return this._db;
        },

        /**
         * Gets all XHS history items
         * @returns {Promise<Array>} Array of history items
         */
        async getAll() {
            const db = await this._getDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction('history', 'readonly');
                const request = tx.objectStore('history').getAll();

                request.onsuccess = () => {
                    const items = request.result.sort((a, b) => b.id - a.id);
                    resolve(items);
                };
                request.onerror = () => reject(request.error);
            });
        },

        /**
         * Adds or updates an XHS history item
         * @param {Object} item - History item (must have id property)
         * @returns {Promise<void>}
         */
        async add(item) {
            const db = await this._getDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction('history', 'readwrite');
                tx.objectStore('history').put(item);

                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
        },

        /**
         * Deletes an XHS history item
         * @param {number} id - Item ID
         * @returns {Promise<void>}
         */
        async delete(id) {
            const db = await this._getDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction('history', 'readwrite');
                tx.objectStore('history').delete(id);

                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
        },

        /**
         * Clears all XHS history
         * @returns {Promise<void>}
         */
        async clear() {
            const db = await this._getDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction('history', 'readwrite');
                tx.objectStore('history').clear();

                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
        }
    }
};

// Export as default
export default dbService;
