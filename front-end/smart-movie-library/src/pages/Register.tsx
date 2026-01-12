// src/pages/Register.tsx
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Film, User, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { authApi } from '../api/auth';

export default function Register() {
  const navigate = useNavigate();
  const { t, language } = useApp();
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const passwordChecks = {
    length: formData.password.length >= 8,
    hasNumber: /\d/.test(formData.password),
    hasLetter: /[a-zA-Z]/.test(formData.password),
    matches: formData.password === formData.confirmPassword && formData.confirmPassword !== '',
  };

  const isPasswordValid = passwordChecks.length && passwordChecks.hasNumber && passwordChecks.hasLetter;
  const isFormValid = formData.username && formData.email && isPasswordValid && passwordChecks.matches;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isFormValid) {
      setError(language === 'bg' ? 'Моля, попълнете всички полета правилно' : 'Please fill all fields correctly');
      return;
    }

    setLoading(true);

    try {
      await authApi.register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });

      navigate('/login', { state: { registered: true } });
    } catch (err: unknown) {
      const error = err as { response?: { status?: number; data?: { detail?: string } } };
      if (error.response?.status === 400) {
        const detail = error.response.data?.detail || '';
        if (detail.includes('username')) {
          setError(language === 'bg' ? 'Потребителското име вече съществува' : 'Username already exists');
        } else if (detail.includes('email')) {
          setError(language === 'bg' ? 'Имейлът вече се използва' : 'Email already in use');
        } else {
          setError(detail);
        }
      } else {
        setError(language === 'bg' ? 'Грешка при регистрация. Опитайте отново.' : 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const CheckItem = ({ valid, text }: { valid: boolean; text: string }) => (
    <div className={`flex items-center gap-2 text-sm ${valid ? 'text-green-500' : 'text-gray-400'}`}>
      {valid ? <CheckCircle className="w-4 h-4" /> : <div className="w-4 h-4 rounded-full border border-gray-400" />}
      {text}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex items-center justify-center px-4 py-8 transition-colors">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-gray-900 dark:text-white font-bold text-2xl">
            <Film className="w-8 h-8 text-blue-500" />
            <span>{t.brand}</span>
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
            {language === 'bg' ? 'Създайте акаунт' : 'Create an account'}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {language === 'bg' ? 'Присъединете се към нас' : 'Join us today'}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8 transition-colors">
          {error && (
            <div className="mb-6 p-4 bg-red-100 dark:bg-red-500/10 border border-red-300 dark:border-red-500/20 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {language === 'bg' ? 'Потребителско име' : 'Username'}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  placeholder={language === 'bg' ? 'Изберете потребителско име' : 'Choose a username'}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {language === 'bg' ? 'Имейл' : 'Email'}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  placeholder={language === 'bg' ? 'Въведете имейл' : 'Enter your email'}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {language === 'bg' ? 'Парола' : 'Password'}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-10 pr-12 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  placeholder={language === 'bg' ? 'Създайте парола' : 'Create a password'}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              
              {formData.password && (
                <div className="mt-3 space-y-1">
                  <CheckItem valid={passwordChecks.length} text={language === 'bg' ? 'Минимум 8 символа' : 'At least 8 characters'} />
                  <CheckItem valid={passwordChecks.hasLetter} text={language === 'bg' ? 'Съдържа буква' : 'Contains a letter'} />
                  <CheckItem valid={passwordChecks.hasNumber} text={language === 'bg' ? 'Съдържа цифра' : 'Contains a number'} />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {language === 'bg' ? 'Потвърдете паролата' : 'Confirm Password'}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className={`w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                    formData.confirmPassword
                      ? passwordChecks.matches
                        ? 'border-green-500 focus:border-green-500'
                        : 'border-red-500 focus:border-red-500'
                      : 'border-gray-300 dark:border-gray-700 focus:border-blue-500'
                  }`}
                  placeholder={language === 'bg' ? 'Повторете паролата' : 'Repeat your password'}
                  required
                />
              </div>
              {formData.confirmPassword && !passwordChecks.matches && (
                <p className="mt-2 text-sm text-red-500">
                  {language === 'bg' ? 'Паролите не съвпадат' : 'Passwords do not match'}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !isFormValid}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {language === 'bg' ? 'Регистриране...' : 'Creating account...'}
                </>
              ) : (
                t.register
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-gray-600 dark:text-gray-400">
            {language === 'bg' ? 'Вече имате акаунт?' : 'Already have an account?'}{' '}
            <Link to="/login" className="text-blue-500 hover:text-blue-400 font-medium">
              {t.login}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}