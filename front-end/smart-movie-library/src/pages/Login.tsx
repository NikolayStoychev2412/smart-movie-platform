import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { authApi } from "../api/auth";
import { Mail, Lock, Eye, EyeOff, LogIn, AlertCircle } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, language, setUser } = useApp();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get redirect path from location state
  const from = (location.state as { from?: string })?.from || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError(language === "bg" ? "Моля, попълнете всички полета" : "Please fill in all fields");
      return;
    }

    setLoading(true);

    try {
      // authApi.login now:
      // 1. Sends form-urlencoded to /auth/login
      // 2. Gets access_token
      // 3. Calls /auth/me to get user
      // 4. Returns { token, user }
      const { token, user } = await authApi.login(email, password);
      
      // Token is already saved by authApi.login
      // Save user to localStorage and context
      localStorage.setItem("user", JSON.stringify(user));
      setUser(user);
      
      // Redirect to original destination or home
      navigate(from, { replace: true });
    } catch (err) {
      setError(
        err instanceof Error 
          ? err.message 
          : language === "bg" 
            ? "Грешка при вход" 
            : "Login failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 py-12 ${
      theme === "dark" ? "bg-[#0B0B12]" : "bg-[#F8F9FC]"
    }`}>
      <div className={`w-full max-w-md ${
        theme === "dark" ? "bg-[#1A1A33]" : "bg-white shadow-md border border-[#E2E4F0]"
      } rounded-2xl p-8`}>
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#A78BFA] to-[#2DD4BF] flex items-center justify-center">
            <LogIn className="w-8 h-8 text-white" />
          </div>
          <h1 className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-[#121225]"}`}>
            {language === "bg" ? "Добре дошли" : "Welcome Back"}
          </h1>
          <p className={`mt-2 ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#4B4B6A]"}`}>
            {language === "bg" ? "Влезте в акаунта си" : "Sign in to your account"}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              theme === "dark" ? "text-[#A7A7C7]" : "text-[#4B4B6A]"
            }`}>
              {language === "bg" ? "Имейл" : "Email"}
            </label>
            <div className="relative">
              <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
                theme === "dark" ? "text-[#A7A7C7]" : "text-[#4B4B6A]"
              }`} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className={`w-full pl-11 pr-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary ${
                  theme === "dark"
                    ? "bg-[#2A2A4A] border-[#2A2A4A] text-white"
                    : "bg-[#F8F9FC] border-[#E2E4F0] text-[#121225]"
                }`}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              theme === "dark" ? "text-[#A7A7C7]" : "text-[#4B4B6A]"
            }`}>
              {language === "bg" ? "Парола" : "Password"}
            </label>
            <div className="relative">
              <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
                theme === "dark" ? "text-[#A7A7C7]" : "text-[#4B4B6A]"
              }`} />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className={`w-full pl-11 pr-12 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary ${
                  theme === "dark"
                    ? "bg-[#2A2A4A] border-[#2A2A4A] text-white"
                    : "bg-[#F8F9FC] border-[#E2E4F0] text-[#121225]"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute right-3 top-0 bottom-0 flex items-center ${
                  theme === "dark" ? "text-[#A7A7C7] hover:text-[#A7A7C7]" : "text-[#4B4B6A] hover:text-[#4B4B6A]"
                }`}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                {language === "bg" ? "Вход" : "Sign In"}
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-4">
          <div className={`flex-1 h-px ${theme === "dark" ? "bg-[#2A2A4A]" : "bg-gray-200"}`} />
          <span className={`text-sm ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#4B4B6A]"}`}>
            {language === "bg" ? "или" : "or"}
          </span>
          <div className={`flex-1 h-px ${theme === "dark" ? "bg-[#2A2A4A]" : "bg-gray-200"}`} />
        </div>

        {/* Sign Up Link */}
        <p className={`text-center ${theme === "dark" ? "text-[#A7A7C7]" : "text-[#4B4B6A]"}`}>
          {language === "bg" ? "Нямате акаунт?" : "Don't have an account?"}{" "}
          <Link to="/register" className="text-primary font-semibold hover:underline">
            {language === "bg" ? "Регистрация" : "Sign Up"}
          </Link>
        </p>
      </div>
    </div>
  );
}