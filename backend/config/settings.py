"""
Konfigürasyon ayarları
"""
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Temel konfigürasyon"""
    SECRET_KEY = os.getenv('SECRET_KEY', 'dental-ai-secret-key-2024')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB
    
    # AWS Configuration
    AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
    AWS_REGION = os.getenv('AWS_REGION', 'eu-north-1')
    
    # AWS DynamoDB Configuration - Always enabled
    DYNAMODB_ENDPOINT = os.getenv('DYNAMODB_ENDPOINT', None)  # None for AWS, URL for local
    
    # AWS Cognito Configuration
    USE_COGNITO = os.getenv('USE_COGNITO', 'false').lower() == 'true'
    COGNITO_USER_POOL_ID = os.getenv('COGNITO_USER_POOL_ID')
    COGNITO_APP_CLIENT_ID = os.getenv('COGNITO_APP_CLIENT_ID')
    COGNITO_APP_CLIENT_SECRET = os.getenv('COGNITO_APP_CLIENT_SECRET', None)  # Opsiyonel
    COGNITO_REGION = os.getenv('COGNITO_REGION', 'eu-north-1')
    
    # Google OAuth Configuration
    GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')
    GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET')
    
    # DynamoDB Table Names
    USERS_TABLE = 'DentalAI_Users'
    ANALYSES_TABLE = 'DentalAI_Analyses'
    PATIENTS_TABLE = 'DentalAI_Patients'
    ORGANIZATIONS_TABLE = 'DentalAI_Organizations'
    NOTES_TABLE = 'DentalAI_Notes'
    
    # Paths (only for uploads)
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    DATA_DIR = os.path.join(BASE_DIR, 'data')
    
    UPLOAD_FOLDER = os.path.join(DATA_DIR, 'uploads')
    
    # Model
    MODEL_PATH = os.path.join(BASE_DIR, '..', 'best_final.pt')
    
    # Allowed extensions
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
    
    # CORS
    CORS_ORIGINS = ['http://localhost:5173', 'http://localhost:3000']

class DevelopmentConfig(Config):
    """Development konfigürasyonu"""
    DEBUG = True
    TESTING = False

class ProductionConfig(Config):
    """Production konfigürasyonu"""
    DEBUG = False
    TESTING = False

class TestingConfig(Config):
    """Testing konfigürasyonu"""
    DEBUG = True
    TESTING = True

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
