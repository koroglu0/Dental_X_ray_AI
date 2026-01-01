import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [patients, setPatients] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateOrgModal, setShowCreateOrgModal] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [newOrg, setNewOrg] = useState({
    name: '',
    type: 'clinic',
    address: '',
    phone: ''
  });

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    // Token kontrolü
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!token || !user.email) {
      console.error('Token veya kullanıcı bilgisi yok, login\'e yönlendiriliyor');
      navigate('/login');
      return;
    }
    
    if (user.role !== 'admin') {
      navigate('/');
      return;
    }
    
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Token'ı al
      const token = localStorage.getItem('token');
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const [patientsRes, orgsRes, historyRes, usersStatsRes] = await Promise.all([
        fetch('http://localhost:5000/api/patients', { headers }),
        fetch('http://localhost:5000/api/organizations', { headers }),
        fetch('http://localhost:5000/api/history', { headers }),
        fetch('http://localhost:5000/api/users/stats', { headers }),
      ]);

      if (patientsRes.ok) {
        const patientsData = await patientsRes.json();
        setPatients(patientsData.patients || []);
      }

      if (orgsRes.ok) {
        const orgsData = await orgsRes.json();
        setOrganizations(orgsData.organizations || []);
      }

      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setAnalyses(historyData.history || []);
      }

      if (usersStatsRes.ok) {
        const statsData = await usersStatsRes.json();
        setUserStats(statsData.stats);
      }

      setLoading(false);
    } catch (error) {
      console.error('Admin data fetch error:', error);
      setLoading(false);
    }
  };

  const handleCreateOrganization = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem('token');
      console.log('Token:', token ? `${token.substring(0, 20)}...` : 'Yok');
      
      const response = await fetch('http://localhost:5000/api/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newOrg)
      });

      const data = await response.json();
      console.log('Response:', data);

      if (response.ok) {
        alert(`Organizasyon oluşturuldu!\n\nDavet Kodu: ${data.organization.invite_code}\n\nBu kodu doktorlarla paylaşın.`);
        setShowCreateOrgModal(false);
        setNewOrg({ name: '', type: 'clinic', address: '', phone: '' });
        fetchData(); // Listeyi yenile
      } else {
        alert(data.error || 'Organizasyon oluşturulamadı');
      }
    } catch (error) {
      console.error('Create organization error:', error);
      alert('Bir hata oluştu');
    }
  };

  const handleViewOrganization = async (org) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/organizations/${org.id}/invite-code`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedOrg({ ...org, invite_code: data.invite_code });
      }
    } catch (error) {
      console.error('Get invite code error:', error);
    }
  };

  const copyInviteCode = (code) => {
    navigator.clipboard.writeText(code);
    alert('Davet kodu kopyalandı!');
  };

  const regenerateInviteCode = async (orgId) => {
    if (!confirm('Davet kodunu yenilemek istediğinizden emin misiniz? Eski kod geçersiz olacak.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/organizations/${orgId}/invite-code/regenerate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Yeni davet kodu: ${data.invite_code}`);
        setSelectedOrg({ ...selectedOrg, invite_code: data.invite_code });
      } else {
        alert(data.error || 'Davet kodu yenilenemedi');
      }
    } catch (error) {
      console.error('Regenerate invite code error:', error);
      alert('Bir hata oluştu');
    }
  };

  const handleDeleteOrganization = async (orgId, orgName) => {
    if (!confirm(`"${orgName}" organizasyonunu silmek istediğinizden emin misiniz?\n\nBu işlem geri alınamaz ve tüm organizasyon verileri silinecektir.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/organizations/${orgId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        alert('Organizasyon başarıyla silindi');
        setSelectedOrg(null);
        fetchData(); // Listeyi yenile
      } else {
        alert(data.error || 'Organizasyon silinemedi');
      }
    } catch (error) {
      console.error('Delete organization error:', error);
      alert('Bir hata oluştu');
    }
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
        <div className="mb-8">
          <h1 className="text-black dark:text-white text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em] mb-2">
            Admin Paneli
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-base">
            Hoş geldiniz, {user.name}
          </p>
        </div>

        {/* İstatistik Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="material-symbols-outlined text-purple-500 text-3xl">business</span>
              <h3 className="text-purple-700 dark:text-purple-400 font-bold text-sm">Organizasyonlar</h3>
            </div>
            <p className="text-4xl font-black text-black dark:text-white">{organizations.length}</p>
          </div>

          <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="material-symbols-outlined text-blue-500 text-3xl">local_hospital</span>
              <h3 className="text-blue-700 dark:text-blue-400 font-bold text-sm">Toplam Hasta</h3>
            </div>
            <p className="text-4xl font-black text-black dark:text-white">
              {userStats?.by_role?.patient || 0}
            </p>
          </div>

          <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="material-symbols-outlined text-green-500 text-3xl">badge</span>
              <h3 className="text-green-700 dark:text-green-400 font-bold text-sm">Aktif Doktorlar</h3>
            </div>
            <p className="text-4xl font-black text-black dark:text-white">
              {userStats?.by_role?.doctor || 0}
            </p>
          </div>

          <div className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="material-symbols-outlined text-orange-500 text-3xl">analytics</span>
              <h3 className="text-orange-700 dark:text-orange-400 font-bold text-sm">Toplam Analiz</h3>
            </div>
            <p className="text-4xl font-black text-black dark:text-white">{analyses.length}</p>
          </div>
        </div>

        {/* Yönetim Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-blue-500 text-2xl">person</span>
              </div>
              <h3 className="text-lg font-bold text-black dark:text-white">Kullanıcı Yönetimi</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Kullanıcıları görüntüle, düzenle ve yönet
            </p>
            <button 
              onClick={() => navigate('/admin/users')}
              className="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
            >
              Yönet
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-purple-500 text-2xl">business</span>
              </div>
              <h3 className="text-lg font-bold text-black dark:text-white">Organizasyonlar</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Hastane ve klinikleri yönet
            </p>
            <button 
              onClick={() => setShowCreateOrgModal(true)}
              className="w-full py-2 px-4 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors"
            >
              Yeni Oluştur
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-green-500 text-2xl">local_hospital</span>
              </div>
              <h3 className="text-lg font-bold text-black dark:text-white">Hasta Kayıtları</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Tüm hasta kayıtlarını görüntüle
            </p>
            <button 
              onClick={() => navigate('/admin/patients')}
              className="w-full py-2 px-4 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
            >
              Görüntüle
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-orange-500/10 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-orange-500 text-2xl">bar_chart</span>
              </div>
              <h3 className="text-lg font-bold text-black dark:text-white">Raporlar</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Analiz raporları ve istatistikler
            </p>
            <button 
              onClick={() => navigate('/history')}
              className="w-full py-2 px-4 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
            >
              Görüntüle
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-2xl">psychology</span>
              </div>
              <h3 className="text-lg font-bold text-black dark:text-white">AI Model</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Model performansı ve ayarları
            </p>
            <button className="w-full py-2 px-4 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors">
              Yönet
            </button>
          </div>
        </div>

        {/* Organizasyon Listesi */}
        {organizations.length > 0 && (
          <div className="mt-8 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-black dark:text-white mb-4">Organizasyonlar</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {organizations.map((org) => (
                <div 
                  key={org.id}
                  className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:border-purple-500 transition-colors cursor-pointer"
                  onClick={() => handleViewOrganization(org)}
                >
                  <h3 className="font-bold text-black dark:text-white mb-2">{org.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <span className="font-medium">Tip:</span> {org.type}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Üye sayısı:</span> {org.members?.length || 0}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Organizasyon Oluşturma Modal */}
        {showCreateOrgModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-black dark:text-white mb-4">
                Yeni Organizasyon Oluştur
              </h3>
              <form onSubmit={handleCreateOrganization} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Organizasyon Adı *
                  </label>
                  <input
                    type="text"
                    required
                    value={newOrg.name}
                    onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                    placeholder="Dental Klinik A.Ş."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tip *
                  </label>
                  <select
                    required
                    value={newOrg.type}
                    onChange={(e) => setNewOrg({ ...newOrg, type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                  >
                    <option value="clinic">Klinik</option>
                    <option value="hospital">Hastane</option>
                    <option value="private_practice">Özel Muayenehane</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Adres
                  </label>
                  <input
                    type="text"
                    value={newOrg.address}
                    onChange={(e) => setNewOrg({ ...newOrg, address: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                    placeholder="İstanbul, Türkiye"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    value={newOrg.phone}
                    onChange={(e) => setNewOrg({ ...newOrg, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                    placeholder="0212 123 45 67"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateOrgModal(false);
                      setNewOrg({ name: '', type: 'clinic', address: '', phone: '' });
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-black dark:text-white rounded-lg font-semibold transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
                  >
                    Oluştur
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Organizasyon Detay Modal */}
        {selectedOrg && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-lg w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-black dark:text-white">
                  {selectedOrg.name}
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDeleteOrganization(selectedOrg.id, selectedOrg.name)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Organizasyonu Sil"
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                  <button
                    onClick={() => setSelectedOrg(null)}
                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <span className="font-medium">Tip:</span> {selectedOrg.type}
                  </p>
                  {selectedOrg.address && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      <span className="font-medium">Adres:</span> {selectedOrg.address}
                    </p>
                  )}
                  {selectedOrg.phone && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Telefon:</span> {selectedOrg.phone}
                    </p>
                  )}
                </div>

                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Davet Kodu</p>
                  <div className="flex items-center justify-between gap-3">
                    <code className="text-2xl font-mono font-bold text-purple-600 dark:text-purple-400">
                      {selectedOrg.invite_code}
                    </code>
                    <div className="flex gap-2">
                      <button
                        onClick={() => copyInviteCode(selectedOrg.invite_code)}
                        className="p-2 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/40 dark:hover:bg-purple-900/60 rounded-lg transition-colors"
                        title="Kopyala"
                      >
                        <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">content_copy</span>
                      </button>
                      <button
                        onClick={() => regenerateInviteCode(selectedOrg.id)}
                        className="p-2 bg-orange-100 hover:bg-orange-200 dark:bg-orange-900/40 dark:hover:bg-orange-900/60 rounded-lg transition-colors"
                        title="Yenile"
                      >
                        <span className="material-symbols-outlined text-orange-600 dark:text-orange-400">refresh</span>
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Bu kodu doktorlarla paylaşın. Kayıt sırasında veya sonrasında kullanabilirler.
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Üyeler ({selectedOrg.members?.length || 0})
                  </p>
                  {selectedOrg.members && selectedOrg.members.length > 0 ? (
                    <ul className="space-y-2">
                      {selectedOrg.members.map((member, idx) => (
                        <li key={idx} className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                          <span className="material-symbols-outlined text-xs">person</span>
                          {member.name} ({member.email})
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">Henüz üye yok</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
