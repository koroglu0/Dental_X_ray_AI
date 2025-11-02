from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
import os
from datetime import datetime
from ultralytics import YOLO
import cv2
import numpy as np
import json
import jwt
from functools import wraps

app = Flask(__name__)
CORS(app)  # React'ten gelen istekleri kabul etmek için

# Konfigürasyon
UPLOAD_FOLDER = 'uploads'
HISTORY_FOLDER = 'history'
USERS_FOLDER = 'users'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
MODEL_PATH = 'best.pt'
SECRET_KEY = 'dental-ai-secret-key-2024'  # Üretimde değiştirin

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
app.config['SECRET_KEY'] = SECRET_KEY

# Upload, history ve users klasörlerini oluştur
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(HISTORY_FOLDER, exist_ok=True)
os.makedirs(USERS_FOLDER, exist_ok=True)

# YOLO modelini yükle
try:
    model = YOLO(MODEL_PATH)
    print(f"Model başarıyla yüklendi: {MODEL_PATH}")
except Exception as e:
    print(f"Model yükleme hatası: {e}")
    model = None

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def process_image(image_path):
    """Diş röntgeni üzerinde YOLO modeli ile analiz yap"""
    if model is None:
        return None, None
    
    try:
        # Görüntüyü oku
        image = cv2.imread(image_path)
        img_height, img_width = image.shape[:2]
        
        # YOLO modeli ile tahmin yap
        results = model(image)
        
        # Sonuçları işle
        findings = []
        for result in results:
            boxes = result.boxes
            for box in boxes:
                # Sınıf adı, güven skoru ve bbox bilgilerini al
                class_id = int(box.cls[0])
                confidence = float(box.conf[0])
                class_name = model.names[class_id]
                
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
                    'risk': determine_risk(class_name, confidence),
                    'description': get_description(class_name),
                    'recommendations': get_recommendations(class_name),
                    'bbox': bbox_normalized  # Bounding box koordinatları
                }
                findings.append(finding)
        
        return findings, {'width': img_width, 'height': img_height}
    except Exception as e:
        print(f"Görüntü işleme hatası: {e}")
        return None, None

def determine_risk(class_name, confidence):
    """Bulgunun risk seviyesini belirle"""
    high_risk_conditions = ['abscess', 'periapical', 'caries_deep', 'fracture']
    medium_risk_conditions = ['caries', 'cavity', 'decay']
    
    class_name_lower = class_name.lower()
    
    if any(condition in class_name_lower for condition in high_risk_conditions):
        return 'High Risk'
    elif any(condition in class_name_lower for condition in medium_risk_conditions):
        return 'Medium'
    else:
        return 'Info'

def get_description(class_name):
    """Bulguya göre açıklama döndür"""
    descriptions = {
        'caries': 'Dişte çürük tespit edildi. Dentin tabakasına kadar ilerlemiş olabilir.',
        'abscess': 'Periodontal apse tespit edildi. Dişin kök ucunda enfeksiyon belirtisi.',
        'filling': 'Mevcut dolgu tespit edildi.',
        'implant': 'Diş implantı tespit edildi.',
        'default': f'{class_name} tespit edildi. Detaylı inceleme gerekebilir.'
    }
    return descriptions.get(class_name.lower(), descriptions['default'])

def get_recommendations(class_name):
    """Bulguya göre öneriler döndür"""
    recommendations = {
        'caries': 'Diş hekimine başvurarak dolgu işlemi yaptırmanız önerilir.',
        'abscess': 'Acil diş hekimi muayenesi gereklidir. Endodontik tedavi veya çekim gerekebilir.',
        'filling': 'Dolgunun durumunu kontrol ettirmek için düzenli diş hekimi kontrolü önerilir.',
        'implant': 'İmplant durumunu kontrol ettirmek için düzenli takip önerilir.',
        'default': 'Detaylı değerlendirme için diş hekiminize danışın.'
    }
    return recommendations.get(class_name.lower(), recommendations['default'])

@app.route('/api/health', methods=['GET'])
def health_check():
    """Sağlık kontrolü endpoint'i"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/analyze', methods=['POST'])
def analyze_xray():
    """Röntgen analizi endpoint'i"""
    # Dosya kontrolü
    if 'file' not in request.files:
        return jsonify({'error': 'Dosya bulunamadı'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'Dosya seçilmedi'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'Geçersiz dosya formatı. JPG veya PNG kullanın.'}), 400
    
    try:
        # Dosyayı kaydet
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"{timestamp}_{filename}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        # Görüntüyü analiz et
        findings, image_dims = process_image(filepath)
        
        if findings is None:
            return jsonify({'error': 'Analiz sırasında bir hata oluştu'}), 500
        
        # Analiz ID'si oluştur
        analysis_id = f"analysis_{timestamp}"
        
        # Sonuçları döndür
        response = {
            'success': True,
            'id': analysis_id,
            'filename': filename,
            'timestamp': timestamp,
            'findings': findings,
            'total_findings': len(findings),
            'image_dimensions': image_dims
        }
        
        # Analiz geçmişini kaydet
        save_analysis_history(analysis_id, response, filename)
        
        return jsonify(response), 200
        
    except Exception as e:
        print(f"Hata: {e}")
        return jsonify({'error': str(e)}), 500

