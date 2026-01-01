"""
Doktor notları rotaları
"""
from flask import Blueprint, request, jsonify
from middleware.auth import token_required, role_required
from services.note_service import NoteService

note_bp = Blueprint('note', __name__)

@note_bp.route('/notes/patient/<patient_id>', methods=['GET'])
@role_required('admin', 'doctor')
def get_patient_notes(current_user, patient_id):
    """Hastanın tüm notlarını getir"""
    try:
        notes = NoteService.get_patient_notes(patient_id)
        return jsonify({'notes': notes}), 200
        
    except Exception as e:
        return jsonify({'error': 'Notlar yüklenemedi'}), 500

@note_bp.route('/notes/doctor', methods=['GET'])
@role_required('doctor')
def get_doctor_notes(current_user):
    """Doktorun tüm notlarını getir"""
    try:
        doctor_email = current_user['email']
        notes = NoteService.get_doctor_notes(doctor_email)
        
        return jsonify({'notes': notes}), 200
        
    except Exception as e:
        return jsonify({'error': 'Notlar yüklenemedi'}), 500

@note_bp.route('/notes', methods=['POST'])
@role_required('doctor')
def create_note(current_user):
    """Yeni not oluştur"""
    try:
        data = request.get_json()
        
        patient_id = data.get('patient_id')
        content = data.get('content')
        note_type = data.get('type', 'general')
        
        if not patient_id or not content:
            return jsonify({'error': 'Hasta ID ve not içeriği gereklidir'}), 400
        
        doctor_email = current_user['email']
        note = NoteService.create_note(patient_id, doctor_email, content, note_type)
        
        return jsonify({
            'message': 'Not oluşturuldu',
            'note': note
        }), 201
        
    except Exception as e:
        return jsonify({'error': 'Not oluşturulamadı'}), 500

@note_bp.route('/notes/<note_id>', methods=['GET'])
@role_required('admin', 'doctor')
def get_note(current_user, note_id):
    """Not detaylarını getir"""
    try:
        note = NoteService.get_note(note_id)
        
        if not note:
            return jsonify({'error': 'Not bulunamadı'}), 404
        
        # Doktor sadece kendi notlarını görebilir (admin hepsini görebilir)
        user_role = current_user.get('role')
        if user_role == 'doctor' and note.get('doctor_email') != current_user['email']:
            return jsonify({'error': 'Bu nota erişim yetkiniz yok'}), 403
        
        return jsonify({'note': note}), 200
        
    except Exception as e:
        return jsonify({'error': 'Not alınamadı'}), 500

@note_bp.route('/notes/<note_id>', methods=['PUT'])
@role_required('doctor')
def update_note(current_user, note_id):
    """Notu güncelle"""
    try:
        # Önce notu al ve yetki kontrolü yap
        existing_note = NoteService.get_note(note_id)
        
        if not existing_note:
            return jsonify({'error': 'Not bulunamadı'}), 404
        
        # Sadece kendi notunu güncelleyebilir
        if existing_note.get('doctor_email') != current_user['email']:
            return jsonify({'error': 'Bu notu güncelleme yetkiniz yok'}), 403
        
        data = request.get_json()
        content = data.get('content')
        note_type = data.get('type')
        
        note = NoteService.update_note(note_id, content, note_type)
        
        return jsonify({
            'message': 'Not güncellendi',
            'note': note
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Not güncellenemedi'}), 500

@note_bp.route('/notes/<note_id>', methods=['DELETE'])
@role_required('admin', 'doctor')
def delete_note(current_user, note_id):
    """Notu sil"""
    try:
        # Önce notu al ve yetki kontrolü yap
        existing_note = NoteService.get_note(note_id)
        
        if not existing_note:
            return jsonify({'error': 'Not bulunamadı'}), 404
        
        # Doktor sadece kendi notunu silebilir (admin hepsini silebilir)
        user_role = current_user.get('role')
        if user_role == 'doctor' and existing_note.get('doctor_email') != current_user['email']:
            return jsonify({'error': 'Bu notu silme yetkiniz yok'}), 403
        
        success = NoteService.delete_note(note_id)
        
        if success:
            return jsonify({'message': 'Not silindi'}), 200
        else:
            return jsonify({'error': 'Not silinemedi'}), 500
        
    except Exception as e:
        return jsonify({'error': 'Silme işlemi başarısız'}), 500
