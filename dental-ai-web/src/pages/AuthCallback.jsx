import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { cognitoOAuthConfig } from '../aws-config';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // URL'den authorization code'u al
        const code = searchParams.get('code');
        const errorParam = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        if (errorParam) {
          setError(errorDescription || errorParam);
          setLoading(false);
          return;
        }

        if (!code) {
          setError('Authorization code bulunamadı');
          setLoading(false);
          return;
        }

        console.log('🔐 Authorization code received, exchanging for tokens...');

        // Authorization code'u token'lara dönüştür
        const tokenResponse = await fetch('http://localhost:5000/api/cognito-callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            code,
            redirect_uri: cognitoOAuthConfig.redirectUri 
          }),
        });

        const data = await tokenResponse.json();

        if (tokenResponse.ok) {
          // Token'ları kaydet
          localStorage.setItem('token', data.access_token);
          localStorage.setItem('id_token', data.id_token);
          if (data.refresh_token) {
            localStorage.setItem('refresh_token', data.refresh_token);
          }
          localStorage.setItem('user', JSON.stringify(data.user));

          console.log('✅ Login successful:', data.user);

          // Rol bazlı yönlendirme
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
          setLoading(false);
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setError('Giriş sırasında bir hata oluştu');
        setLoading(false);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-slate-700">Giriş yapılıyor...</h2>
          <p className="text-slate-500 mt-2">Lütfen bekleyin</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-md px-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-700 mb-2">Giriş Başarısız</h2>
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
          >
            Giriş Sayfasına Dön
          </button>
        </div>
      </div>
    );
  }

  return null;
}
