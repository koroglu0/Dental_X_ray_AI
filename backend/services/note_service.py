"""
Doktor notları yönetim servisi - Sadece DynamoDB
"""
import uuid
from datetime import datetime
from config.settings import Config
from utils.dynamodb_client import dynamodb_client

class NoteService:
    """Doktor notları işlemleri servisi - DynamoDB Only"""
    
    @staticmethod
    def create_note(patient_id, doctor_email, content, note_type='general'):
        """Yeni not oluştur"""
        note = {
            'id': str(uuid.uuid4()),
            'patient_id': patient_id,
            'doctor_email': doctor_email,
            'content': content,
            'type': note_type,
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        # DynamoDB'ye kaydet
        table = dynamodb_client.dynamodb.Table(Config.NOTES_TABLE)
        table.put_item(Item=note)
        
        return note
    
    @staticmethod
    def get_note(note_id):
        """Not bilgilerini getir"""
        table = dynamodb_client.dynamodb.Table(Config.NOTES_TABLE)
        
        try:
            response = table.get_item(Key={'id': note_id})
            return response.get('Item')
        except Exception as e:
            print(f"DynamoDB get note error: {e}")
            return None
    
    @staticmethod
    def update_note(note_id, content=None, note_type=None):
        """Notu güncelle"""
        table = dynamodb_client.dynamodb.Table(Config.NOTES_TABLE)
        
        try:
            update_expr_parts = []
            expr_attr_values = {}
            
            if content is not None:
                update_expr_parts.append('content = :content')
                expr_attr_values[':content'] = content
            if note_type is not None:
                update_expr_parts.append('#t = :type')
                expr_attr_values[':type'] = note_type
            
            update_expr_parts.append('updated_at = :updated_at')
            expr_attr_values[':updated_at'] = datetime.now().isoformat()
            
            update_expr = 'SET ' + ', '.join(update_expr_parts)
            
            response = table.update_item(
                Key={'id': note_id},
                UpdateExpression=update_expr,
                ExpressionAttributeNames={'#t': 'type'} if note_type is not None else None,
                ExpressionAttributeValues=expr_attr_values,
                ReturnValues='ALL_NEW'
            )
            
            return response.get('Attributes')
        except Exception as e:
            print(f"DynamoDB update note error: {e}")
            return None
    
    @staticmethod
    def delete_note(note_id):
        """Notu sil"""
        table = dynamodb_client.dynamodb.Table(Config.NOTES_TABLE)
        
        try:
            table.delete_item(Key={'id': note_id})
            return True
        except Exception as e:
            print(f"DynamoDB delete note error: {e}")
            return False
    
    @staticmethod
    def get_patient_notes(patient_id):
        """Hastanın tüm notlarını getir"""
        table = dynamodb_client.dynamodb.Table(Config.NOTES_TABLE)
        
        try:
            response = table.scan(
                FilterExpression='patient_id = :patient_id',
                ExpressionAttributeValues={':patient_id': patient_id}
            )
            
            patient_notes = response.get('Items', [])
            # Tarihe göre sırala (en yeni önce)
            patient_notes.sort(key=lambda x: x['created_at'], reverse=True)
            return patient_notes
        except Exception as e:
            print(f"DynamoDB get patient notes error: {e}")
            return []
    
    @staticmethod
    def get_doctor_notes(doctor_email):
        """Doktorun tüm notlarını getir"""
        table = dynamodb_client.dynamodb.Table(Config.NOTES_TABLE)
        
        try:
            response = table.scan(
                FilterExpression='doctor_email = :doctor_email',
                ExpressionAttributeValues={':doctor_email': doctor_email}
            )
            
            doctor_notes = response.get('Items', [])
            # Tarihe göre sırala (en yeni önce)
            doctor_notes.sort(key=lambda x: x['created_at'], reverse=True)
            return doctor_notes
        except Exception as e:
            print(f"DynamoDB get doctor notes error: {e}")
            return []
