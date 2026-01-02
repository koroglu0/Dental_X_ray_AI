"""
Hasta yönetim servisi - Sadece DynamoDB
"""
import uuid
from datetime import datetime
from config.settings import Config
from utils.dynamodb_client import dynamodb_client

class PatientService:
    """Hasta işlemleri servisi - DynamoDB Only"""
    
    @staticmethod
    def create_patient(name, birth_date, gender, phone='', address='', organization_id=None):
        """Yeni hasta oluştur"""
        patient = {
            'id': str(uuid.uuid4()),
            'name': name,
            'birth_date': birth_date,
            'gender': gender,
            'phone': phone,
            'address': address,
            'organization_id': organization_id,
            'created_at': datetime.now().isoformat(),
            'status': 'active'
        }
        
        # DynamoDB'ye kaydet
        table = dynamodb_client.dynamodb.Table(Config.PATIENTS_TABLE)
        table.put_item(Item=patient)
        
        return patient
    
    @staticmethod
    def get_patient(patient_id):
        """Hasta bilgilerini getir"""
        table = dynamodb_client.dynamodb.Table(Config.PATIENTS_TABLE)
        
        try:
            response = table.get_item(Key={'id': patient_id})
            return response.get('Item')
        except Exception as e:
            print(f"DynamoDB get patient error: {e}")
            return None
    
    @staticmethod
    def update_patient(patient_id, **kwargs):
        """Hasta bilgilerini güncelle"""
        table = dynamodb_client.dynamodb.Table(Config.PATIENTS_TABLE)
        
        try:
            # Güncellenebilir alanlar
            update_expr_parts = []
            expr_attr_values = {}
            
            if 'name' in kwargs:
                update_expr_parts.append('name = :name')
                expr_attr_values[':name'] = kwargs['name']
            if 'birth_date' in kwargs:
                update_expr_parts.append('birth_date = :birth_date')
                expr_attr_values[':birth_date'] = kwargs['birth_date']
            if 'gender' in kwargs:
                update_expr_parts.append('gender = :gender')
                expr_attr_values[':gender'] = kwargs['gender']
            if 'phone' in kwargs:
                update_expr_parts.append('phone = :phone')
                expr_attr_values[':phone'] = kwargs['phone']
            if 'address' in kwargs:
                update_expr_parts.append('address = :address')
                expr_attr_values[':address'] = kwargs['address']
            if 'status' in kwargs:
                update_expr_parts.append('#s = :status')
                expr_attr_values[':status'] = kwargs['status']
            
            update_expr_parts.append('updated_at = :updated_at')
            expr_attr_values[':updated_at'] = datetime.now().isoformat()
            
            update_expr = 'SET ' + ', '.join(update_expr_parts)
            
            response = table.update_item(
                Key={'id': patient_id},
                UpdateExpression=update_expr,
                ExpressionAttributeNames={'#s': 'status'} if 'status' in kwargs else None,
                ExpressionAttributeValues=expr_attr_values,
                ReturnValues='ALL_NEW'
            )
            
            return response.get('Attributes')
        except Exception as e:
            print(f"DynamoDB update patient error: {e}")
            return None
    
    @staticmethod
    def delete_patient(patient_id):
        """Hastayı sil"""
        table = dynamodb_client.dynamodb.Table(Config.PATIENTS_TABLE)
        
        try:
            table.delete_item(Key={'id': patient_id})
            return True
        except Exception as e:
            print(f"DynamoDB delete patient error: {e}")
            return False
    
    @staticmethod
    def get_all_patients(organization_id=None):
        """Tüm hastaları getir (isteğe bağlı organizasyon filtresi)"""
        table = dynamodb_client.dynamodb.Table(Config.PATIENTS_TABLE)
        
        try:
            if organization_id:
                response = table.scan(
                    FilterExpression='organization_id = :org_id',
                    ExpressionAttributeValues={':org_id': organization_id}
                )
            else:
                response = table.scan()
            
            return response.get('Items', [])
        except Exception as e:
            print(f"DynamoDB get all patients error: {e}")
            return []
