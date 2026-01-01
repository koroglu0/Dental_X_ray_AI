"""
AI analiz servisi - YOLO model ile röntgen analizi
"""
import cv2
import numpy as np
from ultralytics import YOLO
from config.settings import Config

class AIService:
    """AI analiz servisi"""
    
    def __init__(self):
        self.model = None
        self.load_model()
    
    def load_model(self):
        """YOLO modelini yükle"""
        try:
            self.model = YOLO(Config.MODEL_PATH)
            print(f"Model başarıyla yüklendi: {Config.MODEL_PATH}")
        except Exception as e:
            print(f"Model yükleme hatası: {e}")
            self.model = None
    
    def process_image(self, image_path):
        """Diş röntgeni üzerinde YOLO modeli ile analiz yap"""
        if self.model is None:
            return None, None
        
        try:
            # Görüntüyü oku
            image = cv2.imread(image_path)
            img_height, img_width = image.shape[:2]
            
            # YOLO modeli ile tahmin yap
            results = self.model(image)
            
            # Sonuçları işle
            findings = []
            for result in results:
                boxes = result.boxes
                for box in boxes:
                    # Sınıf adı, güven skoru ve bbox bilgilerini al
                    class_id = int(box.cls[0])
                    confidence = float(box.conf[0])
                    class_name = self.model.names[class_id]
                    
                    # Bounding box koordinatlarını al (xyxy formatında)
                    bbox = box.xyxy[0].cpu().numpy()
                    x1, y1, x2, y2 = map(float, bbox)
                    
                    # Normalize edilmiş koordinatlar (0-1 arası)
                    bbox_normalized = {
                        'x1': x1 / img_width,
                        'y1': y1 / img_height,
                        'x2': x2 / img_width,
                        'y2': y2 / img_height
                    }
                    
                    # Bulguları listele
                    finding = {
                        'name': class_name,
                        'location': f'Tespit edildi',
                        'confidence': round(confidence * 100, 2),
                        'risk': self._determine_risk(class_name, confidence),
                        'description': self._get_description(class_name),
                        'recommendations': self._get_recommendations(class_name),
                        'bbox': bbox_normalized
                    }
                    findings.append(finding)
            
            return findings, {'width': img_width, 'height': img_height}
        except Exception as e:
            print(f"Görüntü işleme hatası: {e}")
            return None, None
    
    def _determine_risk(self, class_name, confidence):
        """Bulgunun risk seviyesini belirle"""
        high_risk_conditions = ['abscess', 'periapical', 'caries_deep', 'fracture']
        medium_risk_conditions = ['caries', 'cavity', 'decay']
        
        class_lower = class_name.lower()
        
        for condition in high_risk_conditions:
            if condition in class_lower:
                return 'High Risk'
        
        for condition in medium_risk_conditions:
            if condition in class_lower:
                return 'Medium'
        
        return 'Info'
    
    def _get_description(self, class_name):
        """Bulgu için açıklama döndür"""
        descriptions = {
            'caries': 'Diş çürüğü tespit edildi. Diş dokusunun bakteriyel enfeksiyon nedeniyle zarar görmesi.',
            'cavity': 'Kavite (diş boşluğu) tespit edildi. Çürük nedeniyle oluşan diş yapısındaki kayıp.',
            'abscess': 'Apse tespit edildi. İltihaplı enfeksiyon bölgesi, acil müdahale gerektirebilir.',
            'periapical': 'Periapikal lezyon tespit edildi. Diş kökü ucunda enfeksiyon belirtisi.',
            'filling': 'Dolgu tespit edildi. Mevcut restorasyon.',
            'implant': 'İmplant tespit edildi. Dental implant yapısı.',
            'crown': 'Kron tespit edildi. Diş protezi.',
        }
        
        for key, desc in descriptions.items():
            if key in class_name.lower():
                return desc
        
        return f'{class_name} tespit edildi.'
    
    def _get_recommendations(self, class_name):
        """Bulgu için öneriler döndür"""
        recommendations = {
            'caries': 'Bir diş hekimine görünmeniz ve tedavi planlaması yapmanız önerilir.',
            'cavity': 'Dolgu tedavisi gerekebilir. Diş hekimi ile görüşmeniz önerilir.',
            'abscess': 'ACİL: En kısa sürede diş hekimine başvurunuz. Antibiyotik tedavi gerekebilir.',
            'periapical': 'Kanal tedavisi gerekebilir. Diş hekimi muayenesi şarttır.',
            'filling': 'Mevcut dolgunun durumu kontrol edilmelidir.',
            'implant': 'Düzenli kontroller ile takip edilmelidir.',
            'crown': 'Düzenli diş hekimi kontrolleri ile takip edilmelidir.',
        }
        
        for key, rec in recommendations.items():
            if key in class_name.lower():
                return rec
        
        return 'Detaylı muayene için diş hekimine başvurunuz.'

# Singleton instance
ai_service = AIService()
