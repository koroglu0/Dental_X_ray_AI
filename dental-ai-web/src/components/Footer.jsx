import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="flex flex-col gap-6 px-5 py-10 text-center @container mt-auto">
      <div className="flex flex-wrap items-center justify-center gap-6 @[480px]:flex-row @[480px]:justify-around">
        <Link to="/privacy" className="text-gray-500 dark:text-[#9db0b9] text-sm font-normal leading-normal min-w-40 hover:text-primary transition-colors">
          Gizlilik Politikası
        </Link>
        <Link to="/terms" className="text-gray-500 dark:text-[#9db0b9] text-sm font-normal leading-normal min-w-40 hover:text-primary transition-colors">
          Kullanım Şartları
        </Link>
      </div>
      <p className="text-gray-500 dark:text-[#9db0b9] text-sm font-normal leading-normal">
        © 2024 AI Dental Analysis. Tüm Hakları Saklıdır.
      </p>
    </footer>
  );
}
