"""
Organizasyon yönetim servisi - Sadece DynamoDB
"""
import uuid
import secrets
import string
from datetime import datetime
from config.settings import Config
from utils.dynamodb_client import dynamodb_client

class OrganizationService:
    """Organizasyon işlemleri servisi - DynamoDB Only"""
    
    @staticmethod
    def load_organizations():
        """Tüm organizasyonları yükle"""
        table = dynamodb_client.dynamodb.Table(Config.ORGANIZATIONS_TABLE)
        
        try:
            response = table.scan()
            return response.get('Items', [])
        except Exception as e:
            print(f"DynamoDB load organizations error: {e}")
            return []
    
    @staticmethod
    def create_organization(name, org_type, address='', phone=''):
        """Yeni organizasyon oluştur"""
        invite_code = OrganizationService._generate_invite_code()
        
        organization = {
            'id': str(uuid.uuid4()),
            'name': name,
            'type': org_type,
            'address': address,
            'phone': phone,
            'invite_code': invite_code,
            'members': [],
            'created_at': datetime.now().isoformat(),
            'status': 'active'
        }
        
        # DynamoDB'ye kaydet
        table = dynamodb_client.dynamodb.Table(Config.ORGANIZATIONS_TABLE)
        table.put_item(Item=organization)
        
        return organization
    
    @staticmethod
    def get_organization(org_id):
        """Organizasyon bilgilerini getir"""
        table = dynamodb_client.dynamodb.Table(Config.ORGANIZATIONS_TABLE)
        
        try:
            response = table.get_item(Key={'id': org_id})
            return response.get('Item')
        except Exception as e:
            print(f"DynamoDB get organization error: {e}")
            return None
    
    @staticmethod
    def update_organization(org_id, **kwargs):
        """Organizasyon bilgilerini güncelle"""
        table = dynamodb_client.dynamodb.Table(Config.ORGANIZATIONS_TABLE)
        
        try:
            # Güncellenebilir alanlar
            update_expr_parts = []
            expr_attr_values = {}
            
            if 'name' in kwargs:
                update_expr_parts.append('name = :name')
                expr_attr_values[':name'] = kwargs['name']
            if 'type' in kwargs:
                update_expr_parts.append('#t = :type')
                expr_attr_values[':type'] = kwargs['type']
            if 'address' in kwargs:
                update_expr_parts.append('address = :address')
                expr_attr_values[':address'] = kwargs['address']
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
                Key={'id': org_id},
                UpdateExpression=update_expr,
                ExpressionAttributeNames={'#t': 'type', '#s': 'status'} if 'type' in kwargs or 'status' in kwargs else None,
                ExpressionAttributeValues=expr_attr_values,
                ReturnValues='ALL_NEW'
            )
            
            return response.get('Attributes')
        except Exception as e:
            print(f"DynamoDB update organization error: {e}")
            return None
    
    @staticmethod
    def delete_organization(org_id):
        """Organizasyonu sil"""
        table = dynamodb_client.dynamodb.Table(Config.ORGANIZATIONS_TABLE)
        
        try:
            table.delete_item(Key={'id': org_id})
            return True
        except Exception as e:
            print(f"DynamoDB delete organization error: {e}")
            return False
    
    @staticmethod
    def get_all_organizations():
        """Tüm organizasyonları getir"""
        return OrganizationService.load_organizations()
    
    @staticmethod
    def _generate_invite_code(length=8):
        """Benzersiz davet kodu oluştur (8 karakter, büyük harf ve rakam)"""
        characters = string.ascii_uppercase + string.digits
        return ''.join(secrets.choice(characters) for _ in range(length))
    
    @staticmethod
    def validate_invite_code(invite_code):
        """Davet kodunu doğrula ve organizasyon bilgilerini döndür"""
        table = dynamodb_client.dynamodb.Table(Config.ORGANIZATIONS_TABLE)
        
        try:
            response = table.scan(
                FilterExpression='invite_code = :code AND #s = :status',
                ExpressionAttributeNames={'#s': 'status'},
                ExpressionAttributeValues={
                    ':code': invite_code,
                    ':status': 'active'
                }
            )
            
            items = response.get('Items', [])
            if items:
                return items[0]
            return None
        except Exception as e:
            print(f"DynamoDB validate invite code error: {e}")
            return None
    
    @staticmethod
    def add_member(org_id, user_email, user_name, user_role='doctor'):
        """Organizasyona üye ekle"""
        print(f"➕ Adding member: email={user_email}, name={user_name}, role={user_role} to org={org_id}")
        
        table = dynamodb_client.dynamodb.Table(Config.ORGANIZATIONS_TABLE)
        
        try:
            # Önce organizasyonu al
            org = OrganizationService.get_organization(org_id)
            if not org:
                print(f"❌ Organization not found: {org_id}")
                return None
            
            # Üye zaten var mı kontrol et
            members = org.get('members', [])
            print(f"📋 Current members count: {len(members)}")
            
            for member in members:
                if member['email'] == user_email:
                    print(f"⚠️ User already member: {user_email}")
                    raise ValueError('Bu kullanıcı zaten organizasyonun üyesi')
            
            # Yeni üye ekle
            new_member = {
                'email': user_email,
                'name': user_name,
                'role': user_role,
                'joined_at': datetime.now().isoformat()
            }
            
            members.append(new_member)
            print(f"✅ Added new member. New members count: {len(members)}")
            
            # DynamoDB'de güncelle
            response = table.update_item(
                Key={'id': org_id},
                UpdateExpression='SET members = :members, updated_at = :updated_at',
                ExpressionAttributeValues={
                    ':members': members,
                    ':updated_at': datetime.now().isoformat()
                },
                ReturnValues='ALL_NEW'
            )
            
            print(f"💾 DynamoDB updated successfully")
            return response.get('Attributes')
        except Exception as e:
                print(f"DynamoDB add member error: {e}")
                raise
    
    @staticmethod
    def remove_member(org_id, user_email):
        """Organizasyondan üye çıkar"""
        table = dynamodb_client.dynamodb.Table(Config.ORGANIZATIONS_TABLE)
        
        try:
            # Önce organizasyonu al
            org = OrganizationService.get_organization(org_id)
            if not org:
                return None
            
            if 'members' not in org:
                return None
            
            # Üyeyi filtrele
            members = [m for m in org['members'] if m['email'] != user_email]
            
            # DynamoDB'de güncelle
            response = table.update_item(
                Key={'id': org_id},
                UpdateExpression='SET members = :members, updated_at = :updated_at',
                ExpressionAttributeValues={
                    ':members': members,
                    ':updated_at': datetime.now().isoformat()
                },
                ReturnValues='ALL_NEW'
            )
            
            return response.get('Attributes')
        except Exception as e:
            print(f"DynamoDB remove member error: {e}")
            return None
    
    @staticmethod
    def get_organization_members(org_id):
        """Organizasyon üyelerini listele"""
        org = OrganizationService.get_organization(org_id)
        
        if not org:
            return None
        
        return org.get('members', [])
    
    @staticmethod
    def regenerate_invite_code(org_id):
        """Organizasyon davet kodunu yenile"""
        table = dynamodb_client.dynamodb.Table(Config.ORGANIZATIONS_TABLE)
        
        try:
            new_code = OrganizationService._generate_invite_code()
            
            response = table.update_item(
                Key={'id': org_id},
                UpdateExpression='SET invite_code = :code, updated_at = :updated_at',
                ExpressionAttributeValues={
                    ':code': new_code,
                    ':updated_at': datetime.now().isoformat()
                },
                ReturnValues='ALL_NEW'
            )
            
            return response.get('Attributes')
        except Exception as e:
            print(f"DynamoDB regenerate invite code error: {e}")
            return None
