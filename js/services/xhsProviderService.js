/**
 * XHS Provider service - manages XHS/文案 API providers
 * Communicates with backend API for CRUD operations
 */

import api from '../core/api.js';
import { ENDPOINTS } from '../config/constants.js';
import eventBus, { EVENTS } from '../core/eventBus.js';

/**
 * XHS Provider service
 */
export const xhsProviderService = {
    /**
     * Gets all XHS providers
     * @returns {Promise<Array>} Array of provider objects
     */
    async getProviders() {
        try {
            console.log('[XHSProviderService] Fetching providers...');
            const providers = await api.get(ENDPOINTS.XHS_PROVIDERS);
            console.log(`[XHSProviderService] Loaded ${providers.length} providers`);
            return providers;
        } catch (error) {
            console.error('[XHSProviderService] Error fetching providers:', error);
            throw new Error(`Failed to load XHS providers: ${error.message}`);
        }
    },

    /**
     * Gets a single XHS provider by ID
     * @param {number} id - Provider ID
     * @returns {Promise<Object>} Provider object
     */
    async getProvider(id) {
        try {
            console.log(`[XHSProviderService] Fetching provider ${id}...`);
            const provider = await api.get(ENDPOINTS.XHS_PROVIDER_BY_ID(id));
            return provider;
        } catch (error) {
            console.error(`[XHSProviderService] Error fetching provider ${id}:`, error);
            throw new Error(`Failed to load XHS provider: ${error.message}`);
        }
    },

    /**
     * Creates a new XHS provider
     * @param {Object} providerData - Provider data
     * @param {string} providerData.name - Provider name
     * @param {string} providerData.host - API host URL
     * @param {string} providerData.api_key - API key
     * @param {string} providerData.model - Model name
     * @returns {Promise<Object>} Created provider object
     */
    async createProvider(providerData) {
        try {
            console.log('[XHSProviderService] Creating provider:', providerData.name);

            // Validate required fields
            const required = ['name', 'host', 'api_key', 'model'];
            for (const field of required) {
                if (!providerData[field]) {
                    throw new Error(`Missing required field: ${field}`);
                }
            }

            const provider = await api.post(ENDPOINTS.XHS_PROVIDERS, providerData);
            console.log('[XHSProviderService] Provider created:', provider.id);

            // Emit event
            eventBus.emit(EVENTS.XHS_PROVIDER_CREATED, provider);

            return provider;
        } catch (error) {
            console.error('[XHSProviderService] Error creating provider:', error);
            throw new Error(`Failed to create XHS provider: ${error.message}`);
        }
    },

    /**
     * Updates an existing XHS provider
     * @param {number} id - Provider ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated provider object
     */
    async updateProvider(id, updates) {
        try {
            console.log(`[XHSProviderService] Updating provider ${id}...`);

            const provider = await api.put(ENDPOINTS.XHS_PROVIDER_BY_ID(id), updates);
            console.log('[XHSProviderService] Provider updated:', provider.id);

            // Emit event
            eventBus.emit(EVENTS.XHS_PROVIDER_UPDATED, provider);

            return provider;
        } catch (error) {
            console.error(`[XHSProviderService] Error updating provider ${id}:`, error);
            throw new Error(`Failed to update XHS provider: ${error.message}`);
        }
    },

    /**
     * Deletes an XHS provider
     * @param {number} id - Provider ID
     * @returns {Promise<void>}
     */
    async deleteProvider(id) {
        try {
            console.log(`[XHSProviderService] Deleting provider ${id}...`);
            await api.delete(ENDPOINTS.XHS_PROVIDER_BY_ID(id));
            console.log('[XHSProviderService] Provider deleted:', id);

            // Emit event
            eventBus.emit(EVENTS.XHS_PROVIDER_DELETED, { id });

            return true;
        } catch (error) {
            console.error(`[XHSProviderService] Error deleting provider ${id}:`, error);
            throw new Error(`Failed to delete XHS provider: ${error.message}`);
        }
    }
};

// Export as default
export default xhsProviderService;
