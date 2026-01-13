/**
 * Provider service - manages AI providers (Gemini, OpenAI, etc.)
 * Communicates with backend API for CRUD operations
 */

import api from '../core/api.js';
import { ENDPOINTS } from '../config/constants.js';
import eventBus, { EVENTS } from '../core/eventBus.js';

/**
 * Provider service
 */
export const providerService = {
    /**
     * Gets all providers
     * @returns {Promise<Array>} Array of provider objects
     */
    async getProviders() {
        try {
            console.log('[ProviderService] Fetching providers...');
            const providers = await api.get(ENDPOINTS.PROVIDERS);
            console.log(`[ProviderService] Loaded ${providers.length} providers`);
            return providers;
        } catch (error) {
            console.error('[ProviderService] Error fetching providers:', error);
            throw new Error(`Failed to load providers: ${error.message}`);
        }
    },

    /**
     * Gets a single provider by ID
     * @param {number} id - Provider ID
     * @returns {Promise<Object>} Provider object
     */
    async getProvider(id) {
        try {
            console.log(`[ProviderService] Fetching provider ${id}...`);
            const provider = await api.get(ENDPOINTS.PROVIDER_BY_ID(id));
            return provider;
        } catch (error) {
            console.error(`[ProviderService] Error fetching provider ${id}:`, error);
            throw new Error(`Failed to load provider: ${error.message}`);
        }
    },

    /**
     * Creates a new provider
     * @param {Object} providerData - Provider data
     * @param {string} providerData.name - Provider name
     * @param {string} providerData.type - Provider type ('gemini' or 'openai')
     * @param {string} providerData.host - API host URL
     * @param {string} providerData.api_key - API key
     * @param {string} providerData.model - Model name
     * @returns {Promise<Object>} Created provider object
     */
    async createProvider(providerData) {
        try {
            console.log('[ProviderService] Creating provider:', providerData.name);

            // Validate required fields
            const required = ['name', 'type', 'host', 'api_key', 'model'];
            for (const field of required) {
                if (!providerData[field]) {
                    throw new Error(`Missing required field: ${field}`);
                }
            }

            // Validate type
            if (!['gemini', 'openai'].includes(providerData.type)) {
                throw new Error('Provider type must be "gemini" or "openai"');
            }

            const provider = await api.post(ENDPOINTS.PROVIDERS, providerData);
            console.log('[ProviderService] Provider created:', provider.id);

            // Emit event
            eventBus.emit(EVENTS.PROVIDER_CREATED, provider);

            return provider;
        } catch (error) {
            console.error('[ProviderService] Error creating provider:', error);
            throw new Error(`Failed to create provider: ${error.message}`);
        }
    },

    /**
     * Updates an existing provider
     * @param {number} id - Provider ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated provider object
     */
    async updateProvider(id, updates) {
        try {
            console.log(`[ProviderService] Updating provider ${id}...`);

            // Validate type if provided
            if (updates.type && !['gemini', 'openai'].includes(updates.type)) {
                throw new Error('Provider type must be "gemini" or "openai"');
            }

            const provider = await api.put(ENDPOINTS.PROVIDER_BY_ID(id), updates);
            console.log('[ProviderService] Provider updated:', provider.id);

            // Emit event
            eventBus.emit(EVENTS.PROVIDER_UPDATED, provider);

            return provider;
        } catch (error) {
            console.error(`[ProviderService] Error updating provider ${id}:`, error);
            throw new Error(`Failed to update provider: ${error.message}`);
        }
    },

    /**
     * Deletes a provider
     * @param {number} id - Provider ID
     * @returns {Promise<void>}
     */
    async deleteProvider(id) {
        try {
            console.log(`[ProviderService] Deleting provider ${id}...`);
            await api.delete(ENDPOINTS.PROVIDER_BY_ID(id));
            console.log('[ProviderService] Provider deleted:', id);

            // Emit event
            eventBus.emit(EVENTS.PROVIDER_DELETED, { id });

            return true;
        } catch (error) {
            console.error(`[ProviderService] Error deleting provider ${id}:`, error);
            throw new Error(`Failed to delete provider: ${error.message}`);
        }
    },

    /**
     * Tests a provider connection (optional, if backend supports it)
     * @param {number} id - Provider ID
     * @returns {Promise<boolean>} Connection test result
     */
    async testProvider(id) {
        try {
            console.log(`[ProviderService] Testing provider ${id}...`);
            // This would require a backend endpoint like GET /api/providers/{id}/test
            // For now, we'll just return true
            return true;
        } catch (error) {
            console.error(`[ProviderService] Error testing provider ${id}:`, error);
            return false;
        }
    }
};

// Export as default
export default providerService;
