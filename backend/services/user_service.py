"""
Kullanıcı yönetim servisi - DynamoDB destekli
"""
import os
import json
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
from config.settings import Config
from utils.dynamodb_client import dynamodb_client

class UserService:
    """Kullanıcı işlemleri servisi"""
    
    @staticmethod
    def _use_dynamodb():
        """DynamoDB kullanılabilir mi?"""
        return Config.USE_DYNAMODB and dynamodb_client.is_connected
    
    @staticmethod
    def get_user_file(email):
        """Kullanıcı dosya yolunu döndür (JSON fallback için)"""
        safe_email = email.replace('@', '_at_').replace('.', '_dot_')
        return os.path.join(Config.USERS_FOLDER, f"{safe_email}.json")
    
    @staticmethod
    def create_user(email, password, name, role='patient', **kwargs):
        """Yeni kullanıcı oluştur"""
        # Cognito kullanılıyorsa password None olabilir
        password_hash = generate_password_hash(password) if password else None
        
        user_data = {
            'email': email,
            'name': name,
            'role': role,
            'organization_id': kwargs.get('organization_id'),
            'specialization': kwargs.get('specialization') if role == 'doctor' else None,
            'phone': kwargs.get('phone', ''),
            'created_at': datetime.now().isoformat(),
            'status': 'active',
            'auth_provider': 'google' if kwargs.get('google_id') else 'email'
        }
        
        # Google ID varsa ekle
        if 'google_id' in kwargs:
            user_data['google_id'] = kwargs['google_id']
        
        # Profil resmi varsa ekle
        if 'profile_picture' in kwargs:
            user_data['profile_picture'] = kwargs['profile_picture']
        
        # Cognito sub ID varsa ekle
        if 'cognito_sub' in kwargs:
            user_data['cognito_sub'] = kwargs['cognito_sub']
        
        # Password hash sadece Cognito kullanılmadığında
        if password_hash:
            user_data['password_hash'] = password_hash
        
        if UserService._use_dynamodb():
            # DynamoDB'ye kaydet
            table = dynamodb_client.dynamodb.Table(Config.USERS_TABLE)
            
            # Kullanıcı zaten var mı kontrol et
            try:
                response = table.get_item(Key={'email': email})
                if 'Item' in response:
                    raise ValueError('Bu e-posta adresi zaten kayıtlı')
            except Exception as e:
                if 'zaten kayıtlı' in str(e):
                    raise e
            
            # Yeni kullanıcıyı kaydet
            table.put_item(Item=user_data)
        else:
            # JSON dosyaya kaydet (fallback)
            user_file = UserService.get_user_file(email)
            
            if os.path.exists(user_file):
                raise ValueError('Bu e-posta adresi zaten kayıtlı')
            
            os.makedirs(Config.USERS_FOLDER, exist_ok=True)
            
            with open(user_file, 'w', encoding='utf-8') as f:
                json.dump(user_data, f, ensure_ascii=False, indent=2)
        
        return user_data
    
    @staticmethod
    def authenticate_user(email, password):
        """Kullanıcı kimlik doğrulama"""
        user_data = None
        
        if UserService._use_dynamodb():
            # DynamoDB'den al
            table = dynamodb_client.dynamodb.Table(Config.USERS_TABLE)
            
            try:
                response = table.get_item(Key={'email': email})
                if 'Item' in response:
                    user_data = response['Item']
            except Exception as e:
                print(f"DynamoDB get user error: {e}")
                return None
        else:
            # JSON dosyadan al (fallback)
            user_file = UserService.get_user_file(email)
            
            if not os.path.exists(user_file):
                return None
            
            with open(user_file, 'r', encoding='utf-8') as f:
                user_data = json.load(f)
        
        if not user_data:
            return None
        
        if not check_password_hash(user_data['password_hash'], password):
            return None
        
        return user_data
    
    @staticmethod
    def generate_token(user_data):
        """JWT token oluştur"""
        token_data = {
            'email': user_data['email'],
            'name': user_data['name'],
            'role': user_data.get('role', 'patient'),
            'organization_id': user_data.get('organization_id')
        }
        
        return jwt.encode(token_data, Config.SECRET_KEY, algorithm='HS256')
    
    @staticmethod
    def get_user(email):
        """Kullanıcı bilgilerini getir"""
        user_data = None
        
        if UserService._use_dynamodb():
            # DynamoDB'den al
            table = dynamodb_client.dynamodb.Table(Config.USERS_TABLE)
            
            try:
                response = table.get_item(Key={'email': email})
                if 'Item' in response:
                    user_data = response['Item']
            except Exception as e:
                print(f"DynamoDB get user error: {e}")
                return None
        else:
            # JSON dosyadan al (fallback)
            user_file = UserService.get_user_file(email)
            
            if not os.path.exists(user_file):
                return None
            
            with open(user_file, 'r', encoding='utf-8') as f:
                user_data = json.load(f)
        
        if user_data:
            # Şifre hash'ini kaldır
            user_data.pop('password_hash', None)
        
        return user_data
    
    @staticmethod
    def get_user_by_cognito_sub(cognito_sub):
        """Cognito sub ID ile kullanıcı bilgilerini getir"""
        if not UserService._use_dynamodb():
            return None
        
        try:
            table = dynamodb_client.dynamodb.Table(Config.USERS_TABLE)
            
            # Scan ile cognito_sub'a göre ara
            response = table.scan(
                FilterExpression='cognito_sub = :sub',
                ExpressionAttributeValues={':sub': cognito_sub}
            )
            
            if response.get('Items') and len(response['Items']) > 0:
                user_data = response['Items'][0]
                # Şifre hash'ini kaldır
                user_data.pop('password_hash', None)
                return user_data
            
            return None
            
        except Exception as e:
            print(f"DynamoDB get user by cognito_sub error: {e}")
            return None
    
    @staticmethod
    def update_user(email, updates):
        """Kullanıcı bilgilerini güncelle"""
        if UserService._use_dynamodb():
            # DynamoDB'de güncelle
            table = dynamodb_client.dynamodb.Table(Config.USERS_TABLE)
            
            try:
                # Update expression ve attribute values oluştur
                update_parts = []
                expression_values = {':updated_at': datetime.now().isoformat()}
                expression_names = {}
                
                for key, value in updates.items():
                    if key != 'email':  # email primary key, güncellenemez
                        # Reserved keyword'leri handle et
                        attr_name = f"#{key}"
                        expression_names[attr_name] = key
                        update_parts.append(f"{attr_name} = :{key}")
                        expression_values[f":{key}"] = value
                
                update_parts.append("updated_at = :updated_at")
                update_expression = "SET " + ", ".join(update_parts)
                
                # DynamoDB update parametreleri
                update_params = {
                    'Key': {'email': email},
                    'UpdateExpression': update_expression,
                    'ExpressionAttributeValues': expression_values,
                }
                
                # ExpressionAttributeNames sadece doluysa ekle
                if expression_names:
                    update_params['ExpressionAttributeNames'] = expression_names
                
                table.update_item(**update_params)
                return True
            except Exception as e:
                print(f"DynamoDB update user error: {e}")
                return False
        else:
            # JSON dosyada güncelle
            user_file = UserService.get_user_file(email)
            
            if not os.path.exists(user_file):
                return False
            
            with open(user_file, 'r', encoding='utf-8') as f:
                user_data = json.load(f)
            
            for key, value in updates.items():
                if key != 'email':
                    user_data[key] = value
            
            user_data['updated_at'] = datetime.now().isoformat()
            
            with open(user_file, 'w', encoding='utf-8') as f:
                json.dump(user_data, f, ensure_ascii=False, indent=2)
            
            return True
    
    @staticmethod
    def update_user_organization(email, organization_id):
        """Kullanıcının organizasyon bilgisini güncelle"""
        if UserService._use_dynamodb():
            # DynamoDB'de güncelle
            table = dynamodb_client.dynamodb.Table(Config.USERS_TABLE)
            
            try:
                table.update_item(
                    Key={'email': email},
                    UpdateExpression='SET organization_id = :org_id, updated_at = :updated_at',
                    ExpressionAttributeValues={
                        ':org_id': organization_id,
                        ':updated_at': datetime.now().isoformat()
                    }
                )
                return True
            except Exception as e:
                print(f"DynamoDB update organization error: {e}")
                return False
        else:
            # JSON dosyada güncelle
            user_file = UserService.get_user_file(email)
            
            if not os.path.exists(user_file):
                return False
            
            with open(user_file, 'r', encoding='utf-8') as f:
                user_data = json.load(f)
            
            user_data['organization_id'] = organization_id
            user_data['updated_at'] = datetime.now().isoformat()
            
            with open(user_file, 'w', encoding='utf-8') as f:
                json.dump(user_data, f, ensure_ascii=False, indent=2)
            
            return True
    
    @staticmethod
    def get_all_users():
        """Tüm kullanıcıları getir"""
        if UserService._use_dynamodb():
            # DynamoDB'den tüm kullanıcıları al
            table = dynamodb_client.dynamodb.Table(Config.USERS_TABLE)
            
            try:
                response = table.scan()
                users = response.get('Items', [])
                
                # Pagination varsa devam et
                while 'LastEvaluatedKey' in response:
                    response = table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
                    users.extend(response.get('Items', []))
                
                return users
            except Exception as e:
                print(f"DynamoDB get all users error: {e}")
                return []
        else:
            # JSON dosyalardan al
            users = []
            
            if not os.path.exists(Config.USERS_FOLDER):
                return users
            
            for filename in os.listdir(Config.USERS_FOLDER):
                if filename.endswith('.json'):
                    filepath = os.path.join(Config.USERS_FOLDER, filename)
                    try:
                        with open(filepath, 'r', encoding='utf-8') as f:
                            user_data = json.load(f)
                            users.append(user_data)
                    except Exception as e:
                        print(f"Error reading user file {filename}: {e}")
            
            return users
    
    @staticmethod
    def get_user_by_id(user_id):
        """ID veya email ile kullanıcı getir"""
        # Önce email olarak dene
        user = UserService.get_user(user_id)
        if user:
            return user
        
        # DynamoDB'de scan ile ara
        if UserService._use_dynamodb():
            table = dynamodb_client.dynamodb.Table(Config.USERS_TABLE)
            
            try:
                # Email'e göre ara
                response = table.get_item(Key={'email': user_id})
                if 'Item' in response:
                    return response['Item']
                
                # Cognito sub'a göre ara
                return UserService.get_user_by_cognito_sub(user_id)
            except Exception as e:
                print(f"DynamoDB get user by id error: {e}")
                return None
        
        return None
    
    @staticmethod
    def update_user(user_id, **kwargs):
        """Kullanıcı bilgilerini güncelle"""
        # Önce kullanıcıyı bul
        user = UserService.get_user_by_id(user_id)
        if not user:
            return None
        
        email = user.get('email')
        
        if UserService._use_dynamodb():
            # DynamoDB'de güncelle
            table = dynamodb_client.dynamodb.Table(Config.USERS_TABLE)
            
            try:
                update_expr_parts = []
                expr_attr_values = {}
                
                if 'name' in kwargs:
                    update_expr_parts.append('name = :name')
                    expr_attr_values[':name'] = kwargs['name']
                if 'role' in kwargs:
                    update_expr_parts.append('#r = :role')
                    expr_attr_values[':role'] = kwargs['role']
                if 'organization_id' in kwargs:
                    update_expr_parts.append('organization_id = :org_id')
                    expr_attr_values[':org_id'] = kwargs['organization_id']
                if 'specialization' in kwargs:
                    update_expr_parts.append('specialization = :spec')
                    expr_attr_values[':spec'] = kwargs['specialization']
                if 'phone' in kwargs:
                    update_expr_parts.append('phone = :phone')
                    expr_attr_values[':phone'] = kwargs['phone']
                if 'status' in kwargs:
                    update_expr_parts.append('#s = :status')
                    expr_attr_values[':status'] = kwargs['status']
                
                update_expr_parts.append('updated_at = :updated_at')
                expr_attr_values[':updated_at'] = datetime.now().isoformat()
                
                update_expr = 'SET ' + ', '.join(update_expr_parts)
                
                response = table.update_item(
                    Key={'email': email},
                    UpdateExpression=update_expr,
                    ExpressionAttributeNames={'#r': 'role', '#s': 'status'} if 'role' in kwargs or 'status' in kwargs else None,
                    ExpressionAttributeValues=expr_attr_values,
                    ReturnValues='ALL_NEW'
                )
                
                return response.get('Attributes')
            except Exception as e:
                print(f"DynamoDB update user error: {e}")
                return None
        else:
            # JSON dosyada güncelle
            user_file = UserService.get_user_file(email)
            
            if not os.path.exists(user_file):
                return None
            
            with open(user_file, 'r', encoding='utf-8') as f:
                user_data = json.load(f)
            
            # Güncellenebilir alanlar
            if 'name' in kwargs:
                user_data['name'] = kwargs['name']
            if 'role' in kwargs:
                user_data['role'] = kwargs['role']
            if 'organization_id' in kwargs:
                user_data['organization_id'] = kwargs['organization_id']
            if 'specialization' in kwargs:
                user_data['specialization'] = kwargs['specialization']
            if 'phone' in kwargs:
                user_data['phone'] = kwargs['phone']
            if 'status' in kwargs:
                user_data['status'] = kwargs['status']
            
            user_data['updated_at'] = datetime.now().isoformat()
            
            with open(user_file, 'w', encoding='utf-8') as f:
                json.dump(user_data, f, ensure_ascii=False, indent=2)
            
            return user_data
    
    @staticmethod
    def delete_user(user_id):
        """Kullanıcıyı sil"""
        # Önce kullanıcıyı bul
        user = UserService.get_user_by_id(user_id)
        if not user:
            return False
        
        email = user.get('email')
        
        if UserService._use_dynamodb():
            # DynamoDB'den sil
            table = dynamodb_client.dynamodb.Table(Config.USERS_TABLE)
            
            try:
                table.delete_item(Key={'email': email})
                return True
            except Exception as e:
                print(f"DynamoDB delete user error: {e}")
                return False
        else:
            # JSON dosyayı sil
            user_file = UserService.get_user_file(email)
            
            if os.path.exists(user_file):
                os.remove(user_file)
                return True
            
            return False
