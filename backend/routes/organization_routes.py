"""
Organizasyon rotaları
"""
from flask import Blueprint, request, jsonify
from middleware.auth import token_required, role_required
from services.organization_service import OrganizationService

organization_bp = Blueprint('organization', __name__)

@organization_bp.route('/organizations', methods=['GET'])
@token_required
def get_organizations(current_user):
    """Tüm organizasyonları listele"""
    try:
        organizations = OrganizationService.get_all_organizations()
        return jsonify({'organizations': organizations}), 200
    except Exception as e:
        return jsonify({'error': 'Organizasyonlar yüklenemedi'}), 500

@organization_bp.route('/organizations', methods=['POST'])
@role_required('admin', 'doctor')
def create_organization(current_user):
    """Yeni organizasyon oluştur"""
    try:
        data = request.get_json()
        
        name = data.get('name')
        org_type = data.get('type')
        address = data.get('address', '')
        phone = data.get('phone', '')
        
        if not name or not org_type:
            return jsonify({'error': 'İsim ve tip gereklidir'}), 400
        
        organization = OrganizationService.create_organization(name, org_type, address, phone)
        
        return jsonify({
            'message': 'Organizasyon oluşturuldu',
            'organization': organization
        }), 201
        
    except Exception as e:
        return jsonify({'error': 'Organizasyon oluşturulamadı'}), 500

@organization_bp.route('/organizations/<org_id>', methods=['GET'])
@token_required
def get_organization(current_user, org_id):
    """Organizasyon detaylarını getir"""
    try:
        organization = OrganizationService.get_organization(org_id)
        
        if not organization:
            return jsonify({'error': 'Organizasyon bulunamadı'}), 404
        
        return jsonify({'organization': organization}), 200
        
    except Exception as e:
        return jsonify({'error': 'Organizasyon alınamadı'}), 500

