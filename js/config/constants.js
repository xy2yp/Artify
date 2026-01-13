/**
 * Application constants and configuration
 */

// API Base URL - empty string means same origin (nginx will proxy /api to backend)
export const API_BASE_URL = import.meta.env?.VITE_API_URL || '';

// Authentication
export const TOKEN_KEY = 'auth_token';
export const TOKEN_EXPIRY_KEY = 'auth_token_expiry';

// API Endpoints
export const ENDPOINTS = {
    // Auth
    LOGIN: '/api/auth/login',
    VERIFY: '/api/auth/verify',

    // Providers
    PROVIDERS: '/api/providers',
    PROVIDER_BY_ID: (id) => `/api/providers/${id}`,

    // Generation
    GENERATE: '/api/generate',

    // XHS
    XHS_CONFIG: '/api/xhs-config',
    XHS_GENERATE: '/api/xhs/generate',

    // XHS Providers (多渠道)
    XHS_PROVIDERS: '/api/xhs-providers',
    XHS_PROVIDER_BY_ID: (id) => `/api/xhs-providers/${id}`,

    // Banana Prompts (提示词快查)
    BANANA_PROMPTS: '/api/banana/prompts',
    BANANA_PROMPT_BY_ID: (id) => `/api/banana/prompts/${id}`,
    BANANA_SYNC: '/api/banana/sync',
    BANANA_SYNC_STATUS: '/api/banana/sync/status'
};

// HTTP Config
export const HTTP_TIMEOUT = 120000; // 2 minutes
export const HTTP_RETRY_COUNT = 3;

// Image Config
export const MAX_IMAGE_SIZE = 1536; // pixels
export const IMAGE_QUALITY = 0.85;
export const MAX_IMAGES = 14;

// Resolution options
export const RESOLUTIONS = {
    '1K': 1024,
    '2K': 2048,
    '4K': 4096
};

// Toast duration
export const TOAST_DURATION = 3000; // ms
