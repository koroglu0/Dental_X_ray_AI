"""
Tarih ve zaman işlemleri için yardımcı fonksiyonlar
"""
from datetime import datetime

def get_timestamp():
    """Mevcut zaman damgasını al (YYYYmmdd_HHMMSS formatında)"""
    return datetime.now().strftime('%Y%m%d_%H%M%S')

def get_iso_timestamp():
    """ISO formatında zaman damgası al"""
    return datetime.now().isoformat()

def format_date(date_str, input_format='%Y-%m-%d', output_format='%d.%m.%Y'):
    """Tarih formatını dönüştür"""
    try:
        date_obj = datetime.strptime(date_str, input_format)
        return date_obj.strftime(output_format)
    except ValueError:
        return date_str

def get_readable_datetime(iso_string=None):
    """ISO string'i okunabilir formata çevir"""
    if iso_string is None:
        dt = datetime.now()
    else:
        try:
            dt = datetime.fromisoformat(iso_string)
        except ValueError:
            return iso_string
    
    return dt.strftime('%d.%m.%Y %H:%M')

def calculate_age(birth_date_str, date_format='%Y-%m-%d'):
    """Doğum tarihinden yaş hesapla"""
    try:
        birth_date = datetime.strptime(birth_date_str, date_format)
        today = datetime.now()
        age = today.year - birth_date.year
        
        # Doğum günü henüz gelmediyse bir yıl çıkar
        if (today.month, today.day) < (birth_date.month, birth_date.day):
            age -= 1
        
        return age
    except ValueError:
        return None