@organization_bp.route('/organizations/<org_id>', methods=['PUT'])
@role_required('admin', 'doctor')
def update_organization(current_user, org_id):
    """Organizasyon bilgilerini güncelle"""
    try:
        data = request.get_json()
        
        organization = OrganizationService.update_organization(org_id, **data)
        
        if not organization:
            return jsonify({'error': 'Organizasyon bulunamadı'}), 404
        
        return jsonify({
            'message': 'Organizasyon güncellendi',
            'organization': organization
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Organizasyon güncellenemedi'}), 500

@organization_bp.route('/organizations/<org_id>', methods=['DELETE'])
@role_required('admin')
def delete_organization(current_user, org_id):
    """Organizasyonu sil"""
    try:
        success = OrganizationService.delete_organization(org_id)
        
        if not success:
            return jsonify({'error': 'Organizasyon bulunamadı'}), 404
        
        return jsonify({'message': 'Organizasyon silindi'}), 200
        
    except Exception as e:
        return jsonify({'error': 'Organizasyon silinemedi'}), 500

@organization_bp.route('/organizations/<org_id>/invite-code', methods=['GET'])
@role_required('admin', 'doctor')
def get_invite_code(current_user, org_id):
    """Organizasyon davet kodunu getir"""
    try:
        # Kullanıcının bu organizasyona erişimi var mı kontrol et
        if current_user['role'] == 'doctor' and current_user.get('organization_id') != org_id:
            return jsonify({'error': 'Bu organizasyona erişim yetkiniz yok'}), 403
        
        organization = OrganizationService.get_organization(org_id)
        
        if not organization:
            return jsonify({'error': 'Organizasyon bulunamadı'}), 404
        
        return jsonify({
            'invite_code': organization.get('invite_code'),
            'organization_name': organization.get('name')
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Davet kodu alınamadı'}), 500

@organization_bp.route('/organizations/<org_id>/invite-code/regenerate', methods=['POST'])
@role_required('admin')
def regenerate_invite_code(current_user, org_id):
    """Organizasyon davet kodunu yeniden oluştur"""
    try:
        organization = OrganizationService.regenerate_invite_code(org_id)
        
        if not organization:
            return jsonify({'error': 'Organizasyon bulunamadı'}), 404
        
        return jsonify({
            'message': 'Davet kodu yenilendi',
            'invite_code': organization.get('invite_code')
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Davet kodu yenilenemedi'}), 500

@organization_bp.route('/organizations/join', methods=['POST'])
@token_required
def join_organization(current_user):
    """Davet kodu ile organizasyona katıl"""
    try:
        from services.user_service import UserService
        
        data = request.get_json()
        invite_code = data.get('invite_code')
        
        if not invite_code:
            return jsonify({'error': 'Davet kodu gereklidir'}), 400
        
        # Davet kodunu doğrula
        organization = OrganizationService.validate_invite_code(invite_code)
        
        if not organization:
            return jsonify({'error': 'Geçersiz veya süresi dolmuş davet kodu'}), 400
        
        # Kullanıcıyı organizasyona ekle
        try:
            OrganizationService.add_member(
                organization['id'],
                current_user['email'],
                current_user['name'],
                current_user.get('role', 'doctor')
            )
        except ValueError as e:
            return jsonify({'error': str(e)}), 400
        
        # Kullanıcının organization_id'sini güncelle
        UserService.update_user_organization(current_user['email'], organization['id'])
        
        return jsonify({
            'message': 'Organizasyona başarıyla katıldınız',
            'organization': {
                'id': organization['id'],
                'name': organization['name'],
                'type': organization['type']
            }
        }), 200
        
    except Exception as e:
        print(f"Join organization error: {e}")
        return jsonify({'error': 'Organizasyona katılma işlemi başarısız'}), 500

@organization_bp.route('/organizations/<org_id>/leave', methods=['POST'])
@token_required
def leave_organization(current_user, org_id):
    """Organizasyondan ayrıl"""
    try:
        from services.user_service import UserService
        
        # Kullanıcı bu organizasyonun üyesi mi?
        if current_user.get('organization_id') != org_id:
            return jsonify({'error': 'Bu organizasyonun üyesi değilsiniz'}), 400
        
        # Organizasyondan çıkar
        OrganizationService.remove_member(org_id, current_user['email'])
        
        # Kullanıcının organization_id'sini temizle
        UserService.update_user_organization(current_user['email'], None)
        
        return jsonify({'message': 'Organizasyondan başarıyla ayrıldınız'}), 200
        
    except Exception as e:
        print(f"Leave organization error: {e}")
        return jsonify({'error': 'Organizasyondan ayrılma işlemi başarısız'}), 500

@organization_bp.route('/organizations/<org_id>/members', methods=['GET'])
@token_required
def get_organization_members(current_user, org_id):
    """Organizasyon üyelerini listele"""
    try:
        print(f"📋 Get members request - Org ID: {org_id}, User: {current_user['email']}, Role: {current_user.get('role')}")
        
        # Yetki kontrolü: Admin herkesi görebilir, diğerleri sadece kendi organizasyonunu
        user_role = current_user.get('role')
        user_org_id = current_user.get('organization_id')
        
        # Hasta rolü: Tüm organizasyonların üyelerini görebilir (doktor seçmek için)
        # Doktor/Diğer roller: Sadece kendi organizasyonunu görebilir
        if user_role not in ['admin', 'patient'] and user_org_id != org_id:
            print(f"❌ Erişim reddedildi: User org={user_org_id}, Requested org={org_id}")
            return jsonify({'error': 'Bu organizasyona erişim yetkiniz yok'}), 403
        
        members = OrganizationService.get_organization_members(org_id)
        
        if members is None:
            print(f"❌ Organizasyon bulunamadı: {org_id}")
            return jsonify({'error': 'Organizasyon bulunamadı'}), 404
        
        print(f"✅ Members found: {len(members)} members")
        for member in members:
            print(f"   - {member.get('name')} ({member.get('email')}) - {member.get('role')}")
        
        return jsonify({'members': members}), 200
        
    except Exception as e:
        print(f"❌ Get members error: {e}")
        return jsonify({'error': 'Üyeler yüklenemedi'}), 500
