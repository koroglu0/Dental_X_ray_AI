/**
 * AWS Amplify Configuration
 * Cognito User Pool ayarları
 */

export const awsConfig = {
  Auth: {
    Cognito: {
      userPoolId: 'eu-north-1_ONiI51l8a',
      userPoolClientId: '37q6ca4cj7s4mjk16r8dgq57u4',
      region: 'eu-north-1',
      loginWith: {
        email: true,
        oauth: {
          domain: 'dental-ai-app.auth.eu-north-1.amazoncognito.com', // Cognito domain'inizi buraya yazın
          scopes: ['email', 'profile', 'openid'],
          redirectSignIn: ['http://localhost:5173/auth/callback'],
          redirectSignOut: ['http://localhost:5173/login'],
          responseType: 'code',
          providers: ['Google']
        }
      },
      signUpVerificationMethod: 'code',
      userAttributes: {
        email: {
          required: true,
        },
        name: {
          required: true,
        },
      },
      passwordFormat: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireNumbers: true,
        requireSpecialCharacters: false,
      },
    }
  }
};

// Cognito OAuth URL'leri
export const cognitoOAuthConfig = {
  domain: 'dental-ai-app.auth.eu-north-1.amazoncognito.com', // Cognito domain'inizi buraya yazın
  clientId: '37q6ca4cj7s4mjk16r8dgq57u4',
  redirectUri: 'http://localhost:5173/auth/callback',
  responseType: 'code',
  scope: 'email openid profile',
};

// Google ile giriş için Cognito Hosted UI URL'i oluştur
export const getGoogleSignInUrl = () => {
  const { domain, clientId, redirectUri, responseType, scope } = cognitoOAuthConfig;
  return `https://${domain}/oauth2/authorize?identity_provider=Google&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=${responseType}&client_id=${clientId}&scope=${encodeURIComponent(scope)}`;
};

