"""
AWS Cognito Authentication Service
"""
import boto3
from botocore.exceptions import ClientError
from config.settings import Config
import hmac
import hashlib
import base64

class CognitoService:
    """AWS Cognito kullanıcı yönetimi"""
    
    def __init__(self):
        self.client = boto3.client(
            'cognito-idp',
            region_name=Config.COGNITO_REGION,
            aws_access_key_id=Config.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=Config.AWS_SECRET_ACCESS_KEY
        )
        self.user_pool_id = Config.COGNITO_USER_POOL_ID
        self.client_id = Config.COGNITO_APP_CLIENT_ID
        self.client_secret = Config.COGNITO_APP_CLIENT_SECRET
    
    def _get_secret_hash(self, username):
        """Client secret hash oluştur (eğer client secret varsa)"""
        if not self.client_secret:
            return None
        
        message = bytes(username + self.client_id, 'utf-8')
        secret = bytes(self.client_secret, 'utf-8')
        dig = hmac.new(secret, message, hashlib.sha256).digest()
        return base64.b64encode(dig).decode()
    
    def sign_up(self, email, password, name, **attributes):
        """
        Yeni kullanıcı kaydı
        
        Args:
            email: Kullanıcı email
            password: Şifre
            name: Kullanıcı adı
            **attributes: Ek kullanıcı özellikleri (role, phone, vb.)
        
        Returns:
            dict: Kullanıcı bilgileri ve sub (user ID)
        """
        try:
            user_attributes = [
                {'Name': 'email', 'Value': email},
                {'Name': 'name', 'Value': name}
            ]
            
            # Phone number - Cognito formatında olmalı (+XXXXXXXXXXX)
            if 'phone' in attributes and attributes['phone']:
                phone = attributes['phone']
                # Eğer + ile başlamıyorsa ekle
                if not phone.startswith('+'):
                    phone = '+90' + phone.replace(' ', '').replace('-', '')
                user_attributes.append({'Name': 'phone_number', 'Value': phone})
            
            # NOT: Custom attributes (role, organizationId) User Pool'da tanımlı değilse eklenmez
            # Bunlar DynamoDB'de saklanacak
            
            params = {
                'ClientId': self.client_id,
                'Username': email,
                'Password': password,
                'UserAttributes': user_attributes
            }
            
            print(f"🔐 Cognito sign_up params: {params}")
            
            # Client secret varsa ekle
            secret_hash = self._get_secret_hash(email)
            if secret_hash:
                params['SecretHash'] = secret_hash
            
            response = self.client.sign_up(**params)
            
            return {
                'user_sub': response['UserSub'],
                'user_confirmed': response.get('UserConfirmed', False),
                'email': email,
                'name': name,
                **attributes
            }
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'UsernameExistsException':
                raise ValueError('Bu email adresi zaten kayıtlı')
            elif error_code == 'InvalidPasswordException':
                raise ValueError('Şifre gereksinimleri karşılanmıyor')
            elif error_code == 'InvalidParameterException':
                raise ValueError('Geçersiz parametre')
            else:
                raise ValueError(f'Kayıt hatası: {e.response["Error"]["Message"]}')
    
    def confirm_sign_up(self, email, confirmation_code):
        """Email doğrulama kodu ile kullanıcıyı onayla"""
        try:
            params = {
                'ClientId': self.client_id,
                'Username': email,
                'ConfirmationCode': confirmation_code
            }
            
            secret_hash = self._get_secret_hash(email)
            if secret_hash:
                params['SecretHash'] = secret_hash
            
            self.client.confirm_sign_up(**params)
            return True
            
        except ClientError as e:
            raise ValueError(f'Doğrulama hatası: {e.response["Error"]["Message"]}')
    
    def sign_in(self, email, password):
        """
        Kullanıcı girişi
        
        Returns:
            dict: Access token, ID token, refresh token
        """
        try:
            params = {
                'AuthFlow': 'USER_PASSWORD_AUTH',
                'ClientId': self.client_id,
                'AuthParameters': {
                    'USERNAME': email,
                    'PASSWORD': password
                }
            }
            
            secret_hash = self._get_secret_hash(email)
            if secret_hash:
                params['AuthParameters']['SECRET_HASH'] = secret_hash
            
            response = self.client.initiate_auth(**params)
            
            return {
                'access_token': response['AuthenticationResult']['AccessToken'],
                'id_token': response['AuthenticationResult']['IdToken'],
                'refresh_token': response['AuthenticationResult']['RefreshToken'],
                'expires_in': response['AuthenticationResult']['ExpiresIn']
            }
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'NotAuthorizedException':
                raise ValueError('Email veya şifre hatalı')
            elif error_code == 'UserNotConfirmedException':
                raise ValueError('Email adresinizi doğrulamanız gerekiyor')
            elif error_code == 'UserNotFoundException':
                raise ValueError('Kullanıcı bulunamadı')
            else:
                raise ValueError(f'Giriş hatası: {e.response["Error"]["Message"]}')
    
    def get_user(self, access_token):
        """Access token ile kullanıcı bilgilerini al"""
        try:
            response = self.client.get_user(AccessToken=access_token)
            
            # Attributes'ları dictionary'ye çevir
            user_data = {
                'username': response['Username']
            }
            
            for attr in response['UserAttributes']:
                name = attr['Name']
                value = attr['Value']
                
                # Custom attributes'ları düzenle
                if name.startswith('custom:'):
                    name = name.replace('custom:', '')
                
                user_data[name] = value
            
            return user_data
            
        except ClientError as e:
            raise ValueError(f'Kullanıcı bilgisi alınamadı: {e.response["Error"]["Message"]}')
    
    def refresh_token(self, refresh_token):
        """Refresh token ile yeni access token al"""
        try:
            params = {
                'AuthFlow': 'REFRESH_TOKEN_AUTH',
                'ClientId': self.client_id,
                'AuthParameters': {
                    'REFRESH_TOKEN': refresh_token
                }
            }
            
            response = self.client.initiate_auth(**params)
            
            return {
                'access_token': response['AuthenticationResult']['AccessToken'],
                'id_token': response['AuthenticationResult']['IdToken'],
                'expires_in': response['AuthenticationResult']['ExpiresIn']
            }
            
        except ClientError as e:
            raise ValueError(f'Token yenileme hatası: {e.response["Error"]["Message"]}')
    
    def forgot_password(self, email):
        """Şifre sıfırlama kodu gönder"""
        try:
            params = {
                'ClientId': self.client_id,
                'Username': email
            }
            
            secret_hash = self._get_secret_hash(email)
            if secret_hash:
                params['SecretHash'] = secret_hash
            
            self.client.forgot_password(**params)
            return True
            
        except ClientError as e:
            raise ValueError(f'Şifre sıfırlama hatası: {e.response["Error"]["Message"]}')
    
    def confirm_forgot_password(self, email, confirmation_code, new_password):
        """Şifre sıfırlama kodunu onayla ve yeni şifre belirle"""
        try:
            params = {
                'ClientId': self.client_id,
                'Username': email,
                'ConfirmationCode': confirmation_code,
                'Password': new_password
            }
            
            secret_hash = self._get_secret_hash(email)
            if secret_hash:
                params['SecretHash'] = secret_hash
            
            self.client.confirm_forgot_password(**params)
            return True
            
        except ClientError as e:
            raise ValueError(f'Şifre onaylama hatası: {e.response["Error"]["Message"]}')
    
    def admin_create_user(self, email, name, **attributes):
        """Admin tarafından kullanıcı oluşturma (şifre email ile gönderilir)"""
        try:
            user_attributes = [
                {'Name': 'email', 'Value': email},
                {'Name': 'name', 'Value': name},
                {'Name': 'email_verified', 'Value': 'true'}
            ]
            
            if 'role' in attributes:
                user_attributes.append({'Name': 'custom:role', 'Value': attributes['role']})
            if 'organization_id' in attributes and attributes['organization_id']:
                user_attributes.append({'Name': 'custom:organizationId', 'Value': attributes['organization_id']})
            
            response = self.client.admin_create_user(
                UserPoolId=self.user_pool_id,
                Username=email,
                UserAttributes=user_attributes,
                DesiredDeliveryMediums=['EMAIL']
            )
            
            return {
                'user_sub': response['User']['Username'],
                'email': email,
                'name': name,
                **attributes
            }
            
        except ClientError as e:
            raise ValueError(f'Kullanıcı oluşturma hatası: {e.response["Error"]["Message"]}')
    
    def admin_delete_user(self, email):
        """Admin tarafından kullanıcı silme"""
        try:
            self.client.admin_delete_user(
                UserPoolId=self.user_pool_id,
                Username=email
            )
            return True
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'UserNotFoundException':
                print(f"⚠️  Cognito'da kullanıcı bulunamadı: {email}")
                return False
            else:
                raise ValueError(f'Kullanıcı silme hatası: {e.response["Error"]["Message"]}')
    
    def admin_disable_user(self, email):
        """Admin tarafından kullanıcıyı devre dışı bırakma"""
        try:
            self.client.admin_disable_user(
                UserPoolId=self.user_pool_id,
                Username=email
            )
            return True
            
        except ClientError as e:
            raise ValueError(f'Kullanıcı devre dışı bırakma hatası: {e.response["Error"]["Message"]}')
    
    def admin_enable_user(self, email):
        """Admin tarafından kullanıcıyı aktif hale getirme"""
        try:
            self.client.admin_enable_user(
                UserPoolId=self.user_pool_id,
                Username=email
            )
            return True
            
        except ClientError as e:
            raise ValueError(f'Kullanıcı aktif hale getirme hatası: {e.response["Error"]["Message"]}')

# Singleton instance
cognito_service = CognitoService()
