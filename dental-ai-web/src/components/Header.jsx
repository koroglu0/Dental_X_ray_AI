import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

export default function Header() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    // localStorage'dan kullanıcı bilgisini al
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/');
  };

  const handleLogin = () => {
    navigate('/login');
  };

  return (
    <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-gray-200 dark:border-b-[#283339] px-4 sm:px-10 py-3">
      <div className="flex items-center gap-4 text-black dark:text-white">
        <div className="size-6 text-primary">
          <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <path d="M36.7273 44C33.9891 44 31.6043 39.8386 30.3636 33.69C29.123 39.8386 26.7382 44 24 44C21.2618 44 18.877 39.8386 17.6364 33.69C16.3957 39.8386 14.0109 44 11.2727 44C7.25611 44 4 35.0457 4 24C4 12.9543 7.25611 4 11.2727 4C14.0109 4 16.3957 8.16144 17.6364 14.31C18.877 8.16144 21.2618 4 24 4C26.7382 4 29.123 8.16144 30.3636 14.31C31.6043 8.16144 33.9891 4 36.7273 4C40.7439 4 44 12.9543 44 24C44 35.0457 40.7439 44 36.7273 44Z" fill="currentColor"></path>
          </svg>
        </div>
        <Link to="/">
          <h2 className="text-black dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">
            AI Dental Analysis
          </h2>
        </Link>
      </div>
      <div className="flex flex-1 justify-end items-center gap-4 sm:gap-8">
        <div className="hidden sm:flex items-center gap-9">
          <Link to="/about" className="text-gray-600 dark:text-gray-300 text-sm font-medium leading-normal hover:text-primary transition-colors">
            Hakkımızda
          </Link>
          <Link to="/history" className="text-gray-600 dark:text-gray-300 text-sm font-medium leading-normal hover:text-primary transition-colors">
            Geçmiş Analizler
          </Link>
        </div>
        
        {user ? (
          <div className="flex items-center gap-4">
            <span className="text-black dark:text-white text-sm font-medium">
              {user.name}
            </span>
            <button
              onClick={handleLogout}
              className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-slate-200 dark:bg-slate-800 text-black dark:text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
            >
              <span className="truncate">Çıkış Yap</span>
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogin}
            className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 transition-colors"
          >
            <span className="truncate">Giriş Yap</span>
          </button>
        )}
      </div>
    </header>
  );
}
