"""
Hasta rotaları
"""
from flask import Blueprint, request, jsonify
from middleware.auth import token_required, role_required
from services.patient_service import PatientService

patient_bp = Blueprint('patient', __name__)

@patient_bp.route('/patients', methods=['GET'])
@role_required('admin', 'doctor')
def get_patients(current_user):
    """Tüm hastaları listele"""
    try:
        organization_id = request.args.get('organization_id')
        patients = PatientService.get_all_patients(organization_id)
        
        return jsonify({'patients': patients}), 200
        
    except Exception as e:
        return jsonify({'error': 'Hastalar yüklenemedi'}), 500

@patient_bp.route('/patients', methods=['POST'])
@role_required('admin', 'doctor')
def create_patient(current_user):
    """Yeni hasta oluştur"""
    try:
        data = request.get_json()
        
        name = data.get('name')
        birth_date = data.get('birth_date')
        gender = data.get('gender')
        phone = data.get('phone', '')
        address = data.get('address', '')
        organization_id = data.get('organization_id')
        
        if not name or not birth_date or not gender:
            return jsonify({'error': 'İsim, doğum tarihi ve cinsiyet gereklidir'}), 400
        
        patient = PatientService.create_patient(
            name, birth_date, gender, phone, address, organization_id
        )
        
        return jsonify({
            'message': 'Hasta oluşturuldu',
            'patient': patient
        }), 201
        
    except Exception as e:
        return jsonify({'error': 'Hasta oluşturulamadı'}), 500

@patient_bp.route('/patients/<patient_id>', methods=['GET'])
@token_required
def get_patient(current_user, patient_id):
    """Hasta detaylarını getir"""
    try:
        patient = PatientService.get_patient(patient_id)
        
        if not patient:
            return jsonify({'error': 'Hasta bulunamadı'}), 404
        
        return jsonify({'patient': patient}), 200
        
    except Exception as e:
        return jsonify({'error': 'Hasta alınamadı'}), 500

@patient_bp.route('/patients/<patient_id>', methods=['PUT'])
@role_required('admin', 'doctor')
def update_patient(current_user, patient_id):
    """Hasta bilgilerini güncelle"""
    try:
        data = request.get_json()
        
        patient = PatientService.update_patient(patient_id, **data)
        
        if not patient:
            return jsonify({'error': 'Hasta bulunamadı'}), 404
        
        return jsonify({
            'message': 'Hasta güncellendi',
            'patient': patient
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Hasta güncellenemedi'}), 500

@patient_bp.route('/patients/<patient_id>', methods=['DELETE'])
@role_required('admin', 'doctor')
def delete_patient(current_user, patient_id):
    """Hastayı sil"""
    try:
        success = PatientService.delete_patient(patient_id)
        
        if not success:
            return jsonify({'error': 'Hasta bulunamadı'}), 404
        
        return jsonify({'message': 'Hasta silindi'}), 200
        
    except Exception as e:
        return jsonify({'error': 'Hasta silinemedi'}), 500