def save_analysis_history(analysis_id, result, filename):
    """Analiz sonucunu geçmişe kaydet"""
    try:
        history_file = os.path.join(HISTORY_FOLDER, f"{analysis_id}.json")
        
        history_data = {
            'id': analysis_id,
            'filename': filename,
            'timestamp': result['timestamp'],
            'date': datetime.now().isoformat(),
            'findings': result['findings'],
            'total_findings': result['total_findings'],
            'image_dimensions': result.get('image_dimensions')
        }
        
        with open(history_file, 'w', encoding='utf-8') as f:
            json.dump(history_data, f, ensure_ascii=False, indent=2)
            
    except Exception as e:
        print(f"Geçmiş kaydetme hatası: {e}")

@app.route('/api/history', methods=['GET'])
def get_history():
    """Analiz geçmişini döndür"""
    try:
        history = []
        
        # History klasöründeki tüm JSON dosyalarını oku
        if os.path.exists(HISTORY_FOLDER):
            for filename in os.listdir(HISTORY_FOLDER):
                if filename.endswith('.json'):
                    filepath = os.path.join(HISTORY_FOLDER, filename)
                    try:
                        with open(filepath, 'r', encoding='utf-8') as f:
                            data = json.load(f)
                            history.append(data)
                    except Exception as e:
                        print(f"Dosya okuma hatası ({filename}): {e}")
        
        # Tarihe göre sırala (en yeni önce)
        history.sort(key=lambda x: x.get('date', ''), reverse=True)
        
        return jsonify(history), 200
    except Exception as e:
        print(f"Geçmiş getirme hatası: {e}")
        return jsonify([]), 200

@app.route('/api/history/<analysis_id>', methods=['GET'])
def get_analysis_detail(analysis_id):
    """Belirli bir analiz detayını döndür"""
    try:
        history_file = os.path.join(HISTORY_FOLDER, f"{analysis_id}.json")
        
        if not os.path.exists(history_file):
            return jsonify({'error': 'Analiz bulunamadı'}), 404
        
        with open(history_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Görsel dosyasının yolunu ekle
        image_path = os.path.join(app.config['UPLOAD_FOLDER'], data['filename'])
        if os.path.exists(image_path):
            data['image_available'] = True
        else:
            data['image_available'] = False
            
        return jsonify(data), 200
    except Exception as e:
        print(f"Analiz detayı getirme hatası: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/uploads/<filename>')
def serve_image(filename):
    """Upload edilmiş görüntüleri servis et"""
    from flask import send_from_directory
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# ===== AUTHENTICATION ENDPOINTS =====

def get_user_file(email):
    """Kullanıcı dosyasının yolunu döndür"""
    safe_email = email.replace('@', '_at_').replace('.', '_dot_')
    return os.path.join(USERS_FOLDER, f"{safe_email}.json")

@app.route('/api/register', methods=['POST'])
def register():
    """Yeni kullanıcı kaydı"""
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        name = data.get('name', '').strip()
        
        if not email or not password or not name:
            return jsonify({'error': 'Tüm alanlar zorunludur'}), 400
        
        # Kullanıcı zaten var mı kontrol et
        user_file = get_user_file(email)
        if os.path.exists(user_file):
            return jsonify({'error': 'Bu e-posta adresi zaten kayıtlı'}), 400
        
        # Şifreyi hashle
        password_hash = generate_password_hash(password)
        
        # Kullanıcı bilgilerini kaydet
        user_data = {
            'email': email,
            'name': name,
            'password_hash': password_hash,
            'created_at': datetime.now().isoformat()
        }
        
        with open(user_file, 'w', encoding='utf-8') as f:
            json.dump(user_data, f, ensure_ascii=False, indent=2)
        
        # JWT token oluştur
        token = jwt.encode({
            'email': email,
            'name': name
        }, SECRET_KEY, algorithm='HS256')
        
        return jsonify({
            'token': token,
            'user': {
                'email': email,
                'name': name
            }
        }), 201
    except Exception as e:
        print(f"Kayıt hatası: {e}")
        return jsonify({'error': 'Kayıt işlemi başarısız'}), 500

@app.route('/api/login', methods=['POST'])
def login():
    """Kullanıcı girişi"""
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        if not email or not password:
            return jsonify({'error': 'E-posta ve şifre gereklidir'}), 400
        
        # Kullanıcıyı bul
        user_file = get_user_file(email)
        if not os.path.exists(user_file):
            return jsonify({'error': 'E-posta veya şifre hatalı'}), 401
        
        # Kullanıcı bilgilerini oku
        with open(user_file, 'r', encoding='utf-8') as f:
            user_data = json.load(f)
        
        # Şifreyi kontrol et
        if not check_password_hash(user_data['password_hash'], password):
            return jsonify({'error': 'E-posta veya şifre hatalı'}), 401
        
        # JWT token oluştur
        token = jwt.encode({
            'email': user_data['email'],
            'name': user_data['name']
        }, SECRET_KEY, algorithm='HS256')
        
        return jsonify({
            'token': token,
            'user': {
                'email': user_data['email'],
                'name': user_data['name']
            }
        }), 200
    except Exception as e:
        print(f"Giriş hatası: {e}")
        return jsonify({'error': 'Giriş işlemi başarısız'}), 500

if __name__ == '__main__':
    print("Flask server başlatılıyor...")
    print(f"Model durumu: {'Yüklü' if model else 'Yüklenemedi'}")
    app.run(debug=True, host='0.0.0.0', port=5000)
