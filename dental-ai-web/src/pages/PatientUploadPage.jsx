import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

export default function PatientUploadPage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [organizations, setOrganizations] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (!token || user.role !== 'patient') {
      navigate('/login');
      return;
    }
    
    fetchOrganizations();
  }, []);

  useEffect(() => {
    if (selectedOrg) {
      fetchDoctors(selectedOrg);
    } else {
      setDoctors([]);
      setSelectedDoctor('');
    }
  }, [selectedOrg]);

  const fetchOrganizations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/organizations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setOrganizations(data.organizations || []);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Fetch organizations error:', error);
      setLoading(false);
    }
  };

  const fetchDoctors = async (orgId) => {
    try {
      const token = localStorage.getItem('token');
      console.log('🔍 Fetching doctors for org:', orgId);
      const response = await fetch(`http://localhost:5000/api/organizations/${orgId}/members`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📥 Received members:', data.members);
        // Sadece doktorları filtrele
        const doctorMembers = (data.members || []).filter(m => m.role === 'doctor');
        console.log('👨‍⚕️ Filtered doctors:', doctorMembers);
        setDoctors(doctorMembers);
      } else {
        console.error('❌ Failed to fetch members:', response.status, await response.text());
      }
    } catch (error) {
      console.error('Fetch doctors error:', error);
    }
  };

  const handleFileChange = (file) => {
    if (file && (file.type === 'image/jpeg' || file.type === 'image/png')) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      alert('Lütfen JPG veya PNG formatında bir dosya seçin.');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileChange(file);
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileChange(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendToDoctor = async () => {
    if (!selectedFile || !selectedOrg || !selectedDoctor) {
      alert('Lütfen tüm alanları doldurun');
      return;
    }
    
    setIsSending(true);
    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);
    
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('organization_id', selectedOrg);
    formData.append('doctor_email', selectedDoctor);
    formData.append('patient_note', note);
    formData.append('status', 'pending');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/patient/send-xray', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (response.ok) {
        const result = await response.json();
        setTimeout(() => {
          alert('Röntgen görseliniz doktora başarıyla gönderildi!');
          navigate('/history');
        }, 500);
      } else {
        const error = await response.json();
        alert(error.error || 'Gönderim sırasında bir hata oluştu.');
        setIsSending(false);
        setProgress(0);
      }
    } catch (error) {
      clearInterval(progressInterval);
      console.error('Send error:', error);
      alert('Bir hata oluştu. Lütfen tekrar deneyin.');
      setIsSending(false);
      setProgress(0);
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
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-black dark:text-white text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em] mb-2">
              Röntgen Gönder
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-base">
              Diş röntgeninizi doktorunuza gönderin
            </p>
          </div>

          {/* Organizasyon ve Doktor Seçimi */}
          <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Klinik/Hastane Seçin *
                </label>
                <select
                  value={selectedOrg}
                  onChange={(e) => setSelectedOrg(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                  required
                >
                  <option value="">Seçiniz...</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Doktor Seçin *
                </label>
                <select
                  value={selectedDoctor}
                  onChange={(e) => setSelectedDoctor(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                  disabled={!selectedOrg || doctors.length === 0}
                  required
                >
                  <option value="">Seçiniz...</option>
                  {doctors.map((doctor) => (
                    <option key={doctor.email} value={doctor.email}>
                      Dr. {doctor.name}
                    </option>
                  ))}
                </select>
                {selectedOrg && doctors.length === 0 && (
                  <p className="text-sm text-orange-500 mt-1">Bu organizasyonda doktor bulunmuyor</p>
                )}
              </div>
            </div>
          </div>

          {/* Dosya Yükleme */}
          <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-6 mb-6">
            {!previewUrl ? (
              <div
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
                  isDragging
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <span className="material-symbols-outlined text-6xl text-gray-400 dark:text-gray-600 mb-4">
                  upload_file
                </span>
                <p className="text-lg font-semibold text-black dark:text-white mb-2">
                  Röntgen Görselinizi Yükleyin
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Sürükle bırak veya dosya seç
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold transition-colors"
                >
                  Dosya Seç
                </button>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-4">
                  JPG veya PNG formatında
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-auto max-h-96 object-contain"
                  />
                </div>
                <button
                  onClick={handleRemoveFile}
                  disabled={isSending}
                  className="w-full py-2 px-4 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white rounded-lg font-semibold transition-colors"
                >
                  Görseli Kaldır
                </button>
              </div>
            )}
          </div>

          {/* Not Alanı */}
          <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-6 mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Not (Opsiyonel)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows="3"
              placeholder="Doktorunuza iletmek istediğiniz bir not varsa buraya yazabilirsiniz..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
            />
          </div>

          {/* Gönder Butonu */}
          <button
            onClick={handleSendToDoctor}
            disabled={!selectedFile || !selectedOrg || !selectedDoctor || isSending}
            className="w-full py-4 px-6 bg-primary hover:bg-primary/90 disabled:bg-gray-400 text-white rounded-xl font-bold text-lg transition-colors shadow-lg"
          >
            {isSending ? (
              <div className="flex items-center justify-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                <span>Gönderiliyor... {progress}%</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <span className="material-symbols-outlined">send</span>
                <span>Doktora Gönder</span>
              </div>
            )}
          </button>
        </div>
      </div>
    </Layout>
  );
}
