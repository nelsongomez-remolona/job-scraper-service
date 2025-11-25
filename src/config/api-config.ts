/**
 * API Configuration
 * 
 * ⚠️ SECURITY WARNING:
 * These API keys are visible in the browser (client-side)
 * Only use this for testing/demo purposes with free API keys!
 * 
 * For production, move API calls to a backend server.
 */

export const API_CONFIG = {
  // Adzuna API Configuration
  // Get credentials from: https://developer.adzuna.com/
  adzuna: {
    appId: '', // Add your Adzuna App ID here
    appKey: 'a37dddb8ea86102794318ec67342aa20', // Your Adzuna App Key
    enabled: true,
  },

  // SerpAPI Configuration (Optional)
  // Get API key from: https://serpapi.com/users/sign_up
  serpapi: {
    apiKey: '67c18478e34ad3cceb357993f7fe1bbb15b3e7bfec9f127a7fda5b0d16483907', // Add your SerpAPI key here (optional)
    enabled: true, // ✅ Changed to true - now uses your Railway service!
  },
};

/**
 * How to configure:
 * 
 * 1. Get your Adzuna App ID:
 *    - Go to https://developer.adzuna.com/
 *    - Sign in and find your App ID
 *    - Add it to adzuna.appId above
 * 
 * 2. (Optional) Get SerpAPI key:
 *    - Go to https://serpapi.com/users/sign_up
 *    - Get your free API key (100 searches/month)
 *    - Add it to serpapi.apiKey above
 *    - Set serpapi.enabled = true
 * 
 * Example:
 * 
 * export const API_CONFIG = {
 *   adzuna: {
 *     appId: '12345678',
 *     appKey: '918e6bced493a3b4a656e0bcf50dd6d4',
 *     enabled: true,
 *   },
 *   serpapi: {
 *     apiKey: 'abc123xyz456',
 *     enabled: true,
 *   },
 * };
 */