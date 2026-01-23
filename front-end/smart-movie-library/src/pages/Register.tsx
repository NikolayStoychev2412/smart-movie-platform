import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { authApi } from "../api/auth";
import { Mail, Lock, Eye, EyeOff, UserPlus, AlertCircle, User, Check } from "lucide-react";

export default function Register() {
  const navigate = useNavigate();
  const { theme, language, setUser } = useApp();
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password strength checks
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name || !email || !password || !confirmPassword) {
      setError(language === "bg" ? "Моля, попълнете всички полета" : "Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      setError(language === "bg" ? "Паролите не съвпадат" : "Passwords do not match");
      return;
    }

    if (passwordStrength < 3) {
      setError(language === "bg" ? "Моля, използвайте по-силна парола" : "Please use a stronger password");
      return;
    }

    setLoading(true);

    try {
      const { user } = await authApi.register(name, email, password);
      localStorage.setItem("user", JSON.stringify(user));
      setUser(user);
      navigate("/", { replace: true });
    } catch (err) {
      console.error("[Register] Error:", err);
      setError(err instanceof Error ? err.message : language === "bg" ? "Грешка при регистрация" : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 py-12 ${theme === "dark" ? "bg-tmdb-dark" : "bg-gray-50"}`}>
      <div className={`w-full max-w-md ${theme === "dark" ? "bg-gray-900" : "bg-white shadow-lg"} rounded-2xl p-8`}>
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-tmdb-light-green to-tmdb-light-blue flex items-center justify-center">
            <UserPlus className="w-8 h-8 text-tmdb-dark-blue" />
          </div>
          <h1 className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
            {language === "bg" ? "Създайте акаунт" : "Create Account"}
          </h1>
          <p className={`mt-2 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
            {language === "bg" ? "Присъединете се към нас" : "Join us today"}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
              {language === "bg" ? "Име" : "Name"}
            </label>
            <div className="relative">
              <User className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`} />
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                className={`w-full pl-11 pr-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-tmdb-light-blue ${
                  theme === "dark" ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-300 text-gray-900"
                }`} />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
              {language === "bg" ? "Имейл" : "Email"}
            </label>
            <div className="relative">
              <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`} />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className={`w-full pl-11 pr-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-tmdb-light-blue ${
                  theme === "dark" ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-300 text-gray-900"
                }`} />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
              {language === "bg" ? "Парола" : "Password"}
            </label>
            <div className="relative">
              <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`} />
              <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className={`w-full pl-11 pr-12 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-tmdb-light-blue ${
                  theme === "dark" ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-300 text-gray-900"
                }`} />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className={`absolute right-3 top-0 bottom-0 flex items-center ${theme === "dark" ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"}`}>
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {password && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                    {language === "bg" ? "Сила:" : "Strength:"}
                  </span>
                  <span className={`text-xs font-medium ${
                    passwordStrength <= 1 ? "text-red-500" : passwordStrength === 2 ? "text-yellow-500" : passwordStrength === 3 ? "text-blue-500" : "text-green-500"
                  }`}>{getStrengthLabel()}</span>
                </div>
                <div className={`h-1.5 rounded-full overflow-hidden ${theme === "dark" ? "bg-gray-700" : "bg-gray-200"}`}>
                  <div className={`h-full transition-all duration-300 ${getStrengthColor()}`} style={{ width: `${(passwordStrength / 4) * 100}%` }} />
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1">
                  {[
                    { check: passwordChecks.length, label: language === "bg" ? "8+ символа" : "8+ chars" },
                    { check: passwordChecks.uppercase, label: language === "bg" ? "Главна" : "Uppercase" },
                    { check: passwordChecks.lowercase, label: language === "bg" ? "Малка" : "Lowercase" },
                    { check: passwordChecks.number, label: language === "bg" ? "Число" : "Number" },
                  ].map(({ check, label }, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${check ? "bg-green-500" : theme === "dark" ? "bg-gray-700" : "bg-gray-300"}`}>
                        {check && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <span className={`text-xs ${check ? "text-green-500" : theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
              {language === "bg" ? "Потвърдете паролата" : "Confirm Password"}
            </label>
            <div className="relative">
              <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`} />
              <input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                className={`w-full pl-11 pr-12 py-3 rounded-lg border focus:outline-none focus:ring-2 ${
                  confirmPassword && !passwordsMatch ? "border-red-500 focus:ring-red-500" : "focus:ring-tmdb-light-blue"
                } ${theme === "dark" ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-300 text-gray-900"}`} />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className={`absolute right-3 top-0 bottom-0 flex items-center ${theme === "dark" ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"}`}>
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {confirmPassword && !passwordsMatch && (
              <p className="mt-2 text-sm text-red-500">{language === "bg" ? "Паролите не съвпадат" : "Passwords do not match"}</p>
            )}
          </div>

          <button type="submit" disabled={loading || !passwordsMatch || passwordStrength < 3}
            className="w-full py-3 px-4 bg-tmdb-light-blue text-tmdb-dark-blue font-semibold rounded-lg hover:bg-tmdb-light-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {loading ? <div className="w-5 h-5 border-2 border-tmdb-dark-blue/30 border-t-tmdb-dark-blue rounded-full animate-spin" /> : (
              <><UserPlus className="w-5 h-5" />{language === "bg" ? "Регистрация" : "Sign Up"}</>
            )}
          </button>
        </form>

        <div className="my-6 flex items-center gap-4">
          <div className={`flex-1 h-px ${theme === "dark" ? "bg-gray-800" : "bg-gray-200"}`} />
          <span className={`text-sm ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>{language === "bg" ? "или" : "or"}</span>
          <div className={`flex-1 h-px ${theme === "dark" ? "bg-gray-800" : "bg-gray-200"}`} />
        </div>

        <p className={`text-center ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
          {language === "bg" ? "Вече имате акаунт?" : "Already have an account?"}{" "}
          <Link to="/login" className="text-tmdb-light-blue font-semibold hover:underline">
            {language === "bg" ? "Вход" : "Sign In"}
          </Link>
        </p>
      </div>
    </div>
  );
}