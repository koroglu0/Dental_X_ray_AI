"""
Google Gemini AI Servisi - PDF Rapor Oluşturma
"""
import os
import json
import requests
from config.settings import Config

class GeminiService:
    """Google Gemini API ile dental rapor oluşturma servisi"""
    
    def __init__(self):
        self.api_key = os.getenv('GEMINI_API_KEY', '')
        # Güncel Gemini model isimleri
        self.models = [
            "gemini-1.5-flash",
            "gemini-1.5-pro",
            "gemini-2.0-flash-exp"
        ]
        self.base_url = "https://generativelanguage.googleapis.com/v1beta/models"
    
    def generate_dental_report(self, findings, patient_info=None):
        """
        Analiz bulgularına göre detaylı dental rapor oluştur
        
        Args:
            findings: AI modelinin tespit ettiği bulgular listesi
            patient_info: Hasta bilgileri (opsiyonel)
        
        Returns:
            dict: AI tarafından oluşturulan rapor içeriği
        """
        if not self.api_key:
            print("⚠️ GEMINI_API_KEY bulunamadı, varsayılan rapor kullanılacak")
            return self._generate_fallback_report(findings)
        
        try:
            # Bulgulardan prompt oluştur
            prompt = self._create_prompt(findings, patient_info)
            
            # Birden fazla model dene
            for model in self.models:
                url = f"{self.base_url}/{model}:generateContent?key={self.api_key}"
                print(f"🔄 Deneniyor: {model}")
                
                response = requests.post(
                    url,
                    headers={"Content-Type": "application/json"},
                    json={
                        "contents": [{
                            "parts": [{
                                "text": prompt
                            }]
                        }],
                        "generationConfig": {
                            "temperature": 0.7,
                            "topK": 40,
                            "topP": 0.95,
                            "maxOutputTokens": 4096,
                        }
                    },
                    timeout=30
                )
                
                if response.status_code == 200:
                    result = response.json()
                    generated_text = result['candidates'][0]['content']['parts'][0]['text']
                    
                    # JSON formatında parse et
                    report = self._parse_report(generated_text)
                    print(f"✅ Gemini raporu başarıyla oluşturuldu ({model})")
                    return report
                else:
                    print(f"❌ {model} hatası: {response.status_code}")
            
            # Tüm modeller başarısız olduysa fallback
            print("❌ Tüm Gemini modelleri başarısız, varsayılan rapor kullanılıyor")
            return self._generate_fallback_report(findings)
                
        except Exception as e:
            print(f"❌ Gemini servis hatası: {e}")
            return self._generate_fallback_report(findings)
    
    def _create_prompt(self, findings, patient_info=None):
        """Gemini için detaylı prompt oluştur"""
        
        findings_text = ""
        for i, finding in enumerate(findings, 1):
            findings_text += f"""
{i}. Bulgu: {finding.get('name', 'Bilinmiyor')}
   - Konum: {finding.get('location', 'Belirtilmemiş')}
   - Risk Seviyesi: {finding.get('risk', 'Bilinmiyor')}
   - Güven Skoru: {finding.get('confidence', 0):.1f}%
   - Açıklama: {finding.get('description', '')}
"""
        
        prompt = f"""Sen deneyimli bir diş hekimi ve radyoloji uzmanısın. Aşağıdaki dental röntgen analiz sonuçlarına göre kapsamlı bir klinik rapor hazırla.

## ANALİZ BULGULARI:
{findings_text}

## RAPOR FORMATI (JSON):
Aşağıdaki JSON formatında yanıt ver:

{{
    "ozet": "Genel değerlendirme özeti (2-3 cümle)",
    "risk_degerlendirmesi": "Genel risk değerlendirmesi ve öncelik sıralaması",
    "detayli_bulgular": [
        {{
            "bulgu": "Bulgu adı",
            "klinik_onemi": "Bu bulgunun klinik önemi",
            "olasi_nedenler": "Olası nedenler",
            "tedavi_onerileri": "Tedavi önerileri"
        }}
    ],
    "acil_mudahale": "Acil müdahale gerektiren durumlar (varsa)",
    "tedavi_plani": "Önerilen tedavi planı ve sıralaması",
    "takip_onerileri": "Takip ve kontrol önerileri",
    "hasta_bilgilendirme": "Hastaya iletilecek bilgiler",
    "ek_tetkikler": "Önerilen ek tetkikler (varsa)",
    "prognoz": "Beklenen prognoz"
}}

ÖNEMLİ:
- Türkçe olarak yanıt ver
- Profesyonel tıbbi terminoloji kullan
- Somut ve uygulanabilir öneriler sun
- Risk seviyelerine göre önceliklendirme yap
- Sadece JSON formatında yanıt ver, başka açıklama ekleme
"""
        return prompt
    
    def _parse_report(self, generated_text):
        """Gemini yanıtını parse et"""
        try:
            # JSON bloğunu bul
            text = generated_text.strip()
            
            # Markdown code block varsa temizle
            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            
            text = text.strip()
            
            # JSON parse et
            report = json.loads(text)
            return report
            
        except json.JSONDecodeError as e:
            print(f"⚠️ JSON parse hatası: {e}")
            # Ham metin olarak döndür
            return {
                "ozet": generated_text[:500],
                "risk_degerlendirmesi": "Detaylı değerlendirme için raporu inceleyin.",
                "detayli_bulgular": [],
                "tedavi_plani": "Diş hekiminize danışın.",
                "takip_onerileri": "Düzenli kontroller önerilir.",
                "raw_response": generated_text
            }
    
    def _generate_fallback_report(self, findings):
        """API kullanılamadığında varsayılan rapor oluştur"""
        
        high_risk = [f for f in findings if f.get('risk') == 'High Risk']
        medium_risk = [f for f in findings if f.get('risk') == 'Medium']
        low_risk = [f for f in findings if f.get('risk') == 'Info']
        
        detayli_bulgular = []
        for finding in findings:
            detayli_bulgular.append({
                "bulgu": finding.get('name', 'Bilinmiyor'),
                "klinik_onemi": f"{finding.get('risk', 'Bilinmiyor')} seviyesinde bir bulgu tespit edilmiştir.",
                "olasi_nedenler": "Detaylı değerlendirme için diş hekimine başvurunuz.",
                "tedavi_onerileri": finding.get('recommendations', 'Diş hekiminize danışın.')
            })
        
        acil_mudahale = ""
        if high_risk:
            acil_mudahale = f"Yüksek riskli {len(high_risk)} bulgu tespit edilmiştir. En kısa sürede diş hekimine başvurmanız önerilir."
        
        return {
            "ozet": f"Dental röntgen analizinde toplam {len(findings)} bulgu tespit edilmiştir. "
                   f"Bunların {len(high_risk)} tanesi yüksek risk, {len(medium_risk)} tanesi orta risk, "
                   f"{len(low_risk)} tanesi düşük risk seviyesindedir.",
            "risk_degerlendirmesi": "Bulgular risk seviyesine göre önceliklendirilmiştir. "
                                   "Yüksek riskli bulgular öncelikli olarak ele alınmalıdır.",
            "detayli_bulgular": detayli_bulgular,
            "acil_mudahale": acil_mudahale if acil_mudahale else "Acil müdahale gerektiren bir durum tespit edilmemiştir.",
            "tedavi_plani": "Detaylı tedavi planı için diş hekiminize danışmanız önerilir.",
            "takip_onerileri": "6 ayda bir düzenli dental kontrol önerilir.",
            "hasta_bilgilendirme": "Bu rapor yapay zeka destekli bir ön değerlendirmedir. "
                                  "Kesin tanı ve tedavi için mutlaka bir diş hekimine başvurunuz.",
            "ek_tetkikler": "Gerekli görüldüğü takdirde ek radyografik tetkikler istenebilir.",
            "prognoz": "Erken teşhis ve tedavi ile olumlu sonuçlar beklenmektedir."
        }

# Singleton instance
gemini_service = GeminiService()
