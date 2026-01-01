import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [recentAnalyses, setRecentAnalyses] = useState([]);
  const [pendingXrays, setPendingXrays] = useState([]);
  const [organization, setOrganization] = useState(null);
  const [inviteCode, setInviteCode] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [stats, setStats] = useState({
    totalPatients: 0,
    todayAnalyses: 0,
    pendingReviews: 0,
  });
  const [loading, setLoading] = useState(true);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    // Token kontrolü
    const token = localStorage.getItem('token');
    
    if (!token || !user.email) {
      console.error('Token veya kullanıcı bilgisi yok, login\'e yönlendiriliyor');
      navigate('/login');
      return;
    }
    
    if (user.role !== 'doctor') {
      navigate('/');
      return;
    }
    
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Token'ı al
      const token = localStorage.getItem('token');
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Organizasyon bilgilerini getir
      if (user.organization_id) {
        const orgRes = await fetch(`http://localhost:5000/api/organizations/${user.organization_id}`, {
          headers: headers
        });
        if (orgRes.ok) {
          const orgData = await orgRes.json();
          setOrganization(orgData.organization);
          
          // Davet kodunu getir
          const inviteRes = await fetch(`http://localhost:5000/api/organizations/${user.organization_id}/invite-code`, {
            headers: headers
          });
          if (inviteRes.ok) {
            const inviteData = await inviteRes.json();
            setInviteCode(inviteData.invite_code);
          }
        }
      }

      // Son analizleri getir (doktor için sadece kendi analizleri)
      const historyRes = await fetch('http://localhost:5000/api/history', {
        headers: headers
      });
      
      let allAnalyses = [];
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        const historyList = historyData.history || [];
        allAnalyses = historyList;
        setRecentAnalyses(historyList.slice(0, 5));
        
        // Bugünkü analizleri say
        const today = new Date().toISOString().split('T')[0];
        const todayCount = historyList.filter(a => 
          a.date && a.date.startsWith(today)
        ).length;
        setStats(prev => ({ ...prev, todayAnalyses: todayCount }));
      }

      // Bekleyen röntgenleri getir
      const pendingRes = await fetch('http://localhost:5000/api/doctor/pending-xrays', {
        headers: headers
      });
      
      let pendingList = [];
      if (pendingRes.ok) {
        const pendingData = await pendingRes.json();
        pendingList = pendingData.pending_xrays || [];
        setPendingXrays(pendingList);
        setStats(prev => ({ ...prev, pendingReviews: pendingList.length }));
      }

      // Toplam benzersiz hasta sayısını hesapla
      // Hem pending hem de analyzed analizlerden hasta emaillerini al
      const patientEmails = new Set();
      
      // Pending analizlerden hasta emaillerini ekle
      pendingList.forEach(analysis => {
        if (analysis.user_email) {
          patientEmails.add(analysis.user_email);
        }
      });
      
      // Tamamlanmış analizlerden hasta emaillerini ekle
      allAnalyses.forEach(analysis => {
        if (analysis.user_email && analysis.doctor_email === user.email) {
          patientEmails.add(analysis.user_email);
        }
      });
      
      setStats(prev => ({ ...prev, totalPatients: patientEmails.size }));

      setLoading(false);
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
      setLoading(false);
    }
  };

  const handleJoinOrganization = async () => {
    if (!joinCode.trim()) {
      alert('Lütfen davet kodunu girin');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/organizations/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ invite_code: joinCode })
      });

      const data = await response.json();

      if (response.ok) {
        alert(`${data.organization.name} organizasyonuna başarıyla katıldınız!`);
        setShowJoinModal(false);
        setJoinCode('');
        
        // Kullanıcı bilgilerini güncelle
        const updatedUser = { ...user, organization_id: data.organization.id };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        // Sayfayı yenile
        window.location.reload();
      } else {
        alert(data.error || 'Organizasyona katılma başarısız');
      }
    } catch (error) {
      console.error('Join organization error:', error);
      alert('Bir hata oluştu');
    }
  };

  const handleLeaveOrganization = async () => {
    if (!confirm('Organizasyondan ayrılmak istediğinizden emin misiniz?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/organizations/${user.organization_id}/leave`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        alert('Organizasyondan başarıyla ayrıldınız');
        
        // Kullanıcı bilgilerini güncelle
        const updatedUser = { ...user, organization_id: null };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        // Sayfayı yenile
        window.location.reload();
      } else {
        alert(data.error || 'Organizasyondan ayrılma başarısız');
      }
    } catch (error) {
      console.error('Leave organization error:', error);
      alert('Bir hata oluştu');
    }
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(inviteCode);
    alert('Davet kodu kopyalandı!');
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
            Doktor Paneli
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-base">
            Hoş geldiniz, Dr. {user.name}
          </p>
          {user.specialization && (
            <p className="text-gray-500 dark:text-gray-500 text-sm">
              {user.specialization}
            </p>
          )}
        </div>

        {/* İstatistik Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="material-symbols-outlined text-blue-500 text-3xl">group</span>
              <h3 className="text-blue-700 dark:text-blue-400 font-bold">Toplam Hasta</h3>
            </div>
            <p className="text-4xl font-black text-black dark:text-white">{stats.totalPatients}</p>
          </div>

          <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="material-symbols-outlined text-green-500 text-3xl">analytics</span>
              <h3 className="text-green-700 dark:text-green-400 font-bold">Bugünkü Analiz</h3>
            </div>
            <p className="text-4xl font-black text-black dark:text-white">{stats.todayAnalyses}</p>
          </div>

          <div className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="material-symbols-outlined text-orange-500 text-3xl">pending_actions</span>
              <h3 className="text-orange-700 dark:text-orange-400 font-bold">Bekleyen İnceleme</h3>
            </div>
            <p className="text-4xl font-black text-black dark:text-white">{stats.pendingReviews}</p>
          </div>
        </div>

        {/* Organizasyon Kartı */}
        <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-purple-500 text-3xl">business</span>
              <h2 className="text-xl font-bold text-black dark:text-white">Organizasyon</h2>
            </div>
          </div>

          {organization ? (
            <div className="space-y-4">
              <div className="bg-white/50 dark:bg-slate-800/50 rounded-lg p-4">
                <h3 className="font-bold text-lg text-black dark:text-white mb-2">{organization.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  <span className="font-medium">Tip:</span> {organization.type}
                </p>
                {organization.address && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <span className="font-medium">Adres:</span> {organization.address}
                  </p>
                )}
                {organization.phone && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Telefon:</span> {organization.phone}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <div className="flex-1 bg-white/50 dark:bg-slate-800/50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Davet Kodu</p>
                  <div className="flex items-center gap-2">
                    <code className="text-lg font-mono font-bold text-purple-600 dark:text-purple-400">
                      {inviteCode || '••••••••'}
                    </code>
                    {inviteCode && (
                      <button
                        onClick={copyInviteCode}
                        className="p-1 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded transition-colors"
                        title="Kopyala"
                      >
                        <span className="material-symbols-outlined text-purple-500 text-sm">content_copy</span>
                      </button>
                    )}
                  </div>
                </div>
                
                <button
                  onClick={handleLeaveOrganization}
                  className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg transition-colors text-sm font-medium"
                >
                  Ayrıl
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Henüz bir organizasyona bağlı değilsiniz
              </p>
              <button
                onClick={() => setShowJoinModal(true)}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
              >
                Organizasyona Katıl
              </button>
            </div>
          )}
        </div>

        {/* Organizasyona Katılma Modal */}
        {showJoinModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-black dark:text-white mb-4">
                Organizasyona Katıl
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                Organizasyonunuzdan aldığınız 8 haneli davet kodunu girin
              </p>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="ABC12345"
                maxLength="8"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg mb-4 dark:bg-gray-800 dark:text-white text-center text-xl tracking-widest font-mono"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowJoinModal(false);
                    setJoinCode('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-black dark:text-white rounded-lg font-semibold transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={handleJoinOrganization}
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
                >
                  Katıl
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bekleyen Röntgenler */}
        {pendingXrays.length > 0 && (
          <div className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20 rounded-xl p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-orange-500 text-3xl">inbox</span>
              <h2 className="text-xl font-bold text-black dark:text-white">Bekleyen Röntgenler</h2>
              <span className="ml-auto bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                {pendingXrays.length}
              </span>
            </div>
            <div className="space-y-3">
              {pendingXrays.map((xray, index) => (
                <div key={index} className="bg-white dark:bg-slate-800 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-semibold text-black dark:text-white mb-1">
                        {xray.filename?.replace(/^\d+_/, '')}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Hasta: {xray.user_email}
                      </p>
                      {xray.patient_note && (
                        <p className="text-sm text-gray-500 dark:text-gray-500 mt-2 italic">
                          "{xray.patient_note}"
                        </p>
                      )}
                    </div>
                    <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-2 py-1 rounded text-xs font-medium">
                      Bekliyor
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(xray.timestamp).toLocaleString('tr-TR')}
                    </span>
                    <button
                      onClick={() => {
                        // Röntgeni analiz sayfasına yönlendir
                        localStorage.setItem('pendingXray', JSON.stringify(xray));
                        navigate('/');
                      }}
                      className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Analiz Et
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Son Analizler */}
          <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-black dark:text-white mb-4">Son Analizler</h2>
            <div className="space-y-3">
              {recentAnalyses.length > 0 ? (
                recentAnalyses.map((analysis, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer">
                    <div>
                      <p className="text-sm font-medium text-black dark:text-white">
                        {analysis.filename?.replace(/^\d+_/, '')}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(analysis.date).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-8">
                  Henüz analiz bulunmuyor
                </p>
              )}
            </div>
          </div>

          {/* Hızlı İşlemler */}
          <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-black dark:text-white mb-4">Hızlı İşlemler</h2>
            <div className="space-y-3">
              <button 
                onClick={() => navigate('/')}
                className="w-full flex items-center gap-3 p-4 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-primary text-2xl">add_circle</span>
                <div className="text-left">
                  <p className="font-bold text-black dark:text-white">Yeni Analiz</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Röntgen analizi başlat</p>
                </div>
              </button>

              <button className="w-full flex items-center gap-3 p-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors">
                <span className="material-symbols-outlined text-gray-600 dark:text-gray-400 text-2xl">person_add</span>
                <div className="text-left">
                  <p className="font-bold text-black dark:text-white">Yeni Hasta Ekle</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Hasta kaydı oluştur</p>
                </div>
              </button>

              <button 
                onClick={() => navigate('/history')}
                className="w-full flex items-center gap-3 p-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-gray-600 dark:text-gray-400 text-2xl">history</span>
                <div className="text-left">
                  <p className="font-bold text-black dark:text-white">Geçmiş Analizler</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Tüm analizleri görüntüle</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
