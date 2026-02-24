import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { authApi } from "../api/auth";
import api from "../api/client";
import {
  Mail, Lock, Eye, EyeOff, UserPlus, AlertCircle, User, Check,
  ChevronRight, ChevronLeft, Film, Sparkles
} from "lucide-react";
import { GENRES, MOODS } from "../constants/preferences";

type Step = "account" | "genres" | "mood";

export default function Register() {
  const navigate = useNavigate();
  const { theme, language, setUser } = useApp();
  
  const [currentStep, setCurrentStep] = useState<Step>("account");
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordChecks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
  };
  
  const passwordStrength = Object.values(passwordChecks).filter(Boolean).length;
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const getStrengthColor = () => {
    if (passwordStrength <= 1) return "bg-red-500";
    if (passwordStrength === 2) return "bg-yellow-500";
    if (passwordStrength === 3) return "bg-blue-500";
    return "bg-green-500";
  };

  const getStrengthLabel = () => {
    if (passwordStrength <= 1) return language === "bg" ? "Слаба" : "Weak";
    if (passwordStrength === 2) return language === "bg" ? "Средна" : "Fair";
    if (passwordStrength === 3) return language === "bg" ? "Добра" : "Good";
    return language === "bg" ? "Силна" : "Strong";
  };

  const toggleGenre = (genreId: string) => {
    setSelectedGenres(prev => 
      prev.includes(genreId) 
        ? prev.filter(g => g !== genreId)
        : prev.length < 5 ? [...prev, genreId] : prev
    );
  };

  const validateAccountStep = (): boolean => {
    if (!name || !email || !password || !confirmPassword) {
      setError(language === "bg" ? "Моля, попълнете всички полета" : "Please fill in all fields");
      return false;
    }
    if (password !== confirmPassword) {
      setError(language === "bg" ? "Паролите не съвпадат" : "Passwords do not match");
      return false;
    }
    if (passwordStrength < 3) {
      setError(language === "bg" ? "Моля, използвайте по-силна парола" : "Please use a stronger password");
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    setError(null);
    if (currentStep === "account") {
      if (validateAccountStep()) {
        setCurrentStep("genres");
      }
    } else if (currentStep === "genres") {
      if (selectedGenres.length < 1) {
        setError(language === "bg" ? "Изберете поне 1 жанр" : "Select at least 1 genre");
        return;
      }
      setCurrentStep("mood");
    }
  };

  const handlePrevStep = () => {
    setError(null);
    if (currentStep === "genres") setCurrentStep("account");
    else if (currentStep === "mood") setCurrentStep("genres");
  };

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    try {
      // 1. Register the user
      const { user, token } = await authApi.register(name, email, password);
      
      // 2. Save preferences to backend
      if (token) {
        try {
          await api.post('/users/preferences', {
            preferred_genres: selectedGenres,
            preferred_mood: selectedMood,
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch {
        }
      }
      
      // 3. Store user with preferences locally
      const userWithPrefs = {
        ...user,
        preferred_genres: selectedGenres,
        preferred_mood: selectedMood,
      };
      
      localStorage.setItem("user", JSON.stringify(userWithPrefs));
      setUser(userWithPrefs);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : language === "bg" ? "Грешка при регистрация" : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSkipPreferences = async () => {
    setError(null);
    setLoading(true);

    try {
      const { user } = await authApi.register(name, email, password);
      localStorage.setItem("user", JSON.stringify(user));
      setUser(user);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : language === "bg" ? "Грешка при регистрация" : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const steps = ["account", "genres", "mood"] as const;
  const currentStepIndex = steps.indexOf(currentStep);

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 py-12 bg-bg`}>
      <div className={`w-full max-w-md ${theme === "dark" ? "bg-surface-2" : "bg-white shadow-md border border-border"} rounded-2xl p-8`}>
        
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {steps.map((step, idx) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  idx <= currentStepIndex 
                    ? "bg-primary text-white" 
                    : theme === "dark" ? "bg-gray-700 text-muted" : "bg-gray-200 text-muted"
                }`}>
                  {idx < currentStepIndex ? <Check className="w-4 h-4" /> : idx + 1}
                </div>
                {idx < steps.length - 1 && (
                  <div className={`w-16 sm:w-24 h-1 mx-2 rounded ${
                    idx < currentStepIndex 
                      ? "bg-primary" 
                      : theme === "dark" ? "bg-gray-700" : "bg-gray-200"
                  }`} />
                )}
              </div>
            ))}
          </div>
          <p className={`text-center text-sm text-muted`}>
            {currentStep === "account" && (language === "bg" ? "Създай акаунт" : "Create Account")}
            {currentStep === "genres" && (language === "bg" ? "Избери жанрове" : "Pick Genres")}
            {currentStep === "mood" && (language === "bg" ? "Какво настроение?" : "What's your mood?")}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        )}

        {/* STEP 1: Account Info */}
        {currentStep === "account" && (
          <div className="space-y-5">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary flex items-center justify-center">
                <UserPlus className="w-8 h-8 text-white" />
              </div>
              <h1 className={`text-2xl font-bold text-text`}>
                {language === "bg" ? "Създайте акаунт" : "Create Account"}
              </h1>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 text-muted`}>
                {language === "bg" ? "Име" : "Name"}
              </label>
              <div className="relative">
                <User className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted`} />
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  className={`w-full pl-11 pr-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary ${
                    theme === "dark" ? "bg-border border-border text-white" : "bg-bg border-border text-text"
                  }`} />
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 text-muted`}>
                {language === "bg" ? "Имейл" : "Email"}
              </label>
              <div className="relative">
                <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted`} />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className={`w-full pl-11 pr-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary ${
                    theme === "dark" ? "bg-border border-border text-white" : "bg-bg border-border text-text"
                  }`} />
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 text-muted`}>
                {language === "bg" ? "Парола" : "Password"}
              </label>
              <div className="relative">
                <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted`} />
                <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className={`w-full pl-11 pr-12 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary ${
                    theme === "dark" ? "bg-border border-border text-white" : "bg-bg border-border text-text"
                  }`} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-0 bottom-0 flex items-center text-muted hover:text-muted`}>
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {password && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs text-muted`}>
                      {language === "bg" ? "Сила:" : "Strength:"}
                    </span>
                    <span className={`text-xs font-medium ${
                      passwordStrength <= 1 ? "text-red-500" : passwordStrength === 2 ? "text-yellow-500" : passwordStrength === 3 ? "text-blue-500" : "text-green-500"
                    }`}>{getStrengthLabel()}</span>
                  </div>
                  <div className={`h-1.5 rounded-full overflow-hidden ${theme === "dark" ? "bg-gray-700" : "bg-gray-200"}`}>
                    <div className={`h-full transition-all duration-300 ${getStrengthColor()}`} style={{ width: `${(passwordStrength / 4) * 100}%` }} />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 text-muted`}>
                {language === "bg" ? "Потвърдете паролата" : "Confirm Password"}
              </label>
              <div className="relative">
                <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted`} />
                <input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  className={`w-full pl-11 pr-12 py-3 rounded-lg border focus:outline-none focus:ring-2 ${
                    confirmPassword && !passwordsMatch ? "border-red-500 focus:ring-red-500" : "focus:ring-primary"
                  } ${theme === "dark" ? "bg-border border-border text-white" : "bg-bg border-border text-text"}`} />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className={`absolute right-3 top-0 bottom-0 flex items-center text-muted hover:text-muted`}>
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button onClick={handleNextStep}
              className="w-full py-3 px-4 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
              {language === "bg" ? "Продължи" : "Continue"}
              <ChevronRight className="w-5 h-5" />
            </button>

            <p className={`text-center text-sm text-muted`}>
              {language === "bg" ? "Вече имате акаунт?" : "Already have an account?"}{" "}
              <Link to="/login" className="text-primary font-semibold hover:underline">
                {language === "bg" ? "Вход" : "Sign In"}
              </Link>
            </p>
          </div>
        )}

        {/* STEP 2: Genre Selection */}
        {currentStep === "genres" && (
          <div className="space-y-5">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary flex items-center justify-center">
                <Film className="w-8 h-8 text-white" />
              </div>
              <h1 className={`text-2xl font-bold text-text`}>
                {language === "bg" ? "Какво обичаш да гледаш?" : "What do you like to watch?"}
              </h1>
              <p className={`mt-2 text-sm text-muted`}>
                {language === "bg" ? "Избери до 5 любими жанра" : "Pick up to 5 favorite genres"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {GENRES.map((genre) => {
                const isSelected = selectedGenres.includes(genre.id);
                return (
                  <button
                    key={genre.id}
                    onClick={() => toggleGenre(genre.id)}
                    className={`p-3 rounded-xl border-2 transition-all text-left ${
                      isSelected
                        ? "border-primary bg-primary/10"
                        : theme === "dark"
                          ? "border-border hover:border-gray-600 bg-border"
                          : "border-border hover:border-border bg-bg"
                    }`}
                  >
                    <span className={`font-medium text-sm ${
                      isSelected
                        ? "text-primary"
                        : "text-text"
                    }`}>
                      {genre.emoji} {language === "bg" ? genre.bg : genre.en}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className={`text-center text-sm text-muted`}>
              {selectedGenres.length}/5 {language === "bg" ? "избрани" : "selected"}
            </div>

            <div className="flex gap-3">
              <button onClick={handlePrevStep}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                  theme === "dark" ? "bg-border text-white hover:bg-border" : "bg-surface-2 text-muted hover:bg-gray-200"
                }`}>
                <ChevronLeft className="w-5 h-5" />
                {language === "bg" ? "Назад" : "Back"}
              </button>
              <button onClick={handleNextStep}
                className="flex-1 py-3 px-4 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                {language === "bg" ? "Продължи" : "Continue"}
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <button onClick={handleSkipPreferences}
              className={`w-full py-2 text-sm text-muted hover:text-muted`}>
              {language === "bg" ? "Пропусни за сега" : "Skip for now"}
            </button>
          </div>
        )}

        {/* STEP 3: Mood Selection */}
        {currentStep === "mood" && (
          <div className="space-y-5">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h1 className={`text-2xl font-bold text-text`}>
                {language === "bg" ? "Какво настроение предпочиташ?" : "What mood do you prefer?"}
              </h1>
              <p className={`mt-2 text-sm text-muted`}>
                {language === "bg" ? "Избери какво обикновено търсиш" : "Pick what you usually look for"}
              </p>
            </div>

            <div className="space-y-3">
              {MOODS.map((mood) => {
                const isSelected = selectedMood === mood.id;
                return (
                  <button
                    key={mood.id}
                    onClick={() => setSelectedMood(mood.id)}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                      isSelected
                        ? "border-primary bg-primary/10"
                        : theme === "dark" 
                          ? "border-border hover:border-gray-600 bg-border" 
                          : "border-border hover:border-border bg-bg"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`font-medium ${
                        isSelected
                          ? "text-primary"
                          : "text-text"
                      }`}>
                        {language === "bg" ? mood.bg : mood.en}
                      </span>
                      {isSelected && <Check className="w-5 h-5 text-primary ml-auto" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-3">
              <button onClick={handlePrevStep}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                  theme === "dark" ? "bg-border text-white hover:bg-border" : "bg-surface-2 text-muted hover:bg-gray-200"
                }`}>
                <ChevronLeft className="w-5 h-5" />
                {language === "bg" ? "Назад" : "Back"}
              </button>
              <button onClick={handleSubmit} disabled={loading}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-primary to-secondary text-white font-semibold rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    {language === "bg" ? "Започни!" : "Let's Go!"}
                  </>
                )}
              </button>
            </div>

            <button onClick={handleSkipPreferences}
              className={`w-full py-2 text-sm text-muted hover:text-muted`}>
              {language === "bg" ? "Пропусни за сега" : "Skip for now"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}