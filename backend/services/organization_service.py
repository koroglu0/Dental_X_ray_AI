"""
Organizasyon yönetim servisi - DynamoDB destekli
"""
import os
import json
import uuid
import secrets
import string
from datetime import datetime
from config.settings import Config
from utils.dynamodb_client import dynamodb_client

class OrganizationService:
    """Organizasyon işlemleri servisi"""
    
    @staticmethod
    def _use_dynamodb():
        """DynamoDB kullanılabilir mi?"""
        return Config.USE_DYNAMODB and dynamodb_client.is_connected
    
    @staticmethod
    def get_organizations_file():
        """Organizasyonlar dosya yolunu döndür (JSON fallback için)"""
        return os.path.join(Config.ORGANIZATIONS_FOLDER, 'organizations.json')
    
    @staticmethod
    def load_organizations():
        """Tüm organizasyonları yükle"""
        if OrganizationService._use_dynamodb():
            # DynamoDB'den al
            table = dynamodb_client.dynamodb.Table(Config.ORGANIZATIONS_TABLE)
            
            try:
                response = table.scan()
                return response.get('Items', [])
            except Exception as e:
                print(f"DynamoDB load organizations error: {e}")
                return []
        else:
            # JSON dosyadan al (fallback)
            file_path = OrganizationService.get_organizations_file()
            
            if not os.path.exists(file_path):
                return []
            
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
    
    @staticmethod
    def save_organizations(organizations):
        """Organizasyonları kaydet (JSON fallback için - DynamoDB kullanılmıyorsa)"""
        if OrganizationService._use_dynamodb():
            # DynamoDB kullanılıyorsa bu fonksiyon kullanılmaz
            return
        
        os.makedirs(Config.ORGANIZATIONS_FOLDER, exist_ok=True)
        file_path = OrganizationService.get_organizations_file()
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(organizations, f, ensure_ascii=False, indent=2)
    
    @staticmethod
    def create_organization(name, org_type, address='', phone=''):
        """Yeni organizasyon oluştur"""
        # Benzersiz davet kodu oluştur
        invite_code = OrganizationService._generate_invite_code()
        
        organization = {
            'id': str(uuid.uuid4()),
            'name': name,
            'type': org_type,
            'address': address,
            'phone': phone,
            'invite_code': invite_code,
            'members': [],  # Üye listesi: [{email, name, role, joined_at}]
            'created_at': datetime.now().isoformat(),
            'status': 'active'
        }
        
        if OrganizationService._use_dynamodb():
            # DynamoDB'ye kaydet
            table = dynamodb_client.dynamodb.Table(Config.ORGANIZATIONS_TABLE)
            table.put_item(Item=organization)
        else:
            # JSON dosyaya kaydet (fallback)
            organizations = OrganizationService.load_organizations()
            organizations.append(organization)
            OrganizationService.save_organizations(organizations)
        
        return organization
    
    @staticmethod
    def get_organization(org_id):
        """Organizasyon bilgilerini getir"""
        if OrganizationService._use_dynamodb():
            # DynamoDB'den al
            table = dynamodb_client.dynamodb.Table(Config.ORGANIZATIONS_TABLE)
            
            try:
                response = table.get_item(Key={'id': org_id})
                return response.get('Item')
            except Exception as e:
                print(f"DynamoDB get organization error: {e}")
                return None
        else:
            # JSON dosyadan al (fallback)
            organizations = OrganizationService.load_organizations()
            
            for org in organizations:
                if org['id'] == org_id:
                    return org
            
            return None
    
    @staticmethod
    def update_organization(org_id, **kwargs):
        """Organizasyon bilgilerini güncelle"""
        if OrganizationService._use_dynamodb():
            # DynamoDB'de güncelle
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
        else:
            # JSON dosyada güncelle (fallback)
            organizations = OrganizationService.load_organizations()
            
            for i, org in enumerate(organizations):
                if org['id'] == org_id:
                    # Güncellenebilir alanlar
                    if 'name' in kwargs:
                        org['name'] = kwargs['name']
                    if 'type' in kwargs:
                        org['type'] = kwargs['type']
                    if 'address' in kwargs:
                        org['address'] = kwargs['address']
                    if 'phone' in kwargs:
                        org['phone'] = kwargs['phone']
                    if 'status' in kwargs:
                        org['status'] = kwargs['status']
                    
                    org['updated_at'] = datetime.now().isoformat()
                    organizations[i] = org
                    
                    OrganizationService.save_organizations(organizations)
                    return org
            
            return None
    
    @staticmethod
    def delete_organization(org_id):
        """Organizasyonu sil"""
        if OrganizationService._use_dynamodb():
            # DynamoDB'den sil
            table = dynamodb_client.dynamodb.Table(Config.ORGANIZATIONS_TABLE)
            
            try:
                table.delete_item(Key={'id': org_id})
                return True
            except Exception as e:
                print(f"DynamoDB delete organization error: {e}")
                return False
        else:
            # JSON dosyadan sil (fallback)
            organizations = OrganizationService.load_organizations()
            
            for i, org in enumerate(organizations):
                if org['id'] == org_id:
                    organizations.pop(i)
                    OrganizationService.save_organizations(organizations)
                    return True
            
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
        if OrganizationService._use_dynamodb():
            # DynamoDB'de ara
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
        else:
            # JSON dosyada ara (fallback)
            organizations = OrganizationService.load_organizations()
            
            for org in organizations:
                if org.get('invite_code') == invite_code and org.get('status') == 'active':
                    return org
            
            return None
    
    @staticmethod
    def add_member(org_id, user_email, user_name, user_role='doctor'):
        """Organizasyona üye ekle"""
        print(f"➕ Adding member: email={user_email}, name={user_name}, role={user_role} to org={org_id}")
        
        if OrganizationService._use_dynamodb():
            # DynamoDB'de güncelle
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
        else:
            # JSON dosyada güncelle (fallback)
            organizations = OrganizationService.load_organizations()
            
            for i, org in enumerate(organizations):
                if org['id'] == org_id:
                    # Üye zaten var mı kontrol et
                    if 'members' not in org:
                        org['members'] = []
                    
                    for member in org['members']:
                        if member['email'] == user_email:
                            raise ValueError('Bu kullanıcı zaten organizasyonun üyesi')
                    
                    # Yeni üye ekle
                    member = {
                        'email': user_email,
                        'name': user_name,
                        'role': user_role,
                        'joined_at': datetime.now().isoformat()
                    }
                    
                    org['members'].append(member)
                    org['updated_at'] = datetime.now().isoformat()
                    organizations[i] = org
                    
                    OrganizationService.save_organizations(organizations)
                    return org
            
            return None
    
    @staticmethod
    def remove_member(org_id, user_email):
        """Organizasyondan üye çıkar"""
        if OrganizationService._use_dynamodb():
            # DynamoDB'de güncelle
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
        else:
            # JSON dosyada güncelle (fallback)
            organizations = OrganizationService.load_organizations()
            
            for i, org in enumerate(organizations):
                if org['id'] == org_id:
                    if 'members' not in org:
                        return None
                    
                    # Üyeyi bul ve çıkar
                    org['members'] = [m for m in org['members'] if m['email'] != user_email]
                    org['updated_at'] = datetime.now().isoformat()
                    organizations[i] = org
                    
                    OrganizationService.save_organizations(organizations)
                    return org
            
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
        if OrganizationService._use_dynamodb():
            # DynamoDB'de güncelle
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
        else:
            # JSON dosyada güncelle (fallback)
            organizations = OrganizationService.load_organizations()
            
            for i, org in enumerate(organizations):
                if org['id'] == org_id:
                    org['invite_code'] = OrganizationService._generate_invite_code()
                    org['updated_at'] = datetime.now().isoformat()
                    organizations[i] = org
                    
                    OrganizationService.save_organizations(organizations)
                    return org
            
            return None
