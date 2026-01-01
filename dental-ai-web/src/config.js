/**
 * Application Configuration
 * Frontend ayarları
 */

export const config = {
  // API Base URL
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',
  
  // Google OAuth Configuration
  // Google Cloud Console'dan OAuth 2.0 Client ID oluşturun:
  // https://console.cloud.google.com/apis/credentials
  // Authorized JavaScript origins: http://localhost:5173
  // Authorized redirect URIs: http://localhost:5173
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID',
};

export default config;
