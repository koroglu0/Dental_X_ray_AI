import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getGoogleSignInUrl } from '../aws-config';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Google ile giriş - Cognito Hosted UI'a yönlendir
  const handleGoogleLogin = () => {
    setGoogleLoading(true);
    // Cognito Hosted UI'daki Google login sayfasına yönlendir
    window.location.href = getGoogleSignInUrl();
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        const token = data.access_token || data.token;
        localStorage.setItem('token', token);
        
        if (data.id_token) {
          localStorage.setItem('id_token', data.id_token);
        }
        if (data.refresh_token) {
          localStorage.setItem('refresh_token', data.refresh_token);
        }
        
        localStorage.setItem('user', JSON.stringify(data.user));
        
        const userRole = data.user?.role;
        
        if (userRole === 'admin') {
          navigate('/admin');
        } else if (userRole === 'doctor') {
          navigate('/doctor');
        } else if (userRole === 'patient') {
          navigate('/patient/upload');
        } else {
          navigate('/');
        }
      } else {
        setError(data.error || 'Giriş yapılamadı');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Sunucuya bağlanılamadı');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Sol Taraf - Login Formu */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between bg-white px-8 py-8 lg:px-16 xl:px-24">
        <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-10">
            <svg className="w-8 h-8 text-cyan-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C13.5 2 14.5 3 15 4C15.5 5 16 6.5 16 8C16 9.5 15.5 11 15 12C14.5 13 14.5 14 15 15C15.5 16 16 17.5 16 19C16 20.5 15 22 13.5 22C12.5 22 12 21.5 12 21C12 21.5 11.5 22 10.5 22C9 22 8 20.5 8 19C8 17.5 8.5 16 9 15C9.5 14 9.5 13 9 12C8.5 11 8 9.5 8 8C8 6.5 8.5 5 9 4C9.5 3 10.5 2 12 2Z"/>
            </svg>
            <span className="text-xl font-bold text-slate-800">DentalAI</span>
          </div>

          {/* Başlık */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Tekrar Hoşgeldiniz</h1>
            <p className="text-slate-500 text-sm">
              Güvenli hesabınıza erişmek için bilgilerinizi girin.
            </p>
          </div>

          {/* Login Formu */}
          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* E-posta */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                E-posta Adresi
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                placeholder="ornek@dentalai.com"
                required
              />
            </div>

            {/* Şifre */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  Şifre
                </label>
                <Link to="/forgot-password" className="text-sm text-cyan-600 hover:text-cyan-700 font-medium">
                  Şifremi Unuttum?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all pr-12"
                  placeholder="••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Giriş Yap Butonu */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-cyan-500 text-white rounded-xl font-semibold hover:bg-cyan-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/25"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Giriş yapılıyor...
                </span>
              ) : 'Giriş Yap'}
            </button>

            {/* Ayırıcı */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-slate-400 uppercase tracking-wider text-xs">veya</span>
              </div>
            </div>

            {/* Google ile Giriş - Cognito OAuth */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="w-full py-3.5 border border-slate-200 rounded-xl font-medium text-slate-700 hover:bg-slate-50 transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {googleLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-slate-600" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Google'a yönlendiriliyor...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>Google ile devam et</span>
                </>
              )}
            </button>
          </form>

          {/* Kayıt Ol Linki */}
          <p className="text-center text-slate-500 text-sm mt-8">
            Hesabınız yok mu?{' '}
            <Link to="/register" className="text-cyan-600 font-semibold hover:text-cyan-700">
              Kayıt Olun
            </Link>
          </p>
        </div>

        {/* Alt Bilgi */}
        <div className="flex items-center gap-2 text-slate-400 text-xs mt-8">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>Güvenli & HIPAA Uyumlu</span>
        </div>
      </div>

      {/* Sağ Taraf - Hero Bölümü */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
        {/* Arka plan deseni */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-20 w-72 h-72 bg-cyan-500/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>
        </div>

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-5">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* İçerik */}
        <div className="relative z-10 flex flex-col justify-center items-center w-full px-12">
          {/* 3D Diş Görseli */}
          <div className="relative mb-8">
            {/* Ana diş görseli SVG */}
            <div className="relative">
              <svg className="w-80 h-80" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Diş silüeti - daha detaylı */}
                <defs>
                  <linearGradient id="toothGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0e7490" stopOpacity="0.8"/>
                    <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.6"/>
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.4"/>
                  </linearGradient>
                  <linearGradient id="glowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.5"/>
                    <stop offset="100%" stopColor="#0e7490" stopOpacity="0.1"/>
                  </linearGradient>
                </defs>
                
                {/* Dış çerçeve glow */}
                <ellipse cx="100" cy="100" rx="90" ry="85" fill="url(#glowGradient)" opacity="0.3"/>
                
                {/* Diş şekli - üst çene */}
                <path d="M60 80 Q65 60, 80 55 Q95 50, 100 50 Q105 50, 120 55 Q135 60, 140 80 Q142 95, 135 110 Q130 120, 125 130 Q120 145, 115 155 Q110 165, 100 165 Q90 165, 85 155 Q80 145, 75 130 Q70 120, 65 110 Q58 95, 60 80Z" 
                      stroke="url(#toothGradient)" strokeWidth="2" fill="none" opacity="0.8"/>
                
                {/* İç detay çizgileri */}
                <path d="M75 85 Q85 80, 100 80 Q115 80, 125 85" stroke="#06b6d4" strokeWidth="1" fill="none" opacity="0.4"/>
                <path d="M78 100 Q90 95, 100 95 Q110 95, 122 100" stroke="#06b6d4" strokeWidth="1" fill="none" opacity="0.4"/>
                
                {/* Alt çene dişleri silüeti */}
                <path d="M55 130 Q60 145, 70 155 Q80 165, 100 170 Q120 165, 130 155 Q140 145, 145 130" 
                      stroke="url(#toothGradient)" strokeWidth="1.5" fill="none" opacity="0.5"/>
                
                {/* Parıltı noktaları */}
                <circle cx="85" cy="70" r="2" fill="#22d3ee" opacity="0.6"/>
                <circle cx="115" cy="72" r="1.5" fill="#22d3ee" opacity="0.5"/>
                <circle cx="100" cy="90" r="1" fill="#67e8f9" opacity="0.7"/>
              </svg>

              {/* Yüzen badge'ler */}
              {/* Analiz Süresi Badge */}
              <div className="absolute -left-4 top-1/3 bg-slate-800/90 backdrop-blur-sm rounded-xl px-4 py-2.5 shadow-xl border border-slate-700/50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-cyan-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C13.5 2 14.5 3 15 4C15.5 5 16 6.5 16 8C16 9.5 15.5 11 15 12C14.5 13 14.5 14 15 15C15.5 16 16 17.5 16 19C16 20.5 15 22 13.5 22C12.5 22 12 21.5 12 21C12 21.5 11.5 22 10.5 22C9 22 8 20.5 8 19C8 17.5 8.5 16 9 15C9.5 14 9.5 13 9 12C8.5 11 8 9.5 8 8C8 6.5 8.5 5 9 4C9.5 3 10.5 2 12 2Z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Analiz Süresi</p>
                    <p className="text-sm font-semibold text-white">~3 Saniye</p>
                  </div>
                </div>
              </div>

              {/* Doğruluk Oranı Badge */}
              <div className="absolute -right-4 top-1/2 bg-slate-800/90 backdrop-blur-sm rounded-xl px-4 py-2.5 shadow-xl border border-slate-700/50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Doğruluk Oranı</p>
                    <p className="text-sm font-semibold text-emerald-400">%99.8</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Başlık ve Açıklama */}
          <div className="text-center max-w-md">
            <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-4 py-1.5 mb-4">
              <svg className="w-4 h-4 text-cyan-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C13.5 2 14.5 3 15 4C15.5 5 16 6.5 16 8C16 9.5 15.5 11 15 12C14.5 13 14.5 14 15 15C15.5 16 16 17.5 16 19C16 20.5 15 22 13.5 22C12.5 22 12 21.5 12 21C12 21.5 11.5 22 10.5 22C9 22 8 20.5 8 19C8 17.5 8.5 16 9 15C9.5 14 9.5 13 9 12C8.5 11 8 9.5 8 8C8 6.5 8.5 5 9 4C9.5 3 10.5 2 12 2Z"/>
              </svg>
              <span className="text-cyan-400 text-xs font-medium uppercase tracking-wider">Analiz Süresi</span>
            </div>
            
            <h2 className="text-4xl font-bold text-white mb-2">
              Yapay Zeka Destekli
            </h2>
            <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 mb-4">
              Diş Teşhisi
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Gelişmiş algoritmalar ile saniyeler içinde detaylı diş analizi raporları alın ve tedavi sürecinizi hızlandırın.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
