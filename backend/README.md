# Dental AI Backend - Mikroservis Mimarisi

## 📁 Proje Yapısı

```
backend/
├── app.py                      # Ana Flask uygulaması
├── best.pt                     # YOLO AI modeli
├── config/                     # Konfigürasyon
│   ├── __init__.py
│   └── settings.py            # Ortam ayarları (Dev/Prod/Test)
├── middleware/                 # Middleware katmanı
│   ├── __init__.py
│   └── auth.py                # JWT kimlik doğrulama
├── services/                   # İş mantığı katmanı
│   ├── __init__.py
│   ├── ai_service.py          # AI analiz servisi
│   ├── user_service.py        # Kullanıcı yönetimi
│   ├── analysis_service.py    # Analiz yönetimi
│   ├── organization_service.py # Organizasyon yönetimi
│   ├── patient_service.py     # Hasta yönetimi
│   └── note_service.py        # Doktor notları
├── routes/                     # API endpoint'leri
│   ├── __init__.py
│   ├── auth_routes.py         # Kimlik doğrulama rotaları
│   ├── analysis_routes.py     # Analiz rotaları
│   ├── organization_routes.py # Organizasyon rotaları
│   ├── patient_routes.py      # Hasta rotaları
│   └── note_routes.py         # Not rotaları
├── utils/                      # Yardımcı fonksiyonlar
│   ├── __init__.py
│   ├── file_utils.py          # Dosya işlemleri
│   ├── json_utils.py          # JSON işlemleri
│   └── date_utils.py          # Tarih/zaman işlemleri
└── data/                       # Veri depolama
    ├── uploads/               # Yüklenen röntgen görselleri
    ├── history/               # Analiz geçmişi
    ├── users/                 # Kullanıcı verileri
    ├── organizations/         # Organizasyon verileri
    ├── patients/              # Hasta verileri
    └── notes/                 # Doktor notları
```

## 🚀 Başlatma

### Yeni Backend'i Çalıştırma
```bash
# Windows için
start-backend-new.bat

# veya manuel olarak
cd backend
..\.venv\Scripts\python.exe app.py
```

## 🔌 API Endpoints

### Kimlik Doğrulama (`/api`)
- `POST /register` - Yeni kullanıcı kaydı
- `POST /login` - Kullanıcı girişi
- `GET /me` - Mevcut kullanıcı bilgileri

### Analiz (`/api`)
- `POST /analyze` - Röntgen analizi (Token gerekli)
- `GET /history` - Analiz geçmişi (Token gerekli)
- `GET /analysis/<id>` - Belirli analiz detayı
- `DELETE /analysis/<id>` - Analiz silme

### Organizasyonlar (`/api`)
- `GET /organizations` - Tüm organizasyonlar
- `POST /organizations` - Yeni organizasyon (Admin/Doctor)
- `GET /organizations/<id>` - Organizasyon detayı
- `PUT /organizations/<id>` - Organizasyon güncelleme
- `DELETE /organizations/<id>` - Organizasyon silme (Admin)

### Hastalar (`/api`)
- `GET /patients` - Tüm hastalar (Admin/Doctor)
- `POST /patients` - Yeni hasta (Admin/Doctor)
- `GET /patients/<id>` - Hasta detayı
- `PUT /patients/<id>` - Hasta güncelleme
- `DELETE /patients/<id>` - Hasta silme

### Notlar (`/api`)
- `GET /notes/patient/<patient_id>` - Hastanın notları (Admin/Doctor)
- `GET /notes/doctor` - Doktorun notları (Doctor)
- `POST /notes` - Yeni not (Doctor)
- `GET /notes/<id>` - Not detayı
- `PUT /notes/<id>` - Not güncelleme (Kendi notu)
- `DELETE /notes/<id>` - Not silme

### Sağlık Kontrolü
- `GET /api/health` - Backend durum kontrolü

## 🔐 Yetkilendirme

### Roller
- **Admin**: Tüm yetkilere sahip
- **Doctor**: Hasta ve not yönetimi, analiz yapma
- **Patient**: Sadece kendi analizlerini görme

### Token Kullanımı
Tüm korumalı endpoint'ler için Header:
```
Authorization: Bearer <jwt_token>
```

## 🏗️ Mimari Prensipler

### Katmanlı Mimari
1. **Routes**: HTTP isteklerini karşılar, validasyon yapar
2. **Services**: İş mantığını çalıştırır
3. **Middleware**: Kimlik doğrulama ve yetkilendirme
4. **Utils**: Yardımcı fonksiyonlar

### Modüler Yapı
- Her servis kendi sorumluluğunda (Single Responsibility)
- Gevşek bağlılık (Loose Coupling)
- Yüksek uyum (High Cohesion)

### Veri Yönetimi
- JSON tabanlı dosya sistemi
- Kullanıcı bazlı veri izolasyonu
- Zaman damgalı kayıtlar

## 🔧 Geliştirme

### Yeni Endpoint Ekleme
1. `services/` altında servis oluştur
2. `routes/` altında blueprint oluştur
3. `app.py`'de blueprint'i kaydet

### Ortam Ayarları
`config/settings.py` dosyasında:
- `DevelopmentConfig` - Geliştirme
- `ProductionConfig` - Canlı ortam
- `TestingConfig` - Test ortamı

## 📊 Teknolojiler
- Flask 3.1.2 - Web framework
- PyJWT 2.10.1 - Token yönetimi
- Ultralytics 8.3.235 - YOLO AI modeli
- OpenCV 4.12.0.88 - Görüntü işleme
- Flask-CORS 6.0.1 - CORS yönetimi

## 🔄 Eski Yapıdan Farklar
- ❌ Monolitik `app.py` (653 satır)
- ✅ Modüler mikroservis yapısı
- ✅ Ayrıştırılmış sorumluluklar
- ✅ Daha kolay test edilebilir
- ✅ Daha kolay ölçeklenebilir
- ✅ Daha okunabilir kod

## 📝 Notlar
- Eski `app.py` dosyası proje kök dizininde yedek olarak duruyor
- Veri klasörleri `backend/data/` altına taşındı
- YOLO model dosyası `backend/best.pt` konumunda
