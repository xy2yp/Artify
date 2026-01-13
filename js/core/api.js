/**
 * API client module
 * Handles HTTP requests with automatic JWT token injection and error handling
 */

import { API_BASE_URL, HTTP_TIMEOUT } from '../config/constants.js';
import auth from './auth.js';

/**
 * API client
 */
export const api = {
    /**
     * Makes an HTTP request
     * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
     * @param {string} endpoint - API endpoint (e.g., '/api/providers')
     * @param {Object} data - Request body (for POST/PUT)
     * @param {Object} options - Additional options
     * @returns {Promise<any>} Response data
     */
    async request(method, endpoint, data = null, options = {}) {
        const {
            timeout = HTTP_TIMEOUT,
            headers = {},
            requireAuth = true
        } = options;

        // Prepare headers
        const requestHeaders = {
            'Content-Type': 'application/json',
            ...headers
        };

        // Add JWT token if authenticated and required
        if (requireAuth) {
            const token = auth.getToken();
            if (token) {
                requestHeaders['Authorization'] = `Bearer ${token}`;
            } else {
                throw new Error('Authentication required');
            }
        }

        // Prepare request config
        const config = {
            method,
            headers: requestHeaders
        };

        // Add body for POST/PUT/PATCH
        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            config.body = JSON.stringify(data);
        }

        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        config.signal = controller.signal;

        try {
            const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
            console.log(`[API] ${method} ${url}`);

            const response = await fetch(url, config);
            clearTimeout(timeoutId);

            // Handle HTTP errors
            if (!response.ok) {
                await this._handleErrorResponse(response);
            }

            // Parse and return response
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            } else if (contentType && contentType.includes('text/html')) {
                // Received HTML instead of expected data - likely an error page
                console.error('[API] Received HTML response when expecting JSON');
                throw new Error('Server returned an error page. Please try again later.');
            } else {
                return await response.text();
            }
        } catch (error) {
            clearTimeout(timeoutId);

            // Handle specific error types
            if (error.name === 'AbortError') {
                console.error('[API] Request timeout');
                throw new Error('Request timeout - please try again');
            }

            if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
                console.error('[API] Network error');
                throw new Error('Network connection failed - please check your connection');
            }

            throw error;
        }
    },

    /**
     * Makes a GET request
     * @param {string} endpoint - API endpoint
     * @param {Object} options - Additional options
     * @returns {Promise<any>} Response data
     */
    async get(endpoint, options = {}) {
        return this.request('GET', endpoint, null, options);
    },

    /**
     * Makes a POST request
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request body
     * @param {Object} options - Additional options
     * @returns {Promise<any>} Response data
     */
    async post(endpoint, data, options = {}) {
        return this.request('POST', endpoint, data, options);
    },

    /**
     * Makes a PUT request
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request body
     * @param {Object} options - Additional options
     * @returns {Promise<any>} Response data
     */
    async put(endpoint, data, options = {}) {
        return this.request('PUT', endpoint, data, options);
    },

    /**
     * Makes a DELETE request
     * @param {string} endpoint - API endpoint
     * @param {Object} options - Additional options
     * @returns {Promise<any>} Response data
     */
    async delete(endpoint, options = {}) {
        return this.request('DELETE', endpoint, null, options);
    },

    /**
     * Makes a PATCH request
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request body
     * @param {Object} options - Additional options
     * @returns {Promise<any>} Response data
     */
    async patch(endpoint, data, options = {}) {
        return this.request('PATCH', endpoint, data, options);
    },

    /**
     * Handles error responses
     * @private
     * @param {Response} response - Fetch response object
     */
    async _handleErrorResponse(response) {
        const status = response.status;

        // Try to parse error message
        let errorMessage = `HTTP ${status}`;
        try {
            const contentType = response.headers.get('content-type');

            // Check if response is HTML (error page)
            if (contentType && contentType.includes('text/html')) {
                console.warn('[API] Received HTML error page instead of JSON');
                errorMessage = this._getHtmlErrorMessage(status);
            } else {
                // Try to parse JSON error
                const errorData = await response.json();
                errorMessage = errorData.detail || errorData.message || errorMessage;
            }
        } catch (e) {
            // Failed to parse error, use status text
            errorMessage = response.statusText || errorMessage;
        }

        // Handle specific status codes
        if (status === 401) {
            console.error('[API] Unauthorized - token expired or invalid');
            // Trigger logout
            auth.logout();
            // Trigger custom event for UI to show login prompt
            window.dispatchEvent(new CustomEvent('auth:tokenExpired'));
            throw new Error('Session expired - please log in again');
        } else if (status === 403) {
            throw new Error('Access forbidden');
        } else if (status === 404) {
            throw new Error('Resource not found');
        } else if (status === 422) {
            throw new Error(`Validation error: ${errorMessage}`);
        } else if (status === 500) {
            throw new Error('Server error - please try again later');
        } else if (status === 502 || status === 503 || status === 504) {
            throw new Error('Service temporarily unavailable - please try again');
        } else if (status === 524) {
            throw new Error('Request timeout - the server took too long to respond. Please try again.');
        } else {
            throw new Error(errorMessage);
        }
    },

    /**
     * Gets user-friendly error message for HTML error pages
     * @private
     * @param {number} status - HTTP status code
     * @returns {string} User-friendly error message
     */
    _getHtmlErrorMessage(status) {
        const messages = {
            400: 'Bad request - please check your input',
            401: 'Unauthorized - please log in',
            403: 'Access forbidden',
            404: 'Resource not found',
            408: 'Request timeout - please try again',
            429: 'Too many requests - please slow down',
            500: 'Server error - please try again later',
            502: 'Bad gateway - service temporarily unavailable',
            503: 'Service unavailable - please try again later',
            504: 'Gateway timeout - please try again',
            524: 'Request timeout - the server took too long to respond'
        };

        return messages[status] || `Server error (${status}) - please try again`;
    }
};

// Export as default for convenience
export default api;
