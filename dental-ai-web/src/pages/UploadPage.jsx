import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

export default function UploadPage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

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

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch('http://localhost:5000/api/analyze', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        navigate('/result', { state: { result, imageUrl: previewUrl } });
      } else {
        alert('Analiz sırasında bir hata oluştu.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Sunucuya bağlanılamadı.');
    }
  };

  return (
    <Layout>
      <div className="flex flex-wrap justify-between gap-3 p-4 text-center">
        <div className="flex w-full flex-col items-center gap-3">
          <p className="text-black dark:text-white text-4xl sm:text-5xl font-black leading-tight tracking-[-0.033em]">
            Yapay Zeka Destekli Diş Röntgeni Analizi
          </p>
          <p className="text-gray-600 dark:text-[#9db0b9] text-base font-normal leading-normal max-w-2xl">
            Röntgen dosyanızı yükleyerek saniyeler içinde detaylı bir ön analiz raporu alın.
          </p>
        </div>
      </div>

      <div className="mt-10">
        {!selectedFile ? (
          <div className="flex flex-col p-4">
            <div
              className={`flex flex-col items-center gap-6 rounded-xl border-2 border-dashed px-6 py-14 bg-background-light dark:bg-background-dark transition-colors ${
                isDragging
                  ? 'border-primary dark:border-primary'
                  : 'border-gray-300 dark:border-[#3b4b54] hover:border-primary/50 dark:hover:border-primary/50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <span className="material-symbols-outlined text-5xl text-gray-400 dark:text-gray-500">
                upload_file
              </span>
              <div className="flex max-w-[480px] flex-col items-center gap-2">
                <p className="text-black dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] max-w-[480px] text-center">
                  Analiz için röntgen dosyanızı buraya sürükleyin
                </p>
                <p className="text-gray-600 dark:text-gray-400 text-sm font-normal leading-normal">
                  veya
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleFileInputChange}
                className="hidden"
                id="file-input"
                aria-label="Röntgen dosyası seçin"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-gray-200 dark:bg-[#283339] text-black dark:text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-gray-300 dark:hover:bg-[#3b4b54] transition-colors"
              >
                <span className="truncate">Dosya Seçmek İçin Tıklayın</span>
              </button>
              <p className="text-gray-500 dark:text-gray-500 text-xs font-normal leading-normal max-w-[480px] text-center pt-4">
                Desteklenen formatlar: JPG, PNG.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col p-4 mt-8">
            <p className="text-black dark:text-white text-2xl font-bold leading-tight tracking-[-0.015em] mb-4 text-center">
              Yüklenen Röntgen
            </p>
            <div className="flex flex-col items-center gap-6 rounded-xl border border-solid border-gray-200 dark:border-[#3b4b54] p-6 bg-white dark:bg-[#152129] shadow-md">
              <div className="w-full flex justify-center items-center">
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt="dental x-ray preview"
                    className="max-h-64 w-auto rounded-lg object-contain"
                  />
                )}
              </div>
              <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 p-3 rounded-lg bg-background-light dark:bg-background-dark">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">description</span>
                  <div className="flex flex-col text-left">
                    <p className="text-black dark:text-white text-sm font-medium leading-normal">
                      {selectedFile.name}
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 text-xs">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleRemoveFile}
                  className="flex items-center justify-center size-9 cursor-pointer rounded-full text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  <span className="material-symbols-outlined">delete</span>
                </button>
              </div>
              <button
                onClick={handleAnalyze}
                className="w-full flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-6 bg-primary text-white text-base font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 transition-colors"
              >
                <span className="truncate">Analizi Başlat</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
