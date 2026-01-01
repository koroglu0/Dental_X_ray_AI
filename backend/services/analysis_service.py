"""
Analiz yönetim servisi - DynamoDB destekli
"""
import os
import json
from datetime import datetime
from decimal import Decimal
from config.settings import Config
from utils.dynamodb_client import dynamodb_client

class AnalysisService:
    """Analiz işlemleri servisi"""
    
    @staticmethod
    def _use_dynamodb():
        """DynamoDB kullanılabilir mi?"""
        return Config.USE_DYNAMODB and dynamodb_client.is_connected
    
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
        
        if AnalysisService._use_dynamodb():
            # DynamoDB'ye kaydet
            table = dynamodb_client.dynamodb.Table(Config.ANALYSES_TABLE)
            
            # Float'ları Decimal'e çevir
            dynamodb_data = AnalysisService._convert_floats_to_decimal(analysis_data)
            table.put_item(Item=dynamodb_data)
        else:
            # JSON dosyaya kaydet (fallback)
            os.makedirs(Config.HISTORY_FOLDER, exist_ok=True)
            
            filename = f"analysis_{analysis_data['timestamp']}.json"
            filepath = os.path.join(Config.HISTORY_FOLDER, filename)
            
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(analysis_data, f, ensure_ascii=False, indent=2)
        
        return analysis_data
    
    @staticmethod
    def update_analysis_with_results(analysis_id, doctor_email, results):
        """Pending analizi AI sonuçlarıyla güncelle"""
        if AnalysisService._use_dynamodb():
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
        else:
            # JSON dosyada güncelle
            filepath = os.path.join(Config.HISTORY_FOLDER, f"{analysis_id}.json")
            
            try:
                if os.path.exists(filepath):
                    with open(filepath, 'r', encoding='utf-8') as f:
                        analysis_data = json.load(f)
                    
                    analysis_data['status'] = 'analyzed'
                    analysis_data['findings'] = results.get('findings', [])
                    analysis_data['total_findings'] = results.get('total_findings', 0)
                    analysis_data['image_dimensions'] = results.get('image_dimensions', {})
                    analysis_data['analyzed_at'] = datetime.now().isoformat()
                    analysis_data['analyzed_by'] = doctor_email
                    
                    with open(filepath, 'w', encoding='utf-8') as f:
                        json.dump(analysis_data, f, ensure_ascii=False, indent=2)
                    
                    return analysis_data
                return None
            except Exception as e:
                print(f"❌ JSON update error: {e}")
                return None
    
    @staticmethod
    def get_user_analyses(user_email):
        """Kullanıcının analizlerini getir"""
        if AnalysisService._use_dynamodb():
            # DynamoDB'den al
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
        else:
            # JSON dosyalardan al (fallback)
            if not os.path.exists(Config.HISTORY_FOLDER):
                return []
            
            analyses = []
            for filename in os.listdir(Config.HISTORY_FOLDER):
                if filename.endswith('.json'):
                    filepath = os.path.join(Config.HISTORY_FOLDER, filename)
                    with open(filepath, 'r', encoding='utf-8') as f:
                        analysis = json.load(f)
                        if analysis.get('user_email') == user_email:
                            analyses.append(analysis)
            
            analyses.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
            return analyses
    
    @staticmethod
    def get_all_analyses():
        """Tüm analizleri getir (admin için)"""
        if AnalysisService._use_dynamodb():
            # DynamoDB'den al
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
        else:
            # JSON dosyalardan al (fallback)
            if not os.path.exists(Config.HISTORY_FOLDER):
                return []
            
            analyses = []
            for filename in os.listdir(Config.HISTORY_FOLDER):
                if filename.endswith('.json'):
                    filepath = os.path.join(Config.HISTORY_FOLDER, filename)
                    with open(filepath, 'r', encoding='utf-8') as f:
                        analysis = json.load(f)
                        analyses.append(analysis)
            
            analyses.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
            return analyses
    
    @staticmethod
    def get_analysis_by_id(analysis_id):
        """Belirli bir analizi getir"""
        if AnalysisService._use_dynamodb():
            # DynamoDB'den al
            table = dynamodb_client.dynamodb.Table(Config.ANALYSES_TABLE)
            
            try:
                response = table.get_item(Key={'id': analysis_id})
                if 'Item' in response:
                    return AnalysisService._convert_decimal_to_float(response['Item'])
                return None
            except Exception as e:
                print(f"DynamoDB get item error: {e}")
                return None
        else:
            # JSON dosyadan al (fallback)
            filepath = os.path.join(Config.HISTORY_FOLDER, f"{analysis_id}.json")
            
            if not os.path.exists(filepath):
                return None
            
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
    
    @staticmethod
    def delete_analysis(analysis_id):
        """Analizi sil"""
        if AnalysisService._use_dynamodb():
            # DynamoDB'den sil
            table = dynamodb_client.dynamodb.Table(Config.ANALYSES_TABLE)
            
            try:
                table.delete_item(Key={'id': analysis_id})
                return True
            except Exception as e:
                print(f"DynamoDB delete error: {e}")
                return False
        else:
            # JSON dosyayı sil (fallback)
            filepath = os.path.join(Config.HISTORY_FOLDER, f"{analysis_id}.json")
            
            if not os.path.exists(filepath):
                return False
            
            os.remove(filepath)
            return True
    
    @staticmethod
    def save_pending_analysis(user_email, filename, organization_id, doctor_email, patient_note=''):
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
            'date': datetime.now().isoformat(),
            'analyzed_at': None,
            'analyzed_by': None
        }
        
        if AnalysisService._use_dynamodb():
            # DynamoDB'ye kaydet
            table = dynamodb_client.dynamodb.Table(Config.ANALYSES_TABLE)
            dynamodb_data = AnalysisService._convert_floats_to_decimal(analysis_data)
            table.put_item(Item=dynamodb_data)
        else:
            # JSON dosyaya kaydet (fallback)
            os.makedirs(Config.HISTORY_FOLDER, exist_ok=True)
            filename_json = f"analysis_{analysis_data['timestamp']}.json"
            filepath = os.path.join(Config.HISTORY_FOLDER, filename_json)
            
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(analysis_data, f, ensure_ascii=False, indent=2)
        
        return analysis_data
    
    @staticmethod
    def get_pending_analyses_for_doctor(doctor_email):
        """Doktora gönderilmiş bekleyen analizleri getir"""
        if AnalysisService._use_dynamodb():
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
        else:
            # JSON dosyalardan ara
            analyses = []
            if not os.path.exists(Config.HISTORY_FOLDER):
                return analyses
            
            for filename in os.listdir(Config.HISTORY_FOLDER):
                if filename.endswith('.json'):
                    filepath = os.path.join(Config.HISTORY_FOLDER, filename)
                    try:
                        with open(filepath, 'r', encoding='utf-8') as f:
                            analysis = json.load(f)
                            if (analysis.get('doctor_email') == doctor_email and 
                                analysis.get('status') == 'pending'):
                                analyses.append(analysis)
                    except Exception as e:
                        print(f"Error reading analysis file {filename}: {e}")
            
            analyses.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
            return analyses

