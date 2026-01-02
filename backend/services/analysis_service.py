"""
Analiz yönetim servisi - Sadece DynamoDB
"""
from datetime import datetime
from decimal import Decimal
from config.settings import Config
from utils.dynamodb_client import dynamodb_client

class AnalysisService:
    """Analiz işlemleri servisi - DynamoDB Only"""
    
    @staticmethod
    def _convert_floats_to_decimal(obj):
        """Float değerleri Decimal'e çevir (DynamoDB için)"""
        if isinstance(obj, list):
            return [AnalysisService._convert_floats_to_decimal(i) for i in obj]
        elif isinstance(obj, dict):
            return {k: AnalysisService._convert_floats_to_decimal(v) for k, v in obj.items()}
        elif isinstance(obj, float):
            return Decimal(str(obj))
        else:
            return obj
    
    @staticmethod
    def _convert_decimal_to_float(obj):
        """Decimal değerleri float'a çevir"""
        if isinstance(obj, list):
            return [AnalysisService._convert_decimal_to_float(i) for i in obj]
        elif isinstance(obj, dict):
            return {k: AnalysisService._convert_decimal_to_float(v) for k, v in obj.items()}
        elif isinstance(obj, Decimal):
            return float(obj)
        else:
            return obj
    
    @staticmethod
    def save_analysis(user_email, image_filename, results):
        """Analiz sonucunu kaydet"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        analysis_data = {
            'id': f'analysis_{timestamp}',
            'user_email': user_email,
            'timestamp': timestamp,
            'filename': image_filename,
            'findings': results.get('findings', []),
            'total_findings': results.get('total_findings', 0),
            'image_dimensions': results.get('image_dimensions', {}),
            'date': datetime.now().isoformat()
        }
        
        # DynamoDB'ye kaydet
        table = dynamodb_client.dynamodb.Table(Config.ANALYSES_TABLE)
        
        # Float'ları Decimal'e çevir
        dynamodb_data = AnalysisService._convert_floats_to_decimal(analysis_data)
        table.put_item(Item=dynamodb_data)
        
        return analysis_data
    
    @staticmethod
    def update_analysis_with_results(analysis_id, doctor_email, results):
        """Pending analizi AI sonuçlarıyla güncelle"""
        table = dynamodb_client.dynamodb.Table(Config.ANALYSES_TABLE)
        
        try:
            # Decimal'e çevir
            findings = AnalysisService._convert_floats_to_decimal(results.get('findings', []))
            dimensions = AnalysisService._convert_floats_to_decimal(results.get('image_dimensions', {}))
            
            # Analizi güncelle
            response = table.update_item(
                Key={'id': analysis_id},
                UpdateExpression='SET #status = :status, findings = :findings, total_findings = :total, image_dimensions = :dims, analyzed_at = :analyzed_at, analyzed_by = :doctor',
                ExpressionAttributeNames={
                    '#status': 'status'
                },
                ExpressionAttributeValues={
                    ':status': 'analyzed',
                    ':findings': findings,
                    ':total': results.get('total_findings', 0),
                    ':dims': dimensions,
                    ':analyzed_at': datetime.now().isoformat(),
                    ':doctor': doctor_email
                },
                ReturnValues='ALL_NEW'
            )
            
            updated_data = response.get('Attributes')
            if updated_data:
                updated_data = AnalysisService._convert_decimal_to_float(updated_data)
                print(f"✅ Analysis updated: {analysis_id} -> status=analyzed")
                return updated_data
            return None
            
        except Exception as e:
            print(f"❌ DynamoDB update error: {e}")
            return None
    
    @staticmethod
    def get_user_analyses(user_email):
        """Kullanıcının analizlerini getir"""
        table = dynamodb_client.dynamodb.Table(Config.ANALYSES_TABLE)
        
        try:
            response = table.query(
                IndexName='UserEmailIndex',
                KeyConditionExpression='user_email = :email',
                ExpressionAttributeValues={':email': user_email}
            )
            analyses = response.get('Items', [])
            
            # Decimal'leri float'a çevir
            analyses = AnalysisService._convert_decimal_to_float(analyses)
            
            # Tarihe göre sırala
            analyses.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
            return analyses
        except Exception as e:
            print(f"DynamoDB query error: {e}")
            return []
    
    @staticmethod
    def get_all_analyses():
        """Tüm analizleri getir (admin için)"""
        table = dynamodb_client.dynamodb.Table(Config.ANALYSES_TABLE)
        
        try:
            response = table.scan()
            analyses = response.get('Items', [])
            
            # Decimal'leri float'a çevir
            analyses = AnalysisService._convert_decimal_to_float(analyses)
            
            # Tarihe göre sırala
            analyses.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
            return analyses
        except Exception as e:
            print(f"DynamoDB scan error: {e}")
            return []
    
    @staticmethod
    def get_analysis_by_id(analysis_id):
        """Belirli bir analizi getir"""
        table = dynamodb_client.dynamodb.Table(Config.ANALYSES_TABLE)
        
        try:
            response = table.get_item(Key={'id': analysis_id})
            if 'Item' in response:
                return AnalysisService._convert_decimal_to_float(response['Item'])
            return None
        except Exception as e:
            print(f"DynamoDB get item error: {e}")
            return None
    
    @staticmethod
    def delete_analysis(analysis_id):
        """Analizi sil"""
        table = dynamodb_client.dynamodb.Table(Config.ANALYSES_TABLE)
        
        try:
            table.delete_item(Key={'id': analysis_id})
            return True
        except Exception as e:
            print(f"DynamoDB delete error: {e}")
            return False
    
    @staticmethod
    def save_pending_analysis(user_email, filename, organization_id, doctor_email, patient_note='', image_url=''):
        """Hasta tarafından gönderilen röntgeni kaydet (pending durumunda)"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        analysis_data = {
            'id': f'analysis_{timestamp}',
            'user_email': user_email,
            'timestamp': timestamp,
            'filename': filename,
            'organization_id': organization_id,
            'doctor_email': doctor_email,
            'patient_note': patient_note,
            'status': 'pending',  # pending, analyzed, approved, rejected
            'findings': [],
            'total_findings': 0,
            'image_dimensions': {},
            'image_url': image_url,
            'date': datetime.now().isoformat(),
            'analyzed_at': None,
            'analyzed_by': None
        }
        
        # DynamoDB'ye kaydet
        table = dynamodb_client.dynamodb.Table(Config.ANALYSES_TABLE)
        dynamodb_data = AnalysisService._convert_floats_to_decimal(analysis_data)
        table.put_item(Item=dynamodb_data)
        
        return analysis_data
    
    @staticmethod
    def get_pending_analyses_for_doctor(doctor_email):
        """Doktora gönderilmiş bekleyen analizleri getir"""
        table = dynamodb_client.dynamodb.Table(Config.ANALYSES_TABLE)
        
        try:
            response = table.scan(
                FilterExpression='doctor_email = :email AND #status = :status',
                ExpressionAttributeNames={'#status': 'status'},
                ExpressionAttributeValues={
                    ':email': doctor_email,
                    ':status': 'pending'
                }
            )
            analyses = response.get('Items', [])
            analyses = AnalysisService._convert_decimal_to_float(analyses)
            analyses.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
            return analyses
        except Exception as e:
            print(f"DynamoDB get pending analyses error: {e}")
            return []

