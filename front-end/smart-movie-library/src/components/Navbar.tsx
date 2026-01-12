// src/components/Navbar.tsx
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Film, Menu, X, User, LogOut, Heart, Star } from 'lucide-react';
import { useApp } from '../context/AppContext';
import LanguageToggle from './LanguageToggle';
import ThemeToggle from './ThemeToggle';

interface NavbarProps {
  isLoggedIn: boolean;
  username?: string;
  onLogout?: () => void;
}

export default function Navbar({ isLoggedIn, username, onLogout }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useApp();

  const handleLogout = () => {
    onLogout?.();
    navigate('/');
  };

  return (
    <nav className="bg-white dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50 transition-colors">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 text-gray-900 dark:text-white font-bold text-xl">
            <Film className="w-6 h-6 text-blue-500" />
            <span>{t.brand}</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
              {t.home}
            </Link>
            
            {isLoggedIn && (
              <>
                <Link to="/recommendations" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-1">
                  <Star className="w-4 h-4" />
                  {t.forYou}
                </Link>
                <Link to="/watchlist" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-1">
                  <Heart className="w-4 h-4" />
                  {t.watchlist}
                </Link>
              </>
            )}
          </div>

          {/* User Actions + Theme + Language */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            <LanguageToggle />
            
            {isLoggedIn ? (
              <div className="flex items-center gap-4">
                <Link to="/profile" className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                  <User className="w-5 h-5" />
                  <span>{username}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  {t.logout}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
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
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <LanguageToggle />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200 dark:border-gray-800">
            <div className="flex flex-col gap-4">
              <Link to="/" className="text-gray-600 dark:text-gray-300" onClick={() => setMobileMenuOpen(false)}>
                {t.home}
              </Link>
              
              {isLoggedIn ? (
                <>
                  <Link to="/recommendations" className="text-gray-600 dark:text-gray-300" onClick={() => setMobileMenuOpen(false)}>
                    {t.forYou}
                  </Link>
                  <Link to="/watchlist" className="text-gray-600 dark:text-gray-300" onClick={() => setMobileMenuOpen(false)}>
                    {t.watchlist}
                  </Link>
                  <hr className="border-gray-200 dark:border-gray-800" />
                  <Link to="/profile" className="text-gray-600 dark:text-gray-300" onClick={() => setMobileMenuOpen(false)}>
                    {t.profile} ({username})
                  </Link>
                  <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="text-red-500 text-left">
                    {t.logout}
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="text-gray-600 dark:text-gray-300" onClick={() => setMobileMenuOpen(false)}>
                    {t.login}
                  </Link>
                  <Link to="/register" className="text-blue-500" onClick={() => setMobileMenuOpen(false)}>
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