import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

export default function UserManagement() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [filterRole, setFilterRole] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState(null);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (!token || user.role !== 'admin') {
      navigate('/');
      return;
    }
    
    fetchUsers();
    fetchStats();
  }, []);

  useEffect(() => {
    // Filtrele
    let filtered = users;
    
    if (filterRole !== 'all') {
      filtered = filtered.filter(u => u.role === filterRole);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(u => 
        u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    setFilteredUsers(filtered);
  }, [users, filterRole, searchQuery]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Fetch users error:', error);
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/users/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Fetch stats error:', error);
    }
  };

  const handleEditUser = (user) => {
    setSelectedUser({ ...user });
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/users/${selectedUser.email}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: selectedUser.name,
          role: selectedUser.role,
          phone: selectedUser.phone,
          specialization: selectedUser.specialization
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert('Kullanıcı güncellendi');
        setShowEditModal(false);
        fetchUsers();
        fetchStats();
      } else {
        alert(data.error || 'Güncelleme başarısız');
      }
    } catch (error) {
      console.error('Update user error:', error);
      alert('Bir hata oluştu');
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'Pasif' : 'Aktif';
    
    if (!confirm(`Kullanıcıyı ${newStatus} yapmak istediğinizden emin misiniz?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/users/${userId}/toggle-status`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message);
        fetchUsers();
        fetchStats();
      } else {
        alert(data.error || 'Durum değiştirilemedi');
      }
    } catch (error) {
      console.error('Toggle status error:', error);
      alert('Bir hata oluştu');
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!confirm(`"${userName}" kullanıcısını silmek istediğinizden emin misiniz?\n\nBu işlem geri alınamaz.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (response.ok) {
        alert('Kullanıcı silindi');
        fetchUsers();
        fetchStats();
      } else {
        alert(data.error || 'Silme başarısız');
      }
    } catch (error) {
      console.error('Delete user error:', error);
      alert('Bir hata oluştu');
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'doctor': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'patient': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getRoleText = (role) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'doctor': return 'Doktor';
      case 'patient': return 'Hasta';
      default: return role;
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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-black dark:text-white text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em] mb-2">
              Kullanıcı Yönetimi
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-base">
              Tüm kullanıcıları görüntüle ve yönet
            </p>
          </div>
          <button
            onClick={() => navigate('/admin')}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-black dark:text-white rounded-lg transition-colors"
          >
            ← Geri
          </button>
        </div>

        {/* İstatistikler */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-xl p-6">
              <h3 className="text-sm text-blue-700 dark:text-blue-400 font-bold mb-2">Toplam Kullanıcı</h3>
              <p className="text-4xl font-black text-black dark:text-white">{stats.total}</p>
            </div>
            <div className="bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/20 rounded-xl p-6">
              <h3 className="text-sm text-red-700 dark:text-red-400 font-bold mb-2">Admin</h3>
              <p className="text-4xl font-black text-black dark:text-white">{stats.by_role.admin}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-xl p-6">
              <h3 className="text-sm text-purple-700 dark:text-purple-400 font-bold mb-2">Doktor</h3>
              <p className="text-4xl font-black text-black dark:text-white">{stats.by_role.doctor}</p>
            </div>
            <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 rounded-xl p-6">
              <h3 className="text-sm text-green-700 dark:text-green-400 font-bold mb-2">Hasta</h3>
              <p className="text-4xl font-black text-black dark:text-white">{stats.by_role.patient}</p>
            </div>
          </div>
        )}

        {/* Filtreler */}
        <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Ara
              </label>
              <input
                type="text"
                placeholder="İsim veya e-posta..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rol
              </label>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
              >
                <option value="all">Tümü</option>
                <option value="admin">Admin</option>
                <option value="doctor">Doktor</option>
                <option value="patient">Hasta</option>
              </select>
            </div>
          </div>
        </div>

        {/* Kullanıcı Listesi */}
        <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Kullanıcı
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Kayıt Tarihi
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredUsers.map((u) => (
                  <tr key={u.email} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-primary">person</span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {u.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(u.role)}`}>
                        {getRoleText(u.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        u.status === 'active' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                      }`}>
                        {u.status === 'active' ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('tr-TR') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEditUser(u)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          title="Düzenle"
                        >
                          <span className="material-symbols-outlined text-sm">edit</span>
                        </button>
                        <button
                          onClick={() => handleToggleStatus(u.email, u.status)}
                          className={`${
                            u.status === 'active' 
                              ? 'text-orange-600 hover:text-orange-900 dark:text-orange-400' 
                              : 'text-green-600 hover:text-green-900 dark:text-green-400'
                          }`}
                          title={u.status === 'active' ? 'Pasif Yap' : 'Aktif Yap'}
                        >
                          <span className="material-symbols-outlined text-sm">
                            {u.status === 'active' ? 'block' : 'check_circle'}
                          </span>
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.email, u.name)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          title="Sil"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <span className="material-symbols-outlined text-gray-400 text-6xl mb-4">person_off</span>
              <p className="text-gray-500 dark:text-gray-400">Kullanıcı bulunamadı</p>
            </div>
          )}
        </div>

        {/* Düzenleme Modal */}
        {showEditModal && selectedUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-black dark:text-white mb-4">
                Kullanıcı Düzenle
              </h3>
              <form onSubmit={handleUpdateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Ad Soyad
                  </label>
                  <input
                    type="text"
                    required
                    value={selectedUser.name}
                    onChange={(e) => setSelectedUser({ ...selectedUser, name: e.target.value })}
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
                    value={selectedUser.email}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white opacity-50 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Rol
                  </label>
                  <select
                    value={selectedUser.role}
                    onChange={(e) => setSelectedUser({ ...selectedUser, role: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                  >
                    <option value="patient">Hasta</option>
                    <option value="doctor">Doktor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                {selectedUser.role === 'doctor' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Uzmanlık
                    </label>
                    <input
                      type="text"
                      value={selectedUser.specialization || ''}
                      onChange={(e) => setSelectedUser({ ...selectedUser, specialization: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    value={selectedUser.phone || ''}
                    onChange={(e) => setSelectedUser({ ...selectedUser, phone: e.target.value })}
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
