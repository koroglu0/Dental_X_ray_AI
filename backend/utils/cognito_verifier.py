"""
Cognito Token Verification Utility
"""
import json
import time
import urllib.request
from jose import jwk, jwt
from jose.utils import base64url_decode
from config.settings import Config

class CognitoTokenVerifier:
    """AWS Cognito JWT token doğrulama"""
    
    def __init__(self):
        self.region = Config.COGNITO_REGION
        self.user_pool_id = Config.COGNITO_USER_POOL_ID
        self.app_client_id = Config.COGNITO_APP_CLIENT_ID
        self.keys_url = f'https://cognito-idp.{self.region}.amazonaws.com/{self.user_pool_id}/.well-known/jwks.json'
        self.keys = None
    
    def _get_keys(self):
        """Cognito public keys'i al (cache'le)"""
        if self.keys:
            return self.keys
        
        with urllib.request.urlopen(self.keys_url) as f:
            response = f.read()
        self.keys = json.loads(response.decode('utf-8'))['keys']
        return self.keys
    
    def verify_token(self, token, token_use='access'):
        """
        Cognito JWT token'ı doğrula
        
        Args:
            token: JWT token string
            token_use: 'access' veya 'id' token
            
        Returns:
            dict: Decoded token claims
            
        Raises:
            ValueError: Token geçersiz veya süresi dolmuş
        """
        # Token header'ını decode et
        try:
            headers = jwt.get_unverified_headers(token)
        except Exception as e:
            raise ValueError(f'Geçersiz token formatı: {str(e)}')
        
        kid = headers['kid']
        
        # Doğru public key'i bul
        keys = self._get_keys()
        key = None
        for k in keys:
            if k['kid'] == kid:
                key = k
                break
        
        if not key:
            raise ValueError('Public key bulunamadı')
        
        # Token'ı doğrula
        try:
            # Signature'ı doğrula
            message, encoded_signature = token.rsplit('.', 1)
            decoded_signature = base64url_decode(encoded_signature.encode('utf-8'))
            
            # RSA public key oluştur
            public_key = jwk.construct(key)
            
            # Token'ı decode et ve doğrula
            claims = jwt.decode(
                token,
                public_key,
                algorithms=['RS256'],
                audience=self.app_client_id if token_use == 'id' else None,
                options={'verify_aud': token_use == 'id'}
            )
            
            # İssuer'ı doğrula
            expected_issuer = f'https://cognito-idp.{self.region}.amazonaws.com/{self.user_pool_id}'
            if claims['iss'] != expected_issuer:
                raise ValueError('Geçersiz issuer')
            
            # Token use'ı doğrula
            if claims['token_use'] != token_use:
                raise ValueError(f'Token use hatalı. Beklenen: {token_use}, Gelen: {claims["token_use"]}')
            
            # Expiration'ı kontrol et
            if time.time() > claims['exp']:
                raise ValueError('Token süresi dolmuş')
            
            return claims
            
        except jwt.ExpiredSignatureError:
            raise ValueError('Token süresi dolmuş')
        except jwt.JWTClaimsError as e:
            raise ValueError(f'Token claims hatası: {str(e)}')
        except Exception as e:
            raise ValueError(f'Token doğrulama hatası: {str(e)}')

# Singleton instance
cognito_verifier = CognitoTokenVerifier() if Config.USE_COGNITO else None
