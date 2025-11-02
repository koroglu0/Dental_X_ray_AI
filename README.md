# 🦷 Dental X-Ray AI Analysis System

AI destekli diş röntgeni analiz sistemi. YOLO tabanlı nesne tespiti ile diş röntgenlerinde otomatik bulgu tespiti yapar.

## 🌟 Özellikler

- 🤖 **AI Destekli Analiz**: YOLO modeli ile otomatik diş röntgeni analizi
- 🎯 **Akıllı Tespit**: Çürük, apse, dolgu, implant ve diğer dental patolojilerin tespiti
- 📊 **Detaylı Raporlama**: Risk seviyeleri, güven skorları ve klinik öneriler
- 📄 **PDF Rapor**: Analiz sonuçlarını PDF olarak indirme
- � **Analiz Geçmişi**: Geçmiş analizleri görüntüleme ve takip
- 🔐 **Kullanıcı Sistemi**: Kayıt olma ve giriş yapma
- 🎨 **Modern Arayüz**: React + Tailwind CSS ile responsive tasarım
- � **Dark Mode**: Koyu tema desteği
- 📱 **Responsive**: Tüm cihazlarda çalışır

## 📁 Proje Yapısı

```
BitirmeProjesi/
├── dental-ai-web/          # React Frontend
│   ├── src/
│   │   ├── components/     # Yeniden kullanılabilir bileşenler
│   │   ├── pages/          # Sayfa bileşenleri
│   │   ├── services/       # API servisleri
│   │   └── types/          # TypeScript tipleri
│   ├── public/
│   └── package.json
├── app.py                  # Flask Backend
├── best.pt                 # YOLO Model
├── requirements.txt        # Python bağımlılıkları
└── uploads/                # Yüklenen dosyalar
```

## 🛠️ Teknolojiler

### Backend
- **Flask**: Python web framework
- **YOLO (Ultralytics)**: Nesne tespiti için AI modeli
- **OpenCV**: Görüntü işleme
- **PyJWT**: Kullanıcı kimlik doğrulama
- **Flask-CORS**: Cross-origin istekleri için

### Frontend
- **React 18.3**: Modern UI framework
- **Vite 7.1**: Hızlı build tool
- **Tailwind CSS 3.4**: Utility-first CSS framework
- **React Router 7.9**: Client-side routing
- **jsPDF + autoTable**: PDF oluşturma
- **Axios**: HTTP istekleri

## 📋 Gereksinimler

- Python 3.10+
- Node.js 18+
- npm veya yarn

## 🚀 Kurulum

### 1. Repository'yi Klonlayın

```bash
git clone https://github.com/koroglu0/Dental_X_ray_AI.git
cd Dental_X_ray_AI
```

### 2. Backend Kurulumu

```bash
# Virtual environment oluşturun
python -m venv .venv

# Virtual environment'ı aktifleştirin
# Windows:
.venv\Scripts\activate
# Linux/Mac:
source .venv/bin/activate

# Gerekli paketleri yükleyin
pip install -r requirements.txt
```

### 3. YOLO Model Dosyası

**Önemli:** `best.pt` model dosyası boyutu büyük olduğu için GitHub'a yüklenmemiştir. Model dosyasını aşağıdaki şekilde edinin:

1. Kendi eğittiğiniz YOLO modelini kullanın
2. Veya proje sahibinden model dosyasını edinin
3. `best.pt` dosyasını proje kök dizinine yerleştirin

### 4. Frontend Kurulumu

```bash
cd dental-ai-web
npm install
```

## ▶️ Çalıştırma

### Backend'i Başlatın

```bash
# Proje kök dizininde
python app.py
```

Backend şu adreste çalışacaktır: `http://localhost:5000`

### Frontend'i Başlatın

Yeni bir terminal açın:

```bash
cd dental-ai-web
npm run dev
```

Frontend şu adreste çalışacaktır: `http://localhost:5173`

## 🎯 Kullanım

1. Tarayıcınızda `http://localhost:5173` adresini açın
2. "Dosya Seçmek İçin Tıklayın" butonuna tıklayarak veya sürükle-bırak ile röntgen görüntüsünü yükleyin
3. "Analizi Başlat" butonuna tıklayın
4. Analiz sonuçlarını inceleyin
5. Geçmiş analizleri görmek için "Geçmiş Analizler" sayfasına gidin

## 🔧 Teknolojiler

### Frontend
- ⚛️ React 18.3
- 🎨 Tailwind CSS 3.4
- 🛣️ React Router 7.9
- 📡 Axios 1.13
- ⚡ Vite 7.1
- 📄 jsPDF + autoTable

### Backend
- 🐍 Python 3.10+
- 🌶️ Flask
- 🤖 YOLO (Ultralytics)
- 🖼️ OpenCV
- 🔄 Flask-CORS
- 🔐 PyJWT

## 📝 API Endpoints

### GET /api/health
Sunucu sağlık kontrolü

### POST /api/analyze
Röntgen analizi
- Body: FormData with 'file' field
- Response: Analiz sonuçları (bulgular, bounding box koordinatları, risk seviyeleri)

### GET /api/history
Tüm analiz geçmişini getir

### GET /api/history/<id>
Belirli bir analiz detayını getir

### POST /api/register
Yeni kullanıcı kaydı

### POST /api/login
Kullanıcı girişi

### GET /uploads/<filename>
Yüklenmiş görselleri servis et

## 🔒 Güvenlik Notları

⚠️ **Önemli:** 
- Bu sistem eğitim ve araştırma amaçlıdır
- Klinik karar verme için kullanılmamalıdır
- Her zaman profesyonel bir diş hekimine danışın
- Dosya boyutu maksimum 16MB ile sınırlıdır
- Sadece JPG, PNG ve JPEG formatları kabul edilir
- Kullanıcı şifreleri hash'lenerek saklanır

## 🤝 Katkıda Bulunma

1. Bu repository'yi fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'Add amazing feature'`)
4. Branch'inizi push edin (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## � Lisans

Bu proje eğitim amaçlıdır.

## 👨‍💻 Geliştirici

Mert Köroğlu - [@koroglu0](https://github.com/koroglu0)

## 🙏 Teşekkürler

- [Ultralytics YOLO](https://github.com/ultralytics/ultralytics) - Nesne tespiti modeli
- [React](https://react.dev/) - UI framework
- [Flask](https://flask.palletsprojects.com/) - Backend framework
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
