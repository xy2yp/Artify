/**
 * Generate service - handles image generation through backend API
 * Supports both Gemini and OpenAI provider formats
 */

import api from '../core/api.js';
import { ENDPOINTS } from '../config/constants.js';
import eventBus, { EVENTS } from '../core/eventBus.js';
import { stripDataUri } from '../utils/image.js';

/**
 * Generate service
 */
export const generateService = {
    /**
     * Generates images using a provider
     * @param {Object} options - Generation options
     * @param {number} options.providerId - Provider ID to use
     * @param {string} options.prompt - Text prompt
     * @param {Array<string>} options.images - Reference images (base64 with or without data URI)
     * @param {Array<Object>} options.historyMessages - History messages for context [{role, content}]
     * @param {Array<string>} options.contextImages - History images collected from context (base64)
     * @param {Object} options.settings - Generation settings
     * @param {string} options.settings.resolution - Resolution ('1K', '2K', '4K')
     * @param {string} options.settings.aspect_ratio - Aspect ratio (e.g., '16:9')
     * @param {boolean} options.settings.streaming - Enable streaming (not yet supported)
     * @returns {Promise<Object>} Generation result
     */
    async generate(options) {
        const {
            providerId,
            prompt,
            images = [],
            historyMessages = [],
            contextImages = [],
            settings = {}
        } = options;

        // Validate required parameters
        if (!providerId) {
            throw new Error('Provider ID is required');
        }
        if (!prompt && images.length === 0) {
            throw new Error('Either prompt or images must be provided');
        }

        try {
            console.log('[GenerateService] Starting generation...', {
                providerId,
                promptLength: prompt?.length,
                imageCount: images.length,
                historyCount: historyMessages.length,
                contextImageCount: contextImages.length,
                settings
            });

            // Emit start event
            eventBus.emit(EVENTS.GENERATION_START, { providerId, prompt });

            // Prepare image data (strip data URI prefixes)
            const imageData = images.map(img => {
                const stripped = stripDataUri(img);
                return stripped;
            });

            // Prepare context images (strip data URI prefixes)
            const contextImageData = contextImages.map(img => {
                const stripped = stripDataUri(img);
                return stripped;
            });

            // Prepare request body
            const requestBody = {
                provider_id: providerId,
                prompt: prompt || '',
                images: imageData,
                history_messages: historyMessages,
                context_images: contextImageData,
                settings: {
                    resolution: settings.resolution || '2K',
                    aspect_ratio: settings.aspect_ratio || '16:9',
                    streaming: settings.streaming || false
                }
            };

            // Call backend API
            const response = await api.post(ENDPOINTS.GENERATE, requestBody, {
                timeout: 180000 // 3 minutes for image generation
            });

            console.log('[GenerateService] Generation complete');

            // Parse response based on format
            const result = this._parseGenerationResponse(response);

            // Emit complete event
            eventBus.emit(EVENTS.GENERATION_COMPLETE, result);

            return result;
        } catch (error) {
            console.error('[GenerateService] Generation error:', error);

            // Clean up error message (remove HTML tags if present)
            let errorMessage = error.message;
            if (errorMessage.includes('<!DOCTYPE') || errorMessage.includes('<html')) {
                console.warn('[GenerateService] Received HTML in error message, cleaning up');
                errorMessage = 'Request timeout - the server took too long to respond. Please try again.';
            }

            // Emit error event
            eventBus.emit(EVENTS.GENERATION_ERROR, {
                error: errorMessage,
                providerId,
                prompt
            });

            throw new Error(`Generation failed: ${errorMessage}`);
        }
    },

    /**
     * Parses generation response from backend
     * Handles both direct JSON and SSE format responses
     * @private
     * @param {Object|string} response - Backend API response
     * @returns {Object} Parsed result with text and images
     */
    _parseGenerationResponse(response) {
        let parsedData = response;

        // Handle SSE format: "data: {...}\n\ndata: {...}"
        if (typeof response === 'string') {
            console.log('[GenerateService] Received string response, parsing SSE format...');

            // Split by SSE event delimiter and find all data events
            const lines = response.split('\n');
            const dataLines = lines.filter(line => line.startsWith('data: '));

            if (dataLines.length > 0) {
                // Get the last complete data event (usually contains the final result)
                const lastDataLine = dataLines[dataLines.length - 1];
                const jsonStr = lastDataLine.substring(6); // Remove "data: " prefix

                try {
                    parsedData = JSON.parse(jsonStr);
                    console.log('[GenerateService] Parsed SSE data:', parsedData);
                } catch (e) {
                    console.error('[GenerateService] Failed to parse SSE JSON:', e);
                    // Try to parse the whole response as JSON
                    try {
                        parsedData = JSON.parse(response);
                    } catch (e2) {
                        console.error('[GenerateService] Failed to parse as JSON:', e2);
                        parsedData = { text: response, images: [] };
                    }
                }
            } else {
                // No SSE format, try to parse as plain JSON
                try {
                    parsedData = JSON.parse(response);
                } catch (e) {
                    parsedData = { text: response, images: [] };
                }
            }
        }

        // Handle OpenAI chat completion format
        if (parsedData.choices && parsedData.choices[0]?.message?.content) {
            console.log('[GenerateService] Detected OpenAI format, extracting content...');
            const content = parsedData.choices[0].message.content;
            parsedData = this._parseOpenAIContent(content);
        }

        // Build result
        const result = {
            text: parsedData.text || '',
            images: parsedData.images || [],
            raw: response
        };

        console.log('[GenerateService] Parsed result:', {
            textLength: result.text.length,
            imageCount: result.images.length
        });

        return result;
    },

    /**
     * Parses OpenAI message content for text and images
     * @private
     * @param {string} content - Message content
     * @returns {Object} Parsed result with text and images
     */
    _parseOpenAIContent(content) {
        const result = { text: '', images: [] };

        // Extract base64 images: ![...](data:image/...;base64,...)
        const dataUrlPattern = /!\[.*?\]\((data:image\/[^)]+)\)/g;
        let match;
        while ((match = dataUrlPattern.exec(content)) !== null) {
            result.images.push({
                base64: match[1],
                mimeType: this._extractMimeType(match[1])
            });
        }

        // Extract URL images: ![...](https://...)
        const httpUrlPattern = /!\[.*?\]\((https?:\/\/[^)]+)\)/g;
        while ((match = httpUrlPattern.exec(content)) !== null) {
            // URL images would need to be fetched, for now just note them
            console.log('[GenerateService] Found URL image (not fetched):', match[1]);
        }

        // Remove image markdown from text
        let text = content.replace(dataUrlPattern, '');
        text = text.replace(httpUrlPattern, '');
        result.text = text.trim();

        return result;
    },

    /**
     * Extracts MIME type from data URI
     * @private
     * @param {string} dataUri - Data URI string
     * @returns {string} MIME type (e.g., 'image/png')
     */
    _extractMimeType(dataUri) {
        const match = dataUri.match(/data:([^;]+);/);
        return match ? match[1] : 'image/jpeg';
    },

    /**
     * Cancels ongoing generation (if supported by backend)
     * @param {string} generationId - Generation ID to cancel
     * @returns {Promise<boolean>} Success status
     */
    async cancel(generationId) {
        try {
            console.log('[GenerateService] Cancelling generation:', generationId);
            // This would require a backend endpoint like DELETE /api/generate/{id}
            // For now, we'll just log it
            return true;
        } catch (error) {
            console.error('[GenerateService] Cancel error:', error);
            return false;
        }
    }
};

// Export as default
export default generateService;
