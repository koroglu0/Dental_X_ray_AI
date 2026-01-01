"""
Hasta yönetim servisi
"""
import os
import json
import uuid
from datetime import datetime
from config.settings import Config

class PatientService:
    """Hasta işlemleri servisi"""
    
    @staticmethod
    def get_patients_file():
        """Hastalar dosya yolunu döndür"""
        return os.path.join(Config.PATIENTS_FOLDER, 'patients.json')
    
    @staticmethod
    def load_patients():
        """Tüm hastaları yükle"""
        file_path = PatientService.get_patients_file()
        
        if not os.path.exists(file_path):
            return []
        
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    @staticmethod
    def save_patients(patients):
        """Hastaları kaydet"""
        os.makedirs(Config.PATIENTS_FOLDER, exist_ok=True)
        file_path = PatientService.get_patients_file()
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(patients, f, ensure_ascii=False, indent=2)
    
    @staticmethod
    def create_patient(name, birth_date, gender, phone='', address='', organization_id=None):
        """Yeni hasta oluştur"""
        patients = PatientService.load_patients()
        
        patient = {
            'id': str(uuid.uuid4()),
            'name': name,
            'birth_date': birth_date,
            'gender': gender,
            'phone': phone,
            'address': address,
            'organization_id': organization_id,
            'created_at': datetime.now().isoformat(),
            'status': 'active'
        }
        
        patients.append(patient)
        PatientService.save_patients(patients)
        
        return patient
    
    @staticmethod
    def get_patient(patient_id):
        """Hasta bilgilerini getir"""
        patients = PatientService.load_patients()
        
        for patient in patients:
            if patient['id'] == patient_id:
                return patient
        
        return None
    
    @staticmethod
    def update_patient(patient_id, **kwargs):
        """Hasta bilgilerini güncelle"""
        patients = PatientService.load_patients()
        
        for i, patient in enumerate(patients):
            if patient['id'] == patient_id:
                # Güncellenebilir alanlar
                if 'name' in kwargs:
                    patient['name'] = kwargs['name']
                if 'birth_date' in kwargs:
                    patient['birth_date'] = kwargs['birth_date']
                if 'gender' in kwargs:
                    patient['gender'] = kwargs['gender']
                if 'phone' in kwargs:
                    patient['phone'] = kwargs['phone']
                if 'address' in kwargs:
                    patient['address'] = kwargs['address']
                if 'status' in kwargs:
                    patient['status'] = kwargs['status']
                
                patient['updated_at'] = datetime.now().isoformat()
                patients[i] = patient
                
                PatientService.save_patients(patients)
                return patient
        
        return None
    
    @staticmethod
    def delete_patient(patient_id):
        """Hastayı sil"""
        patients = PatientService.load_patients()
        
        for i, patient in enumerate(patients):
            if patient['id'] == patient_id:
                patients.pop(i)
                PatientService.save_patients(patients)
                return True
        
        return False
    
    @staticmethod
    def get_all_patients(organization_id=None):
        """Tüm hastaları getir (isteğe bağlı organizasyon filtresi)"""
        patients = PatientService.load_patients()
        
        if organization_id:
            patients = [p for p in patients if p.get('organization_id') == organization_id]
        
        return patients
