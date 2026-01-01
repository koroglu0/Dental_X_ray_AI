"""
Google OAuth Authentication Service
Google ile giriş yapma işlemlerini yönetir
"""
import requests
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from config.settings import Config


class GoogleAuthService:
    """Google OAuth kimlik doğrulama servisi"""
    
    def __init__(self):
        self.client_id = Config.GOOGLE_CLIENT_ID
        self.client_secret = Config.GOOGLE_CLIENT_SECRET
    
    def verify_google_token(self, token):
        """
        Google ID token'ını doğrula
        
        Args:
            token: Google'dan alınan ID token
            
        Returns:
            dict: Kullanıcı bilgileri (email, name, picture, sub)
        """
        try:
            # Google ID token'ını doğrula
            idinfo = id_token.verify_oauth2_token(
                token, 
                google_requests.Request(), 
                self.client_id
            )
            
            # Token'ın doğru issuer'dan geldiğini kontrol et
            if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
                raise ValueError('Geçersiz token issuer')
            
            # Kullanıcı bilgilerini döndür
            return {
                'google_id': idinfo['sub'],
                'email': idinfo['email'],
                'email_verified': idinfo.get('email_verified', False),
                'name': idinfo.get('name', ''),
                'picture': idinfo.get('picture', ''),
                'given_name': idinfo.get('given_name', ''),
                'family_name': idinfo.get('family_name', '')
            }
            
        except ValueError as e:
            raise ValueError(f'Token doğrulama hatası: {str(e)}')
        except Exception as e:
            raise ValueError(f'Google token doğrulanamadı: {str(e)}')
    
    def verify_access_token(self, access_token):
        """
        Google Access Token ile kullanıcı bilgilerini al
        (Alternatif yöntem - OAuth2 access token için)
        
        Args:
            access_token: Google OAuth access token
            
        Returns:
            dict: Kullanıcı bilgileri
        """
        try:
            # Google UserInfo endpoint'inden bilgileri al
            response = requests.get(
                'https://www.googleapis.com/oauth2/v3/userinfo',
                headers={'Authorization': f'Bearer {access_token}'}
            )
            
            if response.status_code != 200:
                raise ValueError('Access token geçersiz')
            
            data = response.json()
            
            return {
                'google_id': data.get('sub'),
                'email': data.get('email'),
                'email_verified': data.get('email_verified', False),
                'name': data.get('name', ''),
                'picture': data.get('picture', ''),
                'given_name': data.get('given_name', ''),
                'family_name': data.get('family_name', '')
            }
            
        except requests.RequestException as e:
            raise ValueError(f'Google API isteği başarısız: {str(e)}')
        except Exception as e:
            raise ValueError(f'Token doğrulanamadı: {str(e)}')


# Singleton instance
google_auth_service = GoogleAuthService()
