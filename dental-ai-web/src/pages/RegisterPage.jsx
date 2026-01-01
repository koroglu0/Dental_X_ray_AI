import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState('register'); // 'register' veya 'verify'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'patient',
    phone: '',
    specialization: '',
    inviteCode: '', // Organizasyon davet kodu
    verificationCode: '', // Email doğrulama kodu için
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    // Şifre kontrolü
    if (formData.password !== formData.confirmPassword) {
      setError('Şifreler eşleşmiyor');
      return;
    }

    if (formData.password.length < 8) {
      setError('Şifre en az 8 karakter olmalıdır');
      return;
    }

    // Cognito şifre gereksinimlerini kontrol et
    const hasUpperCase = /[A-Z]/.test(formData.password);
    const hasLowerCase = /[a-z]/.test(formData.password);
    const hasNumber = /[0-9]/.test(formData.password);

    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      setError('Şifre en az bir büyük harf, bir küçük harf ve bir rakam içermelidir');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          phone: formData.phone,
          specialization: formData.role === 'doctor' ? formData.specialization : null,
          invite_code: formData.role === 'doctor' && formData.inviteCode ? formData.inviteCode : null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Eğer email doğrulama gerekiyorsa
        if (data.requires_verification) {
          setStep('verify');
          setError('');
        } else {
          // Token'ı localStorage'a kaydet
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          
          // Ana sayfaya yönlendir
          navigate('/');
        }
      } else {
        setError(data.error || 'Kayıt oluşturulamadı');
      }
    } catch (error) {
      console.error('Register error:', error);
      setError('Sunucuya bağlanılamadı');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/confirm-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          code: formData.verificationCode,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Doğrulama başarılı, login sayfasına yönlendir
        alert('Email başarıyla doğrulandı! Şimdi giriş yapabilirsiniz.');
        navigate('/login');
      } else {
        setError(data.error || 'Doğrulama başarısız');
      }
    } catch (error) {
      console.error('Verification error:', error);
      setError('Sunucuya bağlanılamadı');
    } finally {
      setLoading(false);
    }
  };

  // Email doğrulama ekranı
  if (step === 'verify') {
    return (
      <Layout>
        <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <h2 className="text-black dark:text-white text-3xl font-black leading-tight tracking-[-0.033em] mb-2">
                Email Doğrulama
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-base font-normal leading-normal">
                {formData.email} adresine gönderilen 6 haneli kodu girin
              </p>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded mb-6">
                {error}
              </div>
            )}

            <form onSubmit={handleVerifyEmail} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Doğrulama Kodu
                </label>
                <input
                  type="text"
                  name="verificationCode"
                  value={formData.verificationCode}
                  onChange={handleChange}
                  placeholder="123456"
                  maxLength="6"
                  required
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white text-center text-2xl tracking-widest"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
              >
                {loading ? 'Doğrulanıyor...' : 'Doğrula'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setStep('register')}
                  className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                >
                  ← Kayıt formuna dön
                </button>
              </div>
            </form>
          </div>
        </div>
      </Layout>
    );
  }

  // Kayıt formu ekranı
  return (
    <Layout>
      <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h2 className="text-black dark:text-white text-3xl font-black leading-tight tracking-[-0.033em] mb-2">
              Kayıt Ol
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-base font-normal leading-normal">
              Yeni hesap oluşturun
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-lg">
            <form onSubmit={handleRegister} className="space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  İsim Soyisim
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Adınız Soyadınız"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  E-posta
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="ornek@email.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Telefon
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="0555 123 45 67"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Rol
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                >
                  <option value="patient">Hasta</option>
                  <option value="doctor">Doktor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {formData.role === 'doctor' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Uzmanlık Alanı
                    </label>
                    <input
                      type="text"
                      name="specialization"
                      value={formData.specialization}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Örn: Ortodonti, Endodonti"
                      required={formData.role === 'doctor'}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Organizasyon Davet Kodu (Opsiyonel)
                    </label>
                    <input
                      type="text"
                      name="inviteCode"
                      value={formData.inviteCode}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="ABC12345"
                      maxLength="8"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Bir kliniğe bağlıysanız davet kodunu girin
                    </p>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Şifre
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Şifre Tekrar
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Kayıt oluşturuluyor...' : 'Kayıt Ol'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Zaten hesabınız var mı?{' '}
                <Link to="/login" className="text-primary font-medium hover:underline">
                  Giriş Yap
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
