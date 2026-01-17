// src/components/Navbar.tsx - TMDB-inspired navigation
// Replace your existing Navbar.tsx with this file

import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Sun, Moon, Globe, Menu, X, Film, Heart, LogOut } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface NavbarProps {
  isLoggedIn: boolean;
  username?: string;
  onLogout?: () => void;
}

export default function Navbar({ isLoggedIn, username, onLogout }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { theme, toggleTheme, language, setLanguage, t } = useApp();

  const handleLogout = () => {
    onLogout?.();
    setUserMenuOpen(false);
    navigate('/');
  };

  const toggleLanguage = () => {
    setLanguage(language === 'bg' ? 'en' : 'bg');
  };

  return (
    <nav className={`sticky top-0 z-50 transition-colors ${
      theme === 'dark' 
        ? 'bg-tmdb-dark-blue' 
        : 'bg-white shadow-md'
    }`}>
      <div className="max-w-7xl mx-auto px-4 lg:px-10">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-tmdb-light-green to-tmdb-light-blue rounded-lg flex items-center justify-center">
              <Film className="w-6 h-6 text-tmdb-dark-blue" />
            </div>
            <span className={`font-bold text-xl hidden sm:block ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              {t.brand}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            <Link 
              to="/" 
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                theme === 'dark' 
                  ? 'text-white hover:bg-white/10' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {t.home}
            </Link>
            
            {isLoggedIn && (
              <Link 
                to="/watchlist" 
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  theme === 'dark' 
                    ? 'text-white hover:bg-white/10' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Heart className="w-4 h-4" />
                {t.watchlist}
              </Link>
            )}
          </div>

          {/* Right Side - Theme, Language, User */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'hover:bg-white/10 text-gray-300'
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'hover:bg-white/10 text-gray-300'
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
              title="Toggle language"
            >
              <Globe className="w-4 h-4" />
              <span className="text-sm font-medium">{language.toUpperCase()}</span>
            </button>

            {/* User Actions */}
            {isLoggedIn ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    theme === 'dark'
                      ? 'hover:bg-white/10 text-white'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-tmdb-light-green to-tmdb-light-blue rounded-full flex items-center justify-center">
                    <span className="text-tmdb-dark-blue font-bold text-sm">
                      {username?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <span className="hidden sm:block font-medium">{username}</span>
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className={`absolute right-0 top-full mt-2 w-48 rounded-lg shadow-xl z-20 py-1 ${
                      theme === 'dark' ? 'bg-gray-800' : 'bg-white'
                    }`}>
                      <Link
                        to="/watchlist"
                        onClick={() => setUserMenuOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                          theme === 'dark'
                            ? 'text-gray-300 hover:bg-gray-700'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <Heart className="w-4 h-4" />
                        {t.watchlist}
                      </Link>
                      <hr className={theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} />
                      <button
                        onClick={handleLogout}
                        className={`flex items-center gap-3 w-full px-4 py-3 transition-colors ${
                          theme === 'dark'
                            ? 'text-red-400 hover:bg-gray-700'
                            : 'text-red-500 hover:bg-gray-100'
                        }`}
                      >
                        <LogOut className="w-4 h-4" />
                        {t.logout}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className={`hidden sm:block px-4 py-2 rounded-lg font-medium transition-colors ${
                    theme === 'dark'
                      ? 'text-white hover:bg-white/10'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {t.login}
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-gradient-to-r from-tmdb-light-green to-tmdb-light-blue text-tmdb-dark-blue font-semibold rounded-lg hover:opacity-90 transition-opacity text-sm"
                >
                  {t.register}
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`md:hidden p-2 rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'hover:bg-white/10 text-white'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className={`md:hidden py-4 border-t ${
            theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <div className="flex flex-col gap-2">
              <Link
                to="/"
                className={`px-4 py-3 rounded-lg font-medium ${
                  theme === 'dark' ? 'text-white hover:bg-white/10' : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {t.home}
              </Link>
              
              {isLoggedIn && (
                <Link
                  to="/watchlist"
                  className={`px-4 py-3 rounded-lg font-medium ${
                    theme === 'dark' ? 'text-white hover:bg-white/10' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t.watchlist}
                </Link>
              )}

              <hr className={theme === 'dark' ? 'border-gray-700 my-2' : 'border-gray-200 my-2'} />

              {isLoggedIn ? (
                <>
                  <div className={`px-4 py-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {username}
                  </div>
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="px-4 py-3 text-left text-red-400 hover:bg-red-500/10 rounded-lg"
                  >
                    {t.logout}
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className={`px-4 py-3 rounded-lg font-medium ${
                      theme === 'dark' ? 'text-white hover:bg-white/10' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t.login}
                  </Link>
                  <Link
                    to="/register"
                    className="mx-4 py-3 text-center bg-gradient-to-r from-tmdb-light-green to-tmdb-light-blue text-tmdb-dark-blue font-semibold rounded-lg"
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