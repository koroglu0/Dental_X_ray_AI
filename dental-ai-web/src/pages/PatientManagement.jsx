import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

export default function PatientManagement() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (!token || user.role !== 'admin') {
      navigate('/');
      return;
    }
    
    fetchPatients();
  }, []);

  useEffect(() => {
    // Ara
    let filtered = patients;
    
    if (searchQuery) {
      filtered = filtered.filter(p => 
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.phone?.includes(searchQuery)
      );
    }
    
    setFilteredPatients(filtered);
  }, [patients, searchQuery]);

  const fetchPatients = async () => {
    try {
      const token = localStorage.getItem('token');
      // Patient rolündeki kullanıcıları getir
      const response = await fetch('http://localhost:5000/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        // Sadece patient rolündeki kullanıcıları filtrele
        const patientUsers = (data.users || []).filter(u => u.role === 'patient');
        setPatients(patientUsers);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Fetch patients error:', error);
      setLoading(false);
    }
  };

  const handleViewPatient = (patient) => {
    setSelectedPatient({ ...patient });
    setShowDetailModal(true);
  };

  const handleEditPatient = (patient) => {
    setSelectedPatient({ ...patient });
    setShowDetailModal(false);
    setShowEditModal(true);
  };

  const handleUpdatePatient = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/users/${selectedPatient.email}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: selectedPatient.name,
          phone: selectedPatient.phone
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert('Hasta bilgileri güncellendi');
        setShowEditModal(false);
        fetchPatients();
      } else {
        alert(data.error || 'Güncelleme başarısız');
      }
    } catch (error) {
      console.error('Update patient error:', error);
      alert('Bir hata oluştu');
    }
  };

  const handleDeletePatient = async (patientId, patientName) => {
    if (!confirm(`"${patientName}" hastasını silmek istediğinizden emin misiniz?\n\nBu işlem geri alınamaz ve kullanıcı hesabı silinecektir.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/users/${patientId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (response.ok) {
        alert('Hasta silindi');
        setShowDetailModal(false);
        fetchPatients();
      } else {
        alert(data.error || 'Silme başarısız');
      }
    } catch (error) {
      console.error('Delete patient error:', error);
      alert('Bir hata oluştu');
    }
  };

  const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Yükleniyor...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 sm:p-6 lg:p-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-black dark:text-white text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em] mb-2">
              Hasta Kayıtları
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-base">
              Tüm hasta kayıtlarını görüntüle ve yönet
            </p>
          </div>
          <button
            onClick={() => navigate('/admin')}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-black dark:text-white rounded-lg transition-colors"
          >
            ← Geri
          </button>
        </div>

        {/* İstatistik */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-xl p-6">
            <h3 className="text-sm text-blue-700 dark:text-blue-400 font-bold mb-2">Toplam Hasta</h3>
            <p className="text-4xl font-black text-black dark:text-white">{patients.length}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-xl p-6">
            <h3 className="text-sm text-purple-700 dark:text-purple-400 font-bold mb-2">Erkek</h3>
            <p className="text-4xl font-black text-black dark:text-white">
              {patients.filter(p => p.gender === 'male').length}
            </p>
          </div>
          <div className="bg-gradient-to-br from-pink-500/10 to-pink-500/5 border border-pink-500/20 rounded-xl p-6">
            <h3 className="text-sm text-pink-700 dark:text-pink-400 font-bold mb-2">Kadın</h3>
            <p className="text-4xl font-black text-black dark:text-white">
              {patients.filter(p => p.gender === 'female').length}
            </p>
          </div>
        </div>

        {/* Arama */}
        <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Ara
          </label>
          <input
            type="text"
            placeholder="İsim, e-posta veya telefon..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
          />
        </div>

        {/* Hasta Listesi */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPatients.map((patient) => (
            <div
              key={patient.id}
              onClick={() => handleViewPatient(patient)}
              className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-6 hover:shadow-lg hover:border-primary transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-2xl">person</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-black dark:text-white">{patient.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {patient.age || calculateAge(patient.birth_date) || '-'} yaş
                    </p>
                  </div>
                </div>
                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                  patient.gender === 'male' 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400'
                }`}>
                  {patient.gender === 'male' ? 'Erkek' : patient.gender === 'female' ? 'Kadın' : '-'}
                </span>
              </div>

              <div className="space-y-2">
                {patient.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="material-symbols-outlined text-xs">mail</span>
                    <span>{patient.email}</span>
                  </div>
                )}
                {patient.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="material-symbols-outlined text-xs">call</span>
                    <span>{patient.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-500">
                  <span className="material-symbols-outlined text-xs">calendar_today</span>
                  <span>Kayıt: {patient.created_at ? new Date(patient.created_at).toLocaleDateString('tr-TR') : '-'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredPatients.length === 0 && (
          <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center">
            <span className="material-symbols-outlined text-gray-400 text-6xl mb-4">person_off</span>
            <p className="text-gray-500 dark:text-gray-400">Hasta bulunamadı</p>
          </div>
        )}

        {/* Detay Modal */}
        {showDetailModal && selectedPatient && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-black dark:text-white">
                  Hasta Detayları
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditPatient(selectedPatient)}
                    className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    title="Düzenle"
                  >
                    <span className="material-symbols-outlined">edit</span>
                  </button>
                  <button
                    onClick={() => handleDeletePatient(selectedPatient.id, selectedPatient.name)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Sil"
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Ad Soyad</label>
                    <p className="text-lg font-semibold text-black dark:text-white">{selectedPatient.name}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">E-posta</label>
                    <p className="text-lg font-semibold text-black dark:text-white">{selectedPatient.email || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Cinsiyet</label>
                    <p className="text-lg font-semibold text-black dark:text-white">
                      {selectedPatient.gender === 'male' ? 'Erkek' : selectedPatient.gender === 'female' ? 'Kadın' : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Durum</label>
                    <p className={`text-lg font-semibold ${selectedPatient.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedPatient.status === 'active' ? 'Aktif' : 'Pasif'}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Telefon</label>
                    <p className="text-lg font-semibold text-black dark:text-white">{selectedPatient.phone || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Kayıt Tarihi</label>
                    <p className="text-lg font-semibold text-black dark:text-white">
                      {selectedPatient.created_at ? new Date(selectedPatient.created_at).toLocaleDateString('tr-TR') : '-'}
                    </p>
                  </div>
                </div>
              </div>

              {selectedPatient.medical_history && (
                <div className="mt-6">
                  <label className="text-sm text-gray-500 dark:text-gray-400">Tıbbi Geçmiş</label>
                  <p className="mt-2 text-black dark:text-white whitespace-pre-wrap">
                    {selectedPatient.medical_history}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Düzenleme Modal */}
        {showEditModal && selectedPatient && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-black dark:text-white mb-4">
                Hasta Düzenle
              </h3>
              <form onSubmit={handleUpdatePatient} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Ad Soyad *
                  </label>
                  <input
                    type="text"
                    required
                    value={selectedPatient.name}
                    onChange={(e) => setSelectedPatient({ ...selectedPatient, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    E-posta
                  </label>
                  <input
                    type="email"
                    disabled
                    value={selectedPatient.email || ''}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">E-posta değiştirilemez</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    value={selectedPatient.phone || ''}
                    onChange={(e) => setSelectedPatient({ ...selectedPatient, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-black dark:text-white rounded-lg font-semibold transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
                  >
                    Kaydet
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
