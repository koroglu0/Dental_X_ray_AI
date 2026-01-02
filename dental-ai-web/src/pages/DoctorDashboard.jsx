import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { config } from '../config';

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const [allAnalyses, setAllAnalyses] = useState([]);
  const [recentAnalyses, setRecentAnalyses] = useState([]);
  const [stats, setStats] = useState({
    totalPatients: 0,
    todayAnalyses: 0,
    pendingReviews: 0,
  });
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [organization, setOrganization] = useState(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'pending'
  const [pendingAnalyses, setPendingAnalyses] = useState([]);

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
  // Search filtreleme
  useEffect(() => {
    if (!searchQuery.trim()) {
      setRecentAnalyses(allAnalyses.slice(0, 4));
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = allAnalyses.filter(analysis => {
      const patientName = (analysis.patient_name || '').toLowerCase();
      const fileName = (analysis.filename || '').toLowerCase();
      const patientId = (analysis.id || '').toLowerCase();
      
      return patientName.includes(query) || 
             fileName.includes(query) || 
             patientId.includes(query);
    });

    setRecentAnalyses(filtered.slice(0, 10)); // Arama sonuçlarında daha fazla göster
  }, [searchQuery, allAnalyses]);
  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      // Organizasyon bilgilerini getir
      if (user.organization_id) {
        const orgRes = await fetch(`${config.apiBaseUrl}/api/organizations/${user.organization_id}`, { headers });
        if (orgRes.ok) {
          const orgData = await orgRes.json();
          setOrganization(orgData.organization);
        }
      }

      // Son analizleri getir (doktorun kendi yaptığı)
      const historyRes = await fetch(`${config.apiBaseUrl}/api/history`, { headers });
      
      // Bekleyen röntgenleri getir (hastalara gönderilmiş)
      const pendingRes = await fetch(`${config.apiBaseUrl}/api/doctor/pending-xrays`, { headers });
      
      let historyList = [];
      let pendingList = [];
      
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        historyList = historyData.history || [];
      }
      
      if (pendingRes.ok) {
        const pendingData = await pendingRes.json();
        pendingList = pendingData.pending_xrays || [];
        setPendingAnalyses(pendingList);
      }
      
      // Tüm analizleri birleştir (pending + analyzed)
      const allAnalysesList = [...pendingList, ...historyList];
      setAllAnalyses(allAnalysesList);
      setRecentAnalyses(historyList.slice(0, 4)); // Recent'ta sadece tamamlanmış analizler
      
      console.log('📊 Pending list:', pendingList);
      console.log('📊 History list:', historyList);
      console.log('📊 All analyses:', allAnalysesList);
      
      // Bugünkü analizleri say
      const today = new Date().toISOString().split('T')[0];
      const todayCount = allAnalysesList.filter(a => 
        a.date && a.date.startsWith(today)
      ).length;

      // Hasta sayısını hesapla - SADECE BENZERSİZ EMAIL'LER
      const patientEmails = new Set();
      allAnalysesList.forEach(analysis => {
        if (analysis.user_email) {
          patientEmails.add(analysis.user_email);
        }
      });
      
      console.log('👥 Unique patient emails:', Array.from(patientEmails));
      console.log('📈 Total unique patients:', patientEmails.size);

      // Bekleyen inceleme sayısı
      const pendingCount = pendingList.length;
        
      setStats({
        totalPatients: patientEmails.size,
        todayAnalyses: todayCount,
        pendingReviews: pendingCount
      });

      setLoading(false);
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleJoinOrganization = async () => {
    if (!joinCode.trim()) {
      alert('Lütfen davet kodunu girin');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.apiBaseUrl}/api/organizations/join`, {
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
      const response = await fetch(`${config.apiBaseUrl}/api/organizations/${user.organization_id}/leave`, {
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

  const handleAnalyzePending = (analysis) => {
    // Pending röntgeni localStorage'a kaydet ve upload sayfasına yönlendir
    localStorage.setItem('pendingXray', JSON.stringify({
      id: analysis.id,
      filename: analysis.filename,
      patient_note: analysis.patient_note,
      patient_email: analysis.user_email,
      image_url: analysis.image_url
    }));
    navigate('/');
  };

  const getScanTypeIcon = (type) => {
    return 'panorama_photosphere';
  };

  const getStatusBadge = (status) => {
    if (status === 'analyzed') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
          Ready
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
          <span className="size-1.5 rounded-full bg-yellow-500 mr-1.5 animate-pulse"></span>
          Processing
        </span>
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background-light dark:bg-background-dark">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-background-light dark:bg-background-dark font-display">
      {/* Sidebar */}
      <aside className={`w-64 flex-shrink-0 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-surface-light dark:bg-surface-dark transition-all duration-300 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 fixed lg:relative z-30 h-full`}>
        <div className="flex h-full flex-col justify-between p-4">
          <div className="flex flex-col gap-6">
            {/* Logo */}
            <div className="flex items-center gap-3 px-2">
              <div className="flex items-center justify-center size-10 rounded-xl bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-[28px]">dentistry</span>
              </div>
              <div className="flex flex-col">
                <h1 className="text-slate-900 dark:text-white text-base font-bold leading-none">Doktor Paneli</h1>
                <p className="text-primary text-xs font-medium mt-1">Dental AI</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex flex-col gap-2">
              <a className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary/10 text-primary cursor-pointer">
                <span className="material-symbols-outlined">dashboard</span>
                <p className="text-sm font-bold leading-normal">Gösterge Paneli</p>
              </a>
              <a onClick={() => navigate('/patient-management')} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group cursor-pointer">
                <span className="material-symbols-outlined group-hover:text-slate-900 dark:group-hover:text-white">group</span>
                <p className="text-sm font-medium leading-normal group-hover:text-slate-900 dark:group-hover:text-white">Hastalar</p>
              </a>
              <a onClick={() => navigate('/history')} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group cursor-pointer">
                <span className="material-symbols-outlined group-hover:text-slate-900 dark:group-hover:text-white">analytics</span>
                <p className="text-sm font-medium leading-normal group-hover:text-slate-900 dark:group-hover:text-white">Analizler</p>
              </a>
            </nav>
          </div>

          {/* Bottom Section */}
          <div className="flex flex-col gap-3">
            {/* User Profile */}
            <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
              <div className="bg-primary/20 rounded-full size-10 flex-shrink-0 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">person</span>
              </div>
              <div className="flex flex-col min-w-0">
                <p className="text-slate-900 dark:text-white text-sm font-bold truncate">{user.name || 'Dr. User'}</p>
                <p className="text-slate-500 text-xs truncate">{user.specialization || 'Dentist'}</p>
              </div>
            </div>

            {/* Logout Button */}
            <button 
              onClick={handleLogout} 
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors w-full"
            >
              <span className="material-symbols-outlined">logout</span>
              <p className="text-sm font-medium leading-normal">Çıkış Yap</p>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Main Content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-surface-light dark:bg-surface-dark px-6 py-3 flex-shrink-0 z-10">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden text-slate-500 hover:text-primary mr-4"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>

          {/* Search */}
          <div className="flex flex-1 max-w-md">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <span className="material-symbols-outlined text-[20px]">search</span>
              </div>
              <input 
                className="block w-full pl-10 pr-3 py-2 border-none rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50 sm:text-sm transition-shadow"
                placeholder="Hastaları, analizleri veya dosyaları ara..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 ml-4">
            <button className="relative flex items-center justify-center size-10 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-2.5 right-2.5 size-2 bg-red-500 rounded-full border border-white dark:border-surface-dark"></span>
            </button>
            <button 
              onClick={() => navigate('/')}
              className="hidden sm:flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md shadow-primary/20 transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              Yeni Analiz
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto flex flex-col gap-8">
            {/* Welcome Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Hoş geldiniz, {user.name?.split(' ')[0] || 'Doktor'}
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                  Bugün için kliniğinizin özeti, {new Date().toLocaleDateString('tr-TR', { month: 'long', day: 'numeric' })}.
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
                <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                <span>Bugün</span>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Patients */}
              <div className="bg-surface-light dark:bg-surface-dark p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group">
                <div className="flex justify-between items-start z-10">
                  <div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Toplam Hasta</p>
                    <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{stats.totalPatients}</h3>
                  </div>
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                    <span className="material-symbols-outlined">groups</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-sm text-green-600 font-medium z-10 mt-auto">
                  <span className="material-symbols-outlined text-[16px]">trending_up</span>
                  <span>Aktif hastalar</span>
                </div>
                <div className="absolute -right-4 -bottom-4 size-24 bg-gradient-to-br from-blue-50 to-transparent dark:from-blue-900/10 rounded-full group-hover:scale-110 transition-transform"></div>
              </div>

              {/* Today's Analyses */}
              <div className="bg-surface-light dark:bg-surface-dark p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between h-32">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Bugünkü Analizler</p>
                    <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{stats.todayAnalyses}</h3>
                  </div>
                  <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600 dark:text-purple-400">
                    <span className="material-symbols-outlined">analytics</span>
                  </div>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full mt-auto overflow-hidden">
                  <div className="bg-purple-500 h-full rounded-full" style={{width: `${Math.min((stats.todayAnalyses / 20) * 100, 100)}%`}}></div>
                </div>
                <p className="text-xs text-slate-400 mt-2">Günlük hedefin %{Math.min((stats.todayAnalyses / 20) * 100, 100).toFixed(0)}'i</p>
              </div>

              {/* Pending Reviews */}
              <div className="bg-surface-light dark:bg-surface-dark p-5 rounded-xl border border-primary/20 shadow-sm flex flex-col justify-between h-32 relative">
                <div className="absolute inset-0 bg-primary/5 pointer-events-none"></div>
                <div className="flex justify-between items-start z-10">
                  <div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Bekleyen İncelemeler</p>
                    <h3 className="text-3xl font-bold text-primary mt-1">{stats.pendingReviews}</h3>
                  </div>
                  <div className="p-2 bg-primary/10 rounded-lg text-primary animate-pulse">
                    <span className="material-symbols-outlined">pending_actions</span>
                  </div>
                </div>
                <p className="text-sm text-slate-500 z-10 mt-auto">Dikkatinizi gerektiriyor</p>
              </div>

              {/* Organization Card */}
              {organization ? (
                <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-xl p-5 flex flex-col justify-between h-32 relative group">
                  <div className="flex justify-between items-start z-10">
                    <div>
                      <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Organizasyon</p>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1 truncate">{organization.name}</h3>
                    </div>
                    <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600 dark:text-purple-400">
                      <span className="material-symbols-outlined">business</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 z-10 mt-auto">
                    <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{organization.type}</span>
                    <button
                      onClick={handleLeaveOrganization}
                      className="text-xs text-red-600 dark:text-red-400 hover:underline font-medium"
                      title="Organizasyondan Ayrıl"
                    >
                      Ayrıl
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-xl p-5 flex flex-col justify-between h-32 relative">
                  <div className="flex justify-between items-start z-10">
                    <div>
                      <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Organizasyon</p>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">-</h3>
                    </div>
                    <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600 dark:text-purple-400">
                      <span className="material-symbols-outlined">business</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowJoinModal(true)}
                    className="w-full px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors text-xs z-10 mt-auto"
                  >
                    Organizasyona Katıl
                  </button>
                </div>
              )}
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Recent Analyses - 2 columns */}
              <div className="lg:col-span-2 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Analizler</h3>
                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                      <button
                        onClick={() => setActiveTab('all')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                          activeTab === 'all' 
                            ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' 
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        Tümü ({allAnalyses.length})
                      </button>
                      <button
                        onClick={() => setActiveTab('pending')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors relative ${
                          activeTab === 'pending' 
                            ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' 
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        Bekleyenler
                        {pendingAnalyses.length > 0 && (
                          <span className="ml-1.5 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                            {pendingAnalyses.length}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                  <a 
                    onClick={() => navigate('/history')}
                    className="text-sm font-bold text-primary hover:text-primary/80 flex items-center gap-1 cursor-pointer"
                  >
                    Tümünü Gör <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </a>
                </div>

                <div className="bg-surface-light dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Hasta</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tarama Tipi</th>
                          {activeTab === 'pending' && (
                            <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Not</th>
                          )}
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tarih</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Durum</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">İşlem</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                        {(activeTab === 'pending' ? pendingAnalyses : recentAnalyses).length > 0 ? (activeTab === 'pending' ? pendingAnalyses : recentAnalyses).map((analysis, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="size-10 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-400">
                                  <span className="material-symbols-outlined">person</span>
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900 dark:text-white">{analysis.patient_name || 'Hasta'}</p>
                                  <p className="text-xs text-slate-500">{analysis.user_email || 'ID: #' + analysis.id?.substring(0, 8)}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 text-slate-600 dark:text-slate-300">
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px] text-slate-400">{getScanTypeIcon(analysis.type)}</span>
                                {analysis.filename || 'Röntgen'}
                              </div>
                            </td>
                            {activeTab === 'pending' && (
                              <td className="p-4 text-slate-600 dark:text-slate-300 max-w-xs">
                                <p className="text-sm truncate" title={analysis.patient_note}>
                                  {analysis.patient_note || '-'}
                                </p>
                              </td>
                            )}
                            <td className="p-4 text-slate-600 dark:text-slate-300">
                              {analysis.date ? new Date(analysis.date).toLocaleDateString('tr-TR', { 
                                day: 'numeric', 
                                month: 'short', 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              }) : '-'}
                            </td>
                            <td className="p-4">
                              {getStatusBadge(analysis.status)}
                            </td>
                            <td className="p-4 text-right">
                              {analysis.status === 'pending' ? (
                                <button 
                                  onClick={() => handleAnalyzePending(analysis)}
                                  className="text-primary hover:text-primary/80 transition-colors flex items-center gap-1 ml-auto"
                                  title="Analiz Et"
                                >
                                  <span className="material-symbols-outlined">analytics</span>
                                  <span className="text-sm font-medium">Analiz Et</span>
                                </button>
                              ) : (
                                <button 
                                  onClick={() => {
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
                                  className="text-slate-400 hover:text-primary transition-colors"
                                  disabled={analysis.status !== 'analyzed'}
                                >
                                  <span className="material-symbols-outlined">
                                    {analysis.status === 'analyzed' ? 'visibility' : 'visibility_off'}
                                  </span>
                                </button>
                              )}
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={activeTab === 'pending' ? '6' : '5'} className="p-8 text-center text-slate-500">
                              {activeTab === 'pending' 
                                ? 'Bekleyen röntgen bulunamadı' 
                                : 'Son analiz bulunamadı'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {recentAnalyses.length > 0 && (
                    <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-center">
                      <button 
                        onClick={() => navigate('/history')}
                        className="text-sm font-medium text-slate-500 hover:text-primary transition-colors"
                      >
                        Daha fazla kayıt yükle
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions - 1 column */}
              <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-4">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Hızlı İşlemler</h3>
                  <div className="grid grid-cols-1 gap-3">
                    <button 
                      onClick={() => navigate('/')}
                      className="group flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-surface-light dark:bg-surface-dark hover:border-primary hover:shadow-md hover:shadow-primary/5 transition-all text-left"
                    >
                      <div className="size-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined">upload_file</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white">Röntgen Yükle</h4>
                        <p className="text-xs text-slate-500">Sürükle bırak veya dosya seç</p>
                      </div>
                      <span className="material-symbols-outlined ml-auto text-slate-300 group-hover:text-primary transition-colors">chevron_right</span>
                    </button>

                    <button 
                      onClick={() => navigate('/')}
                      className="group flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-surface-light dark:bg-surface-dark hover:border-primary hover:shadow-md hover:shadow-primary/5 transition-all text-left"
                    >
                      <div className="size-12 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined">play_circle</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white">Analizi Başlat</h4>
                        <p className="text-xs text-slate-500">Seçili dosyalar üzerinde AI çalıştır</p>
                      </div>
                      <span className="material-symbols-outlined ml-auto text-slate-300 group-hover:text-orange-500 transition-colors">chevron_right</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <footer className="mt-12 py-6 border-t border-slate-200 dark:border-slate-800 text-center">
              <p className="text-xs text-slate-400">© 2026 Dental AI. All rights reserved.</p>
            </footer>
          </div>
        </main>
      </div>

      {/* Organizasyona Katılma Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
              Organizasyona Katıl
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
              Organizasyonunuzdan aldığınız 8 haneli davet kodunu girin
            </p>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ABC12345"
              maxLength="8"
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg mb-4 dark:bg-slate-800 dark:text-white text-center text-xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setJoinCode('');
                }}
                className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg font-semibold transition-colors"
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
    </div>
  );
}
