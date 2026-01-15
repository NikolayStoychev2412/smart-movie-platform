// src/pages/Register.tsx
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';
import { useApp } from '../context/AppContext';

const GENRES = [
  { id: 'action', label: 'Action', labelBg: 'Екшън', icon: '💥' },
  { id: 'comedy', label: 'Comedy', labelBg: 'Комедия', icon: '😂' },
  { id: 'drama', label: 'Drama', labelBg: 'Драма', icon: '🎭' },
  { id: 'horror', label: 'Horror', labelBg: 'Ужаси', icon: '👻' },
  { id: 'romance', label: 'Romance', labelBg: 'Романтика', icon: '💕' },
  { id: 'scifi', label: 'Sci-Fi', labelBg: 'Научна фантастика', icon: '🚀' },
  { id: 'thriller', label: 'Thriller', labelBg: 'Трилър', icon: '😱' },
  { id: 'animation', label: 'Animation', labelBg: 'Анимация', icon: '🎨' },
  { id: 'documentary', label: 'Documentary', labelBg: 'Документален', icon: '📽️' },
  { id: 'fantasy', label: 'Fantasy', labelBg: 'Фентъзи', icon: '🧙' },
  { id: 'adventure', label: 'Adventure', labelBg: 'Приключенски', icon: '🗺️' },
  { id: 'crime', label: 'Crime', labelBg: 'Криминален', icon: '🔍' },
];

