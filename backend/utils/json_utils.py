"""
JSON işlemleri için yardımcı fonksiyonlar
"""
import json
import os

def read_json(filepath):
    """JSON dosyasını oku"""
    if not os.path.exists(filepath):
        return None
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except json.JSONDecodeError:
        return None
    except Exception:
        return None

def write_json(filepath, data, indent=2):
    """JSON dosyasına yaz"""
    try:
        # Klasörü oluştur
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=indent)
        return True
    except Exception:
        return False

def append_to_json_array(filepath, item):
    """JSON array dosyasına yeni öğe ekle"""
    data = read_json(filepath)
    
    if data is None:
        data = []
    
    if not isinstance(data, list):
        return False
    
    data.append(item)
    return write_json(filepath, data)

def update_json_item(filepath, item_id, updated_data, id_field='id'):
    """JSON array'de belirli bir öğeyi güncelle"""
    data = read_json(filepath)
    
    if data is None or not isinstance(data, list):
        return False
    
    for i, item in enumerate(data):
        if item.get(id_field) == item_id:
            data[i].update(updated_data)
            return write_json(filepath, data)
    
    return False

def delete_json_item(filepath, item_id, id_field='id'):
    """JSON array'den belirli bir öğeyi sil"""
    data = read_json(filepath)
    
    if data is None or not isinstance(data, list):
        return False
    
    for i, item in enumerate(data):
        if item.get(id_field) == item_id:
            data.pop(i)
            return write_json(filepath, data)
    
    return False
