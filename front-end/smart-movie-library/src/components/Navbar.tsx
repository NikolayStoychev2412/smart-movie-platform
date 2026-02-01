import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { 
  Home, 
  Film, 
  Sun, 
  Moon, 
  Globe, 
  Menu, 
  X, 
  User, 
  LogOut,
  Search,
  ChevronDown,
  Bookmark,
  ShieldCheck
} from "lucide-react";

export default function Navbar() {
  const { theme, setTheme, language, setLanguage, user, logout } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const isActive = (path: string) => location.pathname === path;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/browse?q=${encodeURIComponent(searchQuery.trim())}&mode=ai`);
      setSearchQuery("");
      setMobileMenuOpen(false);
    }
  };

  const navLinks = [
    { path: "/", label: language === "bg" ? "Начало" : "Home", icon: Home },
    { path: "/browse", label: language === "bg" ? "Филми" : "Movies", icon: Film },
  ];

  // Add Watchlist link if user is logged in
  const userNavLinks = user ? [
    ...navLinks,
    { path: "/watchlist", label: language === "bg" ? "Списък" : "Watchlist", icon: Bookmark },
  ] : navLinks;

  return (
    <nav className={`sticky top-0 z-50 transition-colors ${
      theme === "dark" 
        ? "bg-tmdb-dark-blue/95 backdrop-blur-sm border-b border-gray-800" 
        : "bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm"
    }`}>
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-tmdb-light-green to-tmdb-light-blue flex items-center justify-center">
              <Film className="w-5 h-5 text-tmdb-dark-blue" />
            </div>
            <span className={`font-bold text-lg hidden sm:block ${
              theme === "dark" ? "text-white" : "text-gray-900"
            }`}>
              MovieDB
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {userNavLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  isActive(link.path)
                    ? "bg-tmdb-light-blue text-tmdb-dark-blue"
                    : theme === "dark"
                    ? "text-gray-300 hover:text-white hover:bg-white/10"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </Link>
            ))}
          </div>

          {/* Search Bar - Desktop */}
          <form onSubmit={handleSearch} className="hidden md:block flex-1 max-w-md mx-6">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === "bg" ? "Търси филми..." : "Search movies..."}
                className={`w-full pl-10 pr-4 py-2 rounded-full border focus:outline-none focus:ring-2 focus:ring-tmdb-light-blue transition-colors ${
                  theme === "dark"
                    ? "bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
                    : "bg-gray-100 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:bg-white"
                }`}
              />
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
                theme === "dark" ? "text-gray-500" : "text-gray-400"
              }`} />
            </div>
          </form>

          {/* Right side controls */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className={`p-2 rounded-lg transition-colors ${
                theme === "dark"
                  ? "text-gray-300 hover:text-white hover:bg-white/10"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Language Toggle */}
            <button
              onClick={() => setLanguage(language === "en" ? "bg" : "en")}
              className={`p-2 rounded-lg transition-colors flex items-center gap-1 ${
                theme === "dark"
                  ? "text-gray-300 hover:text-white hover:bg-white/10"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
              aria-label="Toggle language"
            >
              <Globe className="w-5 h-5" />
              <span className="text-xs font-medium uppercase">{language}</span>
            </button>

            {/* User Menu */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    theme === "dark"
                      ? "text-gray-300 hover:text-white hover:bg-white/10"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-tmdb-light-green to-tmdb-light-blue flex items-center justify-center">
                    <span className="text-tmdb-dark-blue font-bold text-sm">
                      {user.name?.charAt(0).toUpperCase() || "U"}
                    </span>
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
                </button>

                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                    <div className={`absolute right-0 top-full mt-2 w-48 rounded-lg shadow-lg border z-20 overflow-hidden ${
                      theme === "dark" ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"
                    }`}>
                      <div className={`px-4 py-3 border-b ${theme === "dark" ? "border-gray-800" : "border-gray-200"}`}>
                        <p className={`font-medium ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                          {user.name}
                        </p>
                        <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                          {user.email}
                        </p>
                      </div>
                      <Link
                        to="/profile"
                        onClick={() => setUserMenuOpen(false)}
                        className={`flex items-center gap-2 px-4 py-3 transition-colors ${
                          theme === "dark" ? "text-gray-300 hover:bg-gray-800" : "text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        <User className="w-4 h-4" />
                        {language === "bg" ? "Профил" : "Profile"}
                      </Link>
                      {user.is_admin && (
                        <Link
                          to="/admin"
                          onClick={() => setUserMenuOpen(false)}
                          className={`flex items-center gap-2 px-4 py-3 transition-colors ${
                            theme === "dark" ? "text-amber-400 hover:bg-gray-800" : "text-amber-600 hover:bg-gray-50"
                          }`}
                        >
                          <ShieldCheck className="w-4 h-4" />
                          {language === "bg" ? "Админ панел" : "Admin Panel"}
                        </Link>
                      )}
                      <button
                        onClick={() => {
                          logout();
                          setUserMenuOpen(false);
                        }}
                        className={`flex items-center gap-2 px-4 py-3 w-full transition-colors ${
                          theme === "dark" ? "text-red-400 hover:bg-gray-800" : "text-red-600 hover:bg-gray-50"
                        }`}
                      >
                        <LogOut className="w-4 h-4" />
                        {language === "bg" ? "Изход" : "Logout"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link
                  to="/login"
                  className={`px-4 py-2 rounded-lg font-medium transition-colors border ${
                    theme === "dark"
                      ? "border-gray-600 text-gray-300 hover:text-white hover:border-gray-500"
                      : "border-gray-300 text-gray-600 hover:text-gray-900 hover:border-gray-400"
                  }`}
                >
                  {language === "bg" ? "Вход" : "Login"}
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-lg bg-tmdb-light-blue text-tmdb-dark-blue font-medium hover:bg-tmdb-light-blue/90 transition-colors"
                >
                  {language === "bg" ? "Регистрация" : "Sign Up"}
                </Link>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`md:hidden p-2 rounded-lg transition-colors ${
                theme === "dark"
                  ? "text-gray-300 hover:text-white hover:bg-white/10"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className={`md:hidden py-4 border-t ${theme === "dark" ? "border-gray-800" : "border-gray-200"}`}>
            {/* Mobile Search */}
            <form onSubmit={handleSearch} className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={language === "bg" ? "Търси филми..." : "Search movies..."}
                  className={`w-full pl-10 pr-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-tmdb-light-blue ${
                    theme === "dark"
                      ? "bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
                      : "bg-gray-100 border-gray-200 text-gray-900 placeholder:text-gray-400"
                  }`}
                />
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
                  theme === "dark" ? "text-gray-500" : "text-gray-400"
                }`} />
              </div>
            </form>

            {/* Mobile Nav Links */}
            <div className="space-y-1">
              {userNavLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive(link.path)
                      ? "bg-tmdb-light-blue text-tmdb-dark-blue"
                      : theme === "dark"
                      ? "text-gray-300 hover:text-white hover:bg-white/10"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  <link.icon className="w-5 h-5" />
                  {link.label}
                </Link>
              ))}
              
              {!user && (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      theme === "dark"
                        ? "text-gray-300 hover:text-white hover:bg-white/10"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    }`}
                  >
                    <User className="w-5 h-5" />
                    {language === "bg" ? "Вход" : "Login"}
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg bg-tmdb-light-blue text-tmdb-dark-blue font-medium"
                  >
                    <User className="w-5 h-5" />
                    {language === "bg" ? "Регистрация" : "Sign Up"}
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