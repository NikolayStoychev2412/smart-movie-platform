// src/components/Navbar.tsx
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Film, Menu, X, User, LogOut, Heart, Star } from 'lucide-react';

interface NavbarProps {
  isLoggedIn: boolean;
  username?: string;
  onLogout?: () => void;
}

export default function Navbar({ isLoggedIn, username, onLogout }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout?.();
    navigate('/');
  };

  return (
    <nav className="bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 text-white font-bold text-xl">
            <Film className="w-6 h-6 text-blue-500" />
            <span>КиноБаза</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-gray-300 hover:text-white transition-colors">
              Начало
            </Link>
            
            {isLoggedIn && (
              <>
                <Link to="/recommendations" className="text-gray-300 hover:text-white transition-colors flex items-center gap-1">
                  <Star className="w-4 h-4" />
                  За теб
                </Link>
                <Link to="/watchlist" className="text-gray-300 hover:text-white transition-colors flex items-center gap-1">
                  <Heart className="w-4 h-4" />
                  Списък
                </Link>
              </>
            )}
          </div>

          {/* User Actions */}
          <div className="hidden md:flex items-center gap-4">
            {isLoggedIn ? (
              <div className="flex items-center gap-4">
                <Link to="/profile" className="flex items-center gap-2 text-gray-300 hover:text-white">
                  <User className="w-5 h-5" />
                  <span>{username}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 text-gray-400 hover:text-red-400 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Изход
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Вход
                </Link>
                <Link
                  to="/register"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Регистрация
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-gray-400 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-800">
            <div className="flex flex-col gap-4">
              <Link
                to="/"
                className="text-gray-300 hover:text-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                Начало
              </Link>
              
              {isLoggedIn && (
                <>
                  <Link
                    to="/recommendations"
                    className="text-gray-300 hover:text-white"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    За теб
                  </Link>
                  <Link
                    to="/watchlist"
                    className="text-gray-300 hover:text-white"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Списък за гледане
                  </Link>
                </>
              )}

              <hr className="border-gray-800" />

              {isLoggedIn ? (
                <>
                  <Link
                    to="/profile"
                    className="text-gray-300 hover:text-white"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Профил ({username})
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="text-red-400 text-left"
                  >
                    Изход
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-gray-300 hover:text-white"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Вход
                  </Link>
                  <Link
                    to="/register"
                    className="text-blue-400 hover:text-blue-300"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Регистрация
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