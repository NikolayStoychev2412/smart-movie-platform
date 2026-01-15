// src/components/Navbar.tsx
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Sun, Moon, Globe } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface NavbarProps {
  isLoggedIn: boolean;
  username?: string;
  onLogout?: () => void;
}

export default function Navbar({ isLoggedIn, username, onLogout }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { theme, toggleTheme, language, setLanguage, t } = useApp();

  const handleLogout = () => {
    onLogout?.();
    navigate('/');
  };

  const toggleLanguage = () => {
    setLanguage(language === 'bg' ? 'en' : 'bg');
  };

  return (
    <nav className={`backdrop-blur-sm border-b sticky top-0 z-50 transition-colors ${
      theme === 'dark' 
        ? 'bg-gray-900/95 border-gray-800' 
        : 'bg-white/95 border-gray-200'
    }`}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className={`flex items-center gap-2 font-bold text-xl ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
            </svg>
            <span>{t.brand}</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/" className={`transition-colors ${
              theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
            }`}>
              {t.home}
            </Link>
            
            <Link to="/browse" className={`transition-colors ${
              theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
            }`}>
              {language === 'bg' ? 'Разгледай' : 'Browse'}
            </Link>
            
            {isLoggedIn && (
              <Link to="/watchlist" className={`flex items-center gap-1 transition-colors ${
                theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                {t.watchlist}
              </Link>
            )}
          </div>

          {/* Right Side - Theme, Language, User */}
          <div className="hidden md:flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'bg-gray-800 hover:bg-gray-700 text-yellow-500'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
              title="Toggle language"
            >
              <Globe className="w-4 h-4" />
              <span className="text-sm font-medium">{language === 'bg' ? 'BG' : 'EN'}</span>
              <span>{language === 'bg' ? '🇧🇬' : '🇬🇧'}</span>
            </button>

            {/* User Actions */}
            {isLoggedIn ? (
              <div className="flex items-center gap-4">
                <span className={`flex items-center gap-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>{username}</span>
                </span>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 text-gray-400 hover:text-red-400 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  {t.logout}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className={`transition-colors ${
                    theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {t.login}
                </Link>
                <Link
                  to="/register"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {t.register}
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`md:hidden ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className={`md:hidden py-4 border-t ${
            theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
          }`}>
            <div className="flex flex-col gap-4">
              <Link
                to="/"
                className={theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}
                onClick={() => setMobileMenuOpen(false)}
              >
                {t.home}
              </Link>
              
              <Link
                to="/browse"
                className={theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}
                onClick={() => setMobileMenuOpen(false)}
              >
                {language === 'bg' ? 'Разгледай' : 'Browse'}
              </Link>
              
              {isLoggedIn && (
                <Link
                  to="/watchlist"
                  className={theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t.watchlist}
                </Link>
              )}

              {/* Mobile Theme & Language */}
              <div className="flex items-center gap-3 py-2">
                <button
                  onClick={toggleTheme}
                  className={`p-2 rounded-lg ${
                    theme === 'dark' ? 'bg-gray-800 text-yellow-500' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
                <button
                  onClick={toggleLanguage}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg ${
                    theme === 'dark' ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  <span>{language === 'bg' ? '🇧🇬 BG' : '🇬🇧 EN'}</span>
                </button>
              </div>

              <hr className={theme === 'dark' ? 'border-gray-800' : 'border-gray-200'} />

              {isLoggedIn ? (
                <>
                  <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                    {username}
                  </span>
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="text-red-400 text-left"
                  >
                    {t.logout}
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className={theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t.login}
                  </Link>
                  <Link
                    to="/register"
                    className="text-blue-400 hover:text-blue-300"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t.register}
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}