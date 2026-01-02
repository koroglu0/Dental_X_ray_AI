import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { config } from '../config';

export default function HistoryPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      // Token'ı al
      const token = localStorage.getItem('token');
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${config.apiBaseUrl}/api/history`, {
        headers: headers
      });
      if (response.ok) {
        const data = await response.json();
        setAnalyses(data.history || []);
      }
    } catch (error) {
      console.error('Geçmiş yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAnalyses = analyses.filter(analysis =>
    analysis.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    analysis.filename?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAnalysisClick = async (analysis) => {
    try {
      const imageUrl = `${config.apiBaseUrl}/api/uploads/${analysis.filename}`;
      navigate('/result', { 
        state: { 
          result: {
            findings: analysis.findings,
            total_findings: analysis.total_findings,
            timestamp: analysis.timestamp,
            image_dimensions: analysis.image_dimensions
          }, 
          imageUrl: imageUrl 
        } 
      });
    } catch (error) {
      console.error('Analiz detayı yüklenirken hata:', error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSummary = (findings) => {
    if (!findings || findings.length === 0) return 'Bulgu yok';
    const summary = findings.slice(0, 2).map(f => f.name).join(', ');
    if (findings.length > 2) {
      return `${summary} +${findings.length - 2} daha`;
    }
    return summary;
  };

  return (
    <Layout>
      <div className="flex flex-wrap justify-between gap-3 p-4 mt-6">
        <div className="flex min-w-72 flex-col gap-3">
          <p className="text-black dark:text-white text-4xl font-black leading-tight tracking-[-0.033em]">
            Analiz Geçmişim
          </p>
          <p className="text-gray-600 dark:text-[#9db0b9] text-base font-normal leading-normal">
            Daha önce yüklediğiniz röntgenleri ve analiz sonuçlarını görüntüleyin.
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 px-4 py-3">
        <div className="flex-grow">
          <label className="flex flex-col min-w-40 h-12 w-full">
            <div className="flex w-full flex-1 items-stretch rounded-lg h-full">
              <div className="text-gray-500 dark:text-[#9db0b9] flex border border-gray-300 dark:border-[#283339] bg-white dark:bg-[#283339] items-center justify-center pl-4 rounded-l-lg border-r-0">
                <span className="material-symbols-outlined">search</span>
              </div>
              <input
                className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-r-lg text-black dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary border border-gray-300 dark:border-[#283339] bg-white dark:bg-[#283339] focus:border-primary h-full placeholder:text-gray-500 dark:placeholder:text-[#9db0b9] px-4 pl-2 text-base font-normal leading-normal"
                placeholder="Dosya adına göre ara"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </label>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : filteredAnalyses.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <span className="material-symbols-outlined text-6xl text-gray-400 dark:text-gray-600 mb-4">
            folder_open
          </span>
          <p className="text-gray-600 dark:text-gray-400 text-lg font-medium mb-2">
            {searchQuery ? 'Sonuç bulunamadı' : 'Henüz analiz geçmişiniz yok'}
          </p>
          <p className="text-gray-500 dark:text-gray-500 text-sm mb-6">
            {searchQuery ? 'Farklı bir arama terimi deneyin' : 'İlk analizinizi yapmak için röntgen yükleyin'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              <span className="material-symbols-outlined">add</span>
              Yeni Analiz
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
          {filteredAnalyses.map((analysis) => (
            <div
              key={analysis.id}
              onClick={() => handleAnalysisClick(analysis)}
              className="flex flex-col gap-3 rounded-xl bg-white dark:bg-[#1a242a] p-4 border border-gray-200 dark:border-[#283339] transition-all duration-300 hover:shadow-lg hover:dark:shadow-primary/20 hover:-translate-y-1 cursor-pointer"
            >
              <div
                className="w-full bg-center bg-no-repeat aspect-video bg-cover rounded-lg bg-gray-200 dark:bg-gray-800"
                style={{ 
                  backgroundImage: analysis.filename 
                    ? `url(${config.apiBaseUrl}/api/uploads/${analysis.filename})` 
                    : 'none' 
                }}
              >
                {!analysis.filename && (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-4xl text-gray-400">
                      image
                    </span>
                  </div>
                )}
              </div>
              <div>
                <p className="text-black dark:text-white text-base font-medium leading-normal">
                  {analysis.id}
                </p>
                <p className="text-gray-500 dark:text-[#9db0b9] text-sm font-normal leading-normal">
                  {formatDate(analysis.date)}
                </p>
              </div>
              <p className="text-gray-700 dark:text-gray-300 text-sm font-normal leading-normal">
                {getSummary(analysis.findings)}
              </p>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-green-500/20 px-2 py-1 text-xs font-medium text-green-600 dark:text-green-400">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  Tamamlandı
                </span>
                <span className="text-gray-500 dark:text-gray-400 text-xs">
                  {analysis.total_findings} bulgu
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
