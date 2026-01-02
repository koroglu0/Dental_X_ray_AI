import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { config } from '../config';

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
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
        fetch(`${config.apiBaseUrl}/api/patients`, { headers }),
        fetch(`${config.apiBaseUrl}/api/organizations`, { headers }),
        fetch(`${config.apiBaseUrl}/api/history`, { headers }),
        fetch(`${config.apiBaseUrl}/api/users/stats`, { headers }),
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
      
      const response = await fetch(`${config.apiBaseUrl}/api/organizations`, {
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
      const response = await fetch(`${config.apiBaseUrl}/api/organizations/${org.id}/invite-code`, {
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
      const response = await fetch(`${config.apiBaseUrl}/api/organizations/${orgId}/invite-code/regenerate`, {
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
      const response = await fetch(`${config.apiBaseUrl}/api/organizations/${orgId}`, {
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
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  const recentAnalyses = analyses.slice(0, 3);

  // Analiz trendleri için son 7 günün verilerini hesapla
  const calculateTrendData = () => {
    const today = new Date();
    const trendData = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const count = analyses.filter(a => {
        const analysisDate = new Date(a.date || a.timestamp).toISOString().split('T')[0];
        return analysisDate === dateStr;
      }).length;
      
      trendData.push({ 
        date: date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }), 
        count 
      });
    }
    
    return trendData;
  };

  const trendData = calculateTrendData();
  const maxTrendCount = Math.max(...trendData.map(d => d.count), 1);

  // Rapor indirme fonksiyonu
  const handleDownloadReport = async () => {
    try {
      const reportData = {
        date: new Date().toLocaleDateString('tr-TR'),
        organizations: organizations.length,
        doctors: userStats?.by_role?.doctor || 0,
        patients: userStats?.by_role?.patient || 0,
        analyses: analyses.length,
        recentAnalyses: analyses.slice(0, 10)
      };

      const reportText = `
DENTAL AI - YÖNETİM RAPORU
Tarih: ${reportData.date}

İSTATİSTİKLER
====================
Toplam Organizasyon: ${reportData.organizations}
Toplam Doktor: ${reportData.doctors}
Toplam Hasta: ${reportData.patients}
Toplam Analiz: ${reportData.analyses}

SON ANALİZLER
====================
${reportData.recentAnalyses.map((a, idx) => 
  `${idx + 1}. ${a.user_email} - ${new Date(a.date || a.timestamp).toLocaleDateString('tr-TR')}`
).join('\n')}
      `.trim();

      const blob = new Blob([reportText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dental-ai-rapor-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Rapor indirme hatası:', error);
      alert('Rapor indirilemedi');
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-50 dark:bg-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 flex-shrink-0 flex flex-col h-full transition-colors duration-200 hidden lg:flex">
        <div className="p-6 flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <span className="material-symbols-outlined text-primary text-3xl">dentistry</span>
          </div>
          <div>
            <h1 className="text-base font-bold leading-none text-gray-900 dark:text-white">Admin Paneli</h1>
            <p className="text-xs text-primary font-medium mt-1">Diş Analiz Platformu</p>
          </div>
        </div>

        <nav className="flex-1 px-4 flex flex-col gap-1 overflow-y-auto py-4">
          <a 
            href="#" 
            onClick={(e) => { e.preventDefault(); setActiveSection('dashboard'); }}
            className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all group ${
              activeSection === 'dashboard' 
                ? 'bg-primary/10 text-primary' 
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'
            }`}
          >
            <span className={`material-symbols-outlined ${activeSection === 'dashboard' ? 'fill-1' : ''}`}>dashboard</span>
            <span className="text-sm font-semibold">Genel Bakış</span>
          </a>

          <a 
            href="#" 
            onClick={(e) => { e.preventDefault(); setActiveSection('organizations'); }}
            className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all group ${
              activeSection === 'organizations' 
                ? 'bg-primary/10 text-primary' 
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'
            }`}
          >
            <span className={`material-symbols-outlined ${activeSection === 'organizations' ? 'fill-1' : ''} group-hover:text-primary transition-colors`}>domain</span>
            <span className="text-sm font-medium">Organizasyonlar</span>
          </a>

          <a 
            href="#" 
            onClick={(e) => { e.preventDefault(); navigate('/admin/users'); }}
            className="flex items-center gap-3 px-3 py-3 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all group"
          >
            <span className="material-symbols-outlined group-hover:text-primary transition-colors">group</span>
            <span className="text-sm font-medium">Kullanıcılar</span>
          </a>

          <a 
            href="#" 
            onClick={(e) => { e.preventDefault(); navigate('/admin/patients'); }}
            className="flex items-center gap-3 px-3 py-3 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all group"
          >
            <span className="material-symbols-outlined group-hover:text-primary transition-colors">folder_shared</span>
            <span className="text-sm font-medium">Hasta Kayıtları</span>
          </a>

          <div className="my-2 border-t border-gray-100 dark:border-slate-700"></div>

          <a 
            href="#" 
            onClick={(e) => { e.preventDefault(); navigate('/history'); }}
            className="flex items-center gap-3 px-3 py-3 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all group"
          >
            <span className="material-symbols-outlined group-hover:text-primary transition-colors">bar_chart</span>
            <span className="text-sm font-medium">Raporlar</span>
          </a>

          <a 
            href="#" 
            className="flex items-center gap-3 px-3 py-3 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all group"
          >
            <span className="material-symbols-outlined group-hover:text-primary transition-colors">settings</span>
            <span className="text-sm font-medium">Sistem Ayarları</span>
          </a>
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer transition-colors mb-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border-2 border-gray-100 dark:border-slate-700">
              <span className="material-symbols-outlined text-primary">person</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Süper Yönetici</p>
            </div>
            <span className="material-symbols-outlined text-gray-400 text-sm">more_vert</span>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              navigate('/login');
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="text-sm font-medium">Çıkış Yap</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header */}
        <header className="h-16 bg-white dark:bg-slate-800/80 backdrop-blur border-b border-gray-200 dark:border-slate-700 flex items-center justify-between px-6 lg:px-8 z-10 sticky top-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden text-gray-500 hover:text-primary"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <nav className="hidden sm:flex text-sm font-medium text-gray-500 dark:text-gray-400">
              <a href="#" className="hover:text-primary transition-colors">Ana Sayfa</a>
              <span className="mx-2">/</span>
              <span className="text-gray-900 dark:text-white">Kontrol Paneli</span>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">search</span>
              <input 
                className="pl-10 pr-4 py-2 bg-gray-100 dark:bg-slate-700 border-none rounded-full text-sm w-64 focus:ring-2 focus:ring-primary/50 text-gray-900 dark:text-white placeholder-gray-500" 
                placeholder="Organizasyon, doktor veya hasta ara..." 
                type="text"
              />
            </div>
            <button className="w-10 h-10 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 relative transition-colors">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-800"></span>
            </button>
            <button className="w-10 h-10 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
              <span className="material-symbols-outlined">help</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Organizations Section */}
            {activeSection === 'organizations' && (
              <>
                {/* Page Title */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div>
                    <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Organizasyonlar</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">Klinik ve kuruluşları yönetin, davet kodları oluşturun.</p>
                  </div>
                  <button 
                    onClick={() => setShowCreateOrgModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-blue-500 text-white rounded-lg text-sm font-semibold shadow-md shadow-blue-500/20 transition-all"
                  >
                    <span className="material-symbols-outlined text-lg">add</span>
                    Yeni Organizasyon
                  </button>
                </div>

                {/* Organizations Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {organizations.map((org) => (
                    <div key={org.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 hover:shadow-lg transition-all">
                      <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                          <span className="material-symbols-outlined text-purple-600 dark:text-purple-400 text-2xl">domain</span>
                        </div>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{org.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        <span className="font-medium">Tip:</span> {org.type}
                      </p>
                      {org.address && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                          <span className="font-medium">Adres:</span> {org.address}
                        </p>
                      )}
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => handleViewOrganization(org)}
                          className="flex-1 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                        >
                          Detaylar
                        </button>
                        <button
                          onClick={() => handleDeleteOrganization(org.id, org.name)}
                          className="px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                  {organizations.length === 0 && (
                    <div className="col-span-3 text-center py-12 text-gray-500 dark:text-gray-400">
                      <span className="material-symbols-outlined text-5xl mb-3 opacity-50">domain_disabled</span>
                      <p>Henüz organizasyon bulunmuyor</p>
                      <button
                        onClick={() => setShowCreateOrgModal(true)}
                        className="mt-4 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
                      >
                        İlk Organizasyonu Oluştur
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Dashboard Section */}
            {activeSection === 'dashboard' && (
              <>
            {/* Page Title */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Genel Bakış</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2">Platform istatistikleri, analiz durumları ve yönetim araçları.</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={handleDownloadReport}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                >
                  <span className="material-symbols-outlined text-lg">download</span>
                  Rapor İndir
                </button>
                <button 
                  onClick={() => setShowCreateOrgModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-blue-500 text-white rounded-lg text-sm font-semibold shadow-md shadow-blue-500/20 transition-all"
                >
                  <span className="material-symbols-outlined text-lg">add</span>
                  Yeni Organizasyon
                </button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 flex flex-col gap-1 transition-all hover:shadow-md">
                <div className="flex justify-between items-start mb-2">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg">
                    <span className="material-symbols-outlined text-primary">domain</span>
                  </div>
                  <span className="flex items-center text-xs font-bold text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">+5%</span>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Toplam Organizasyon</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{organizations.length}</h3>
              </div>

              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 flex flex-col gap-1 transition-all hover:shadow-md">
                <div className="flex justify-between items-start mb-2">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg">
                    <span className="material-symbols-outlined text-primary">stethoscope</span>
                  </div>
                  <span className="flex items-center text-xs font-bold text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">+12%</span>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Toplam Doktor</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{userStats?.by_role?.doctor || 0}</h3>
              </div>

              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 flex flex-col gap-1 transition-all hover:shadow-md">
                <div className="flex justify-between items-start mb-2">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg">
                    <span className="material-symbols-outlined text-primary">group</span>
                  </div>
                  <span className="flex items-center text-xs font-bold text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">+8%</span>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Toplam Hasta</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{userStats?.by_role?.patient || 0}</h3>
              </div>

              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 flex flex-col gap-1 transition-all hover:shadow-md">
                <div className="flex justify-between items-start mb-2">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg">
                    <span className="material-symbols-outlined text-primary">analytics</span>
                  </div>
                  <span className="flex items-center text-xs font-bold text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">+24%</span>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Toplam Analiz</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{analyses.length}</h3>
              </div>
            </div>

            {/* Charts and AI Status */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Analysis Trends Chart */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Analiz Trendleri</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Son 7 günde yapılan diş taramaları</p>
                  </div>
                </div>
                <div className="relative w-full h-[250px] flex items-end justify-between gap-2">
                  <div className="w-full h-full flex items-end justify-between gap-1 sm:gap-2 px-2">
                    {trendData.map((data, idx) => {
                      const heightPercent = maxTrendCount > 0 ? (data.count / maxTrendCount) * 100 : 0;
                      return (
                        <div 
                          key={idx}
                          className="w-full bg-primary/20 rounded-t-sm hover:bg-primary/40 transition-all relative group cursor-pointer" 
                          style={{height: `${Math.max(heightPercent, 5)}%`}}
                        >
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                            {data.count} Analiz
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-4 px-2">
                  {trendData.map((data, idx) => (
                    <span key={idx}>{data.date}</span>
                  ))}
                </div>
              </div>

              {/* Right Side Cards */}
              <div className="flex flex-col gap-6">
                {/* AI Model Status */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">AI Model Durumu</h3>
                    <div className="flex items-center gap-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                      Aktif
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-gray-500 dark:text-gray-400">Model: YOLO v8</span>
                        <span className="font-bold text-gray-900 dark:text-white">Hazır</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full" style={{width: '100%'}}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-gray-500 dark:text-gray-400">Toplam Analiz</span>
                        <span className="font-bold text-gray-900 dark:text-white">{analyses.length}</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{width: `${Math.min((analyses.length / 100) * 100, 100)}%`}}></div>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-gray-100 dark:border-slate-700 flex justify-between items-center">
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Model Dosyası</p>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">best_final.pt</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-gradient-to-br from-primary to-blue-600 p-6 rounded-xl shadow-lg text-white">
                  <h3 className="text-lg font-bold mb-4">Hızlı İşlemler</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <button 
                      onClick={() => setShowCreateOrgModal(true)}
                      className="flex flex-col items-center justify-center p-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-sm border border-white/10"
                    >
                      <span className="material-symbols-outlined mb-1">add_business</span>
                      <span className="text-xs font-medium text-center">Klinik Ekle</span>
                    </button>
                    <button 
                      onClick={() => navigate('/admin/users')}
                      className="flex flex-col items-center justify-center p-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-sm border border-white/10"
                    >
                      <span className="material-symbols-outlined mb-1">person_add</span>
                      <span className="text-xs font-medium text-center">Doktor Ekle</span>
                    </button>
                    <button 
                      onClick={() => navigate('/upload')}
                      className="flex flex-col items-center justify-center p-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-sm border border-white/10"
                    >
                      <span className="material-symbols-outlined mb-1">upload_file</span>
                      <span className="text-xs font-medium text-center">Tarama Yükle</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Analysis Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Son Analiz İşlemleri</h3>
                <button 
                  onClick={() => navigate('/history')}
                  className="text-sm text-primary font-medium hover:text-blue-600 transition-colors"
                >
                  Tümünü Gör
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-gray-400 font-medium border-b border-gray-200 dark:border-slate-700">
                    <tr>
                      <th className="px-6 py-3">Hasta Adı</th>
                      <th className="px-6 py-3">Doktor / Klinik</th>
                      <th className="px-6 py-3">Analiz Tipi</th>
                      <th className="px-6 py-3">Tarih</th>
                      <th className="px-6 py-3">Durum</th>
                      <th className="px-6 py-3 text-right">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    {recentAnalyses.length > 0 ? recentAnalyses.map((analysis, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                          {analysis.user_email || 'Hasta'}
                        </td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                          <div className="flex flex-col">
                            <span>{analysis.doctor_email || 'Doktor'}</span>
                            <span className="text-xs text-gray-400">Klinik Bilgisi</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">Panoramik Röntgen</td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                          {new Date(analysis.date || analysis.timestamp).toLocaleDateString('tr-TR')}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            analysis.status === 'analyzed' 
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                              : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                          }`}>
                            {analysis.status === 'analyzed' ? 'Tamamlandı' : 'İşleniyor'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => {
                              // Analysis sonuçlarını state ile ResultPage'e gönder
                              navigate('/result', {
                                state: {
                                  result: {
                                    findings: analysis.findings || [],
                                    patient: analysis.patient_name,
                                    date: analysis.created_at,
                                    id: analysis.id
                                  },
                                  imageUrl: analysis.image_url || null
                                }
                              });
                            }}
                            className="text-gray-400 hover:text-primary transition-colors"
                          >
                            <span className="material-symbols-outlined">visibility</span>
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="6" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                          Henüz analiz bulunmuyor
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Organizasyon Oluşturma Modal */}
      {showCreateOrgModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
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
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary"
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
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary"
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
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary"
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
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary"
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
                  className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-semibold transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors"
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
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-lg w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
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
              <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
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

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Davet Kodu</p>
                <div className="flex items-center justify-between gap-3">
                  <code className="text-2xl font-mono font-bold text-primary dark:text-blue-400">
                    {selectedOrg.invite_code}
                  </code>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyInviteCode(selectedOrg.invite_code)}
                      className="p-2 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 rounded-lg transition-colors"
                      title="Kopyala"
                    >
                      <span className="material-symbols-outlined text-primary dark:text-blue-400">content_copy</span>
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

              <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
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
  );
}
