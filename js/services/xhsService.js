/**
 * XHS (小红书) service - manages XHS Lab configuration and content generation
 * Handles XHS copywriting and shot generation through backend API
 */

import api from '../core/api.js';
import { ENDPOINTS } from '../config/constants.js';
import { stripDataUri } from '../utils/image.js';

/**
 * XHS service
 */
export const xhsService = {
    /**
     * Gets XHS configuration
     * @returns {Promise<Object>} XHS config object
     */
    async getConfig() {
        try {
            console.log('[XHSService] Fetching XHS config...');
            const config = await api.get(ENDPOINTS.XHS_CONFIG);
            console.log('[XHSService] Config loaded:', {
                host: config.host,
                model: config.model,
                hasKey: config.has_key
            });
            return config;
        } catch (error) {
            console.error('[XHSService] Error fetching config:', error);
            throw new Error(`Failed to load XHS config: ${error.message}`);
        }
    },

    /**
     * Updates XHS configuration
     * @param {Object} updates - Config updates
     * @param {string} updates.host - API host URL
     * @param {string} updates.api_key - API key (optional, leave empty to keep existing)
     * @param {string} updates.model - Model name
     * @param {Array<string>} updates.custom_models - Custom model list
     * @returns {Promise<Object>} Updated config object
     */
    async updateConfig(updates) {
        try {
            console.log('[XHSService] Updating XHS config...');

            // Filter out empty api_key to avoid overwriting
            const payload = { ...updates };
            if (payload.api_key === '') {
                delete payload.api_key;
            }

            const config = await api.put(ENDPOINTS.XHS_CONFIG, payload);
            console.log('[XHSService] Config updated');
            return config;
        } catch (error) {
            console.error('[XHSService] Error updating config:', error);
            throw new Error(`Failed to update XHS config: ${error.message}`);
        }
    },

    /**
     * Generates XHS copywriting and shots
     * @param {Object} options - Generation options
     * @param {string} options.topic - Topic/theme for the content
     * @param {Array<string>} options.images - Reference images (base64)
     * @param {number} options.imageCount - Number of shots to generate (default: 9)
     * @param {number} options.providerId - XHS provider ID to use
     * @param {string} options.systemPrompt - Custom system prompt
     * @returns {Promise<Object>} Generation result with id, title, content, shots
     */
    async generate(options) {
        const {
            topic,
            images = [],
            imageCount = 9,
            providerId,
            systemPrompt = ''
        } = options;

        // Validate required parameters
        if (!topic) {
            throw new Error('Topic is required for XHS generation');
        }

        if (!providerId) {
            throw new Error('Provider ID is required for XHS generation');
        }

        try {
            console.log('[XHSService] Starting XHS generation...', {
                topic,
                imageCount: images.length,
                shotCount: imageCount,
                providerId
            });

            // Prepare image data (strip data URI prefixes)
            const imageData = images.map(img => stripDataUri(img));

            // Prepare request body
            const requestBody = {
                topic,
                images: imageData,
                image_count: imageCount,
                provider_id: providerId,
                system_prompt: systemPrompt
            };

            // Call backend API
            const response = await api.post(ENDPOINTS.XHS_GENERATE, requestBody, {
                timeout: 180000 // 3 minutes
            });

            console.log('[XHSService] Generation complete:', {
                id: response.id,
                title: response.title,
                shotCount: response.shots?.length
            });

            return response;
        } catch (error) {
            console.error('[XHSService] Generation error:', error);
            throw new Error(`XHS generation failed: ${error.message}`);
        }
    },

    /**
     * Validates XHS config (checks if properly configured)
     * @returns {Promise<boolean>} True if config is valid
     */
    async validateConfig() {
        try {
            const config = await this.getConfig();
            return config.has_key && config.host && config.model;
        } catch (error) {
            console.error('[XHSService] Config validation error:', error);
            return false;
        }
    }
};

// Export as default
export default xhsService;
