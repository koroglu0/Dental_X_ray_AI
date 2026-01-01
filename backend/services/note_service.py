"""
Doktor notları yönetim servisi
"""
import os
import json
import uuid
from datetime import datetime
from config.settings import Config

class NoteService:
    """Doktor notları işlemleri servisi"""
    
    @staticmethod
    def get_notes_file():
        """Notlar dosya yolunu döndür"""
        return os.path.join(Config.NOTES_FOLDER, 'notes.json')
    
    @staticmethod
    def load_notes():
        """Tüm notları yükle"""
        file_path = NoteService.get_notes_file()
        
        if not os.path.exists(file_path):
            return []
        
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    @staticmethod
    def save_notes(notes):
        """Notları kaydet"""
        os.makedirs(Config.NOTES_FOLDER, exist_ok=True)
        file_path = NoteService.get_notes_file()
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(notes, f, ensure_ascii=False, indent=2)
    
    @staticmethod
    def create_note(patient_id, doctor_email, content, note_type='general'):
        """Yeni not oluştur"""
        notes = NoteService.load_notes()
        
        note = {
            'id': str(uuid.uuid4()),
            'patient_id': patient_id,
            'doctor_email': doctor_email,
            'content': content,
            'type': note_type,
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        notes.append(note)
        NoteService.save_notes(notes)
        
        return note
    
    @staticmethod
    def get_note(note_id):
        """Not bilgilerini getir"""
        notes = NoteService.load_notes()
        
        for note in notes:
            if note['id'] == note_id:
                return note
        
        return None
    
    @staticmethod
    def update_note(note_id, content=None, note_type=None):
        """Notu güncelle"""
        notes = NoteService.load_notes()
        
        for i, note in enumerate(notes):
            if note['id'] == note_id:
                if content is not None:
                    note['content'] = content
                if note_type is not None:
                    note['type'] = note_type
                
                note['updated_at'] = datetime.now().isoformat()
                notes[i] = note
                
                NoteService.save_notes(notes)
                return note
        
        return None
    
    @staticmethod
    def delete_note(note_id):
        """Notu sil"""
        notes = NoteService.load_notes()
        
        for i, note in enumerate(notes):
            if note['id'] == note_id:
                notes.pop(i)
                NoteService.save_notes(notes)
                return True
        
        return False
    
    @staticmethod
    def get_patient_notes(patient_id):
        """Hastanın tüm notlarını getir"""
        notes = NoteService.load_notes()
        patient_notes = [note for note in notes if note['patient_id'] == patient_id]
        
        # Tarihe göre sırala (en yeni önce)
        patient_notes.sort(key=lambda x: x['created_at'], reverse=True)
        return patient_notes
    
    @staticmethod
    def get_doctor_notes(doctor_email):
        """Doktorun tüm notlarını getir"""
        notes = NoteService.load_notes()
        doctor_notes = [note for note in notes if note['doctor_email'] == doctor_email]
        
        # Tarihe göre sırala (en yeni önce)
        doctor_notes.sort(key=lambda x: x['created_at'], reverse=True)
        return doctor_notes
