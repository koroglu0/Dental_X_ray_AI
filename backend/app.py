"""
Dental AI Backend - Mikroservis Mimarisi
Flask uygulaması ana dosyası
"""
import os
from flask import Flask
from flask_cors import CORS
from config.settings import Config

# Blueprint'leri import et
from routes.auth_routes import auth_bp
from routes.analysis_routes import analysis_bp
from routes.organization_routes import organization_bp
from routes.patient_routes import patient_bp
from routes.note_routes import note_bp
from routes.user_routes import user_bp

def create_app(config_class=Config):
    """Flask uygulaması oluştur"""
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # CORS ayarları
    CORS(app, origins=app.config['CORS_ORIGINS'])
    
    # Gerekli klasörleri oluştur
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(app.config['HISTORY_FOLDER'], exist_ok=True)
    os.makedirs(app.config['USERS_FOLDER'], exist_ok=True)
    os.makedirs(app.config['ORGANIZATIONS_FOLDER'], exist_ok=True)
    os.makedirs(app.config['PATIENTS_FOLDER'], exist_ok=True)
    os.makedirs(app.config['NOTES_FOLDER'], exist_ok=True)
    
    # Blueprint'leri kaydet
    app.register_blueprint(auth_bp, url_prefix='/api')
    app.register_blueprint(analysis_bp, url_prefix='/api')
    app.register_blueprint(organization_bp, url_prefix='/api')
    app.register_blueprint(patient_bp, url_prefix='/api')
    app.register_blueprint(note_bp, url_prefix='/api')
    app.register_blueprint(user_bp, url_prefix='/api')
    
    @app.route('/api/health')
    def health_check():
        """Sağlık kontrolü endpoint'i"""
        return {'status': 'healthy', 'message': 'Dental AI Backend is running'}, 200
    
    return app

if __name__ == '__main__':
    app = create_app()
    print("🚀 Dental AI Backend başlatılıyor...")
    print("📍 Server: http://localhost:5000")
    print("🏥 API Endpoints:")
    print("   - POST /api/register - Kullanıcı kaydı")
    print("   - POST /api/login - Kullanıcı girişi")
    print("   - GET  /api/me - Mevcut kullanıcı bilgileri")
    print("   - POST /api/analyze - Röntgen analizi")
    print("   - GET  /api/history - Analiz geçmişi")
    print("   - GET  /api/organizations - Organizasyon listesi")
    print("   - POST /api/organizations - Yeni organizasyon")
    print("   - GET  /api/patients - Hasta listesi")
    print("   - POST /api/patients - Yeni hasta")
    print("   - POST /api/notes - Yeni not")
    print("   - GET  /api/notes/patient/<id> - Hasta notları")
    print("   - GET  /api/health - Sağlık kontrolü")
    print("✅ Backend hazır!")
    
    app.run(host='0.0.0.0', port=5000, debug=False)
