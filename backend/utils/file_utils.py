"""
Yardımcı fonksiyonlar
"""
import os

def allowed_file(filename, allowed_extensions=None):
    """Dosya uzantısını kontrol et"""
    if allowed_extensions is None:
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'bmp'}
    
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in allowed_extensions

def ensure_dir(directory):
    """Klasörün var olduğundan emin ol, yoksa oluştur"""
    if not os.path.exists(directory):
        os.makedirs(directory)
    return directory

def get_file_extension(filename):
    """Dosya uzantısını al"""
    if '.' in filename:
        return filename.rsplit('.', 1)[1].lower()
    return ''

def sanitize_filename(filename):
    """Dosya adını güvenli hale getir"""
    # Tehlikeli karakterleri kaldır
    dangerous_chars = ['..', '/', '\\', ':', '*', '?', '"', '<', '>', '|']
    safe_filename = filename
    
    for char in dangerous_chars:
        safe_filename = safe_filename.replace(char, '_')
    
    return safe_filename