export default function Register() {
  const navigate = useNavigate();
  const { theme, language } = useApp();
  
  const [step, setStep] = useState<'info' | 'genres'>('info');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const passwordChecks = {
    length: formData.password.length >= 8,
    uppercase: /[A-Z]/.test(formData.password),
    lowercase: /[a-z]/.test(formData.password),
    number: /[0-9]/.test(formData.password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password),
  };
  
  const passwordValid = Object.values(passwordChecks).every(Boolean);
  const passwordsMatch = formData.password === formData.confirmPassword && formData.confirmPassword.length > 0;

  const toggleGenre = (genreId: string) => {
    setSelectedGenres(prev => 
      prev.includes(genreId) 
        ? prev.filter(g => g !== genreId)
        : [...prev, genreId]
    );
  };

  const handleInfoSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!passwordValid) {
      setError(language === 'bg' ? 'Моля, изпълнете всички изисквания за паролата' : 'Please meet all password requirements');
      return;
    }

    if (!passwordsMatch) {
      setError(language === 'bg' ? 'Паролите не съвпадат' : 'Passwords do not match');
      return;
    }

    setStep('genres');
  };

  const handleFinalSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      await authApi.register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        preferred_genres: selectedGenres,
      });
      
      navigate('/login');
    } catch (err: unknown) {
      const error = err as { response?: { status?: number; data?: { detail?: string } } };
      if (error.response?.status === 400) {
        setError(error.response.data?.detail || (language === 'bg' ? 'Имейлът вече е регистриран' : 'Email already registered'));
      } else {
        setError(language === 'bg' ? 'Регистрацията неуспешна. Моля, опитайте отново.' : 'Registration failed. Please try again.');
      }
      setStep('info');
    } finally {
      setLoading(false);
    }
  };

  const skipGenres = async () => {
    setSelectedGenres([]);
    await handleFinalSubmit();
  };

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 py-8 ${
      theme === 'dark' ? 'bg-gray-950' : 'bg-gray-50'
    }`}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className={`inline-flex items-center gap-2 font-bold text-2xl ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
            </svg>
            <span>{language === 'bg' ? 'КиноБаза' : 'MovieBase'}</span>
          </Link>
          
          {step === 'info' ? (
            <>
              <h1 className={`mt-4 text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {language === 'bg' ? 'Създай акаунт' : 'Create an account'}
              </h1>
              <p className={`mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {language === 'bg' ? 'Присъедини се, за да откриеш страхотни филми' : 'Join us to discover great movies'}
              </p>
            </>
          ) : (
            <>
              <h1 className={`mt-4 text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {language === 'bg' ? 'Какви филми харесваш?' : 'What movies do you like?'}
              </h1>
              <p className={`mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {language === 'bg' ? 'Избери любимите си жанрове за персонализирани препоръки' : 'Select your favorite genres for personalized recommendations'}
              </p>
            </>
          )}
        </div>

        {/* Step indicators */}
        <div className="flex justify-center gap-2 mb-6">
          <div className={`w-3 h-3 rounded-full ${step === 'info' ? 'bg-blue-500' : 'bg-gray-600'}`} />
          <div className={`w-3 h-3 rounded-full ${step === 'genres' ? 'bg-blue-500' : 'bg-gray-600'}`} />
        </div>

        {/* Form */}
        <div className={`rounded-xl shadow-lg p-8 ${
          theme === 'dark' ? 'bg-gray-900' : 'bg-white'
        }`}>
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {step === 'info' ? (
            <form onSubmit={handleInfoSubmit} className="space-y-5">
              {/* Name */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  {language === 'bg' ? 'Име' : 'Name'}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all ${
                    theme === 'dark'
                      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                      : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                  }`}
                  placeholder={language === 'bg' ? 'Въведете вашето име' : 'Enter your name'}
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  {language === 'bg' ? 'Имейл' : 'Email'}
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all ${
                    theme === 'dark'
                      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                      : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                  }`}
                  placeholder={language === 'bg' ? 'Въведете вашия имейл' : 'Enter your email'}
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  {language === 'bg' ? 'Парола' : 'Password'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className={`w-full px-4 pr-12 py-3 border rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all ${
                      theme === 'dark'
                        ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                        : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                    }`}
                    placeholder={language === 'bg' ? 'Създайте парола' : 'Create a password'}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
                      theme === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                    }`}
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
                
                {/* Password requirements */}
                {formData.password && (
                  <div className="mt-3 space-y-1">
                    <PasswordCheck passed={passwordChecks.length} text={language === 'bg' ? 'Поне 8 символа' : 'At least 8 characters'} />
                    <PasswordCheck passed={passwordChecks.uppercase} text={language === 'bg' ? 'Една главна буква' : 'One uppercase letter'} />
                    <PasswordCheck passed={passwordChecks.lowercase} text={language === 'bg' ? 'Една малка буква' : 'One lowercase letter'} />
                    <PasswordCheck passed={passwordChecks.number} text={language === 'bg' ? 'Една цифра' : 'One number'} />
                    <PasswordCheck passed={passwordChecks.special} text={language === 'bg' ? 'Един специален символ' : 'One special character'} />
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  {language === 'bg' ? 'Потвърди парола' : 'Confirm Password'}
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                    formData.confirmPassword
                      ? passwordsMatch
                        ? 'border-green-500 focus:border-green-500 focus:ring-green-500/20'
                        : 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                      : theme === 'dark'
                        ? 'bg-gray-800 border-gray-700 focus:border-blue-500 focus:ring-blue-500/20'
                        : 'bg-gray-50 border-gray-300 focus:border-blue-500 focus:ring-blue-500/20'
                  } ${theme === 'dark' ? 'bg-gray-800 text-white placeholder-gray-500' : 'bg-gray-50 text-gray-900 placeholder-gray-400'}`}
                  placeholder={language === 'bg' ? 'Потвърдете вашата парола' : 'Confirm your password'}
                  required
                />
                {formData.confirmPassword && !passwordsMatch && (
                  <p className="mt-1 text-sm text-red-400">
                    {language === 'bg' ? 'Паролите не съвпадат' : 'Passwords do not match'}
                  </p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={!passwordValid || !passwordsMatch}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
              >
                {language === 'bg' ? 'Продължи' : 'Continue'}
              </button>
            </form>
          ) : (
            /* Genre Selection Step */
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3">
                {GENRES.map((genre) => (
                  <button
                    key={genre.id}
                    type="button"
                    onClick={() => toggleGenre(genre.id)}
                    className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                      selectedGenres.includes(genre.id)
                        ? 'border-blue-500 bg-blue-500/10 text-blue-500'
                        : theme === 'dark'
                          ? 'border-gray-700 hover:border-gray-600 text-gray-300'
                          : 'border-gray-300 hover:border-gray-400 text-gray-700'
                    }`}
                  >
                    <span className="text-xl">{genre.icon}</span>
                    <span className="text-sm font-medium">
                      {language === 'bg' ? genre.labelBg : genre.label}
                    </span>
                  </button>
                ))}
              </div>

              <p className={`text-sm text-center ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {language === 'bg' 
                  ? `Избрани: ${selectedGenres.length} жанра` 
                  : `Selected: ${selectedGenres.length} genres`}
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep('info')}
                  className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                    theme === 'dark'
                      ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  {language === 'bg' ? 'Назад' : 'Back'}
                </button>
                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={loading}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {loading && (
                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  {language === 'bg' ? 'Създай акаунт' : 'Create Account'}
                </button>
              </div>

              <button
                type="button"
                onClick={skipGenres}
                disabled={loading}
                className={`w-full text-sm ${
                  theme === 'dark' ? 'text-gray-500 hover:text-gray-400' : 'text-gray-500 hover:text-gray-600'
                }`}
              >
                {language === 'bg' ? 'Пропусни за сега' : 'Skip for now'}
              </button>
            </div>
          )}

          {/* Login link */}
          {step === 'info' && (
            <p className={`mt-6 text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {language === 'bg' ? 'Вече имате акаунт?' : 'Already have an account?'}{' '}
              <Link to="/login" className="text-blue-500 hover:text-blue-400 font-medium">
                {language === 'bg' ? 'Вход' : 'Login'}
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function PasswordCheck({ passed, text }: { passed: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {passed ? (
        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      <span className={passed ? 'text-green-400' : 'text-gray-500'}>{text}</span>
    </div>
  );
}