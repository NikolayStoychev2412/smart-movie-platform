import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import api from "../api/client";
import type { WatchlistEntry, Recommendation, Movie } from "../types";
import {
  User, Settings, Sparkles, Film, Check,
  Star, AlertCircle, Loader2, Eye, EyeOff,
  TrendingUp, ArrowRight, ChevronRight
} from "lucide-react";

type ProfileTab = 'foryou' | 'settings';

// Simple Movie Card for recommendations
function MovieCard({ 
  movie, 
  theme, 
  language, 
  onClick,
  recommendation
}: { 
  movie: Movie; 
  theme: string; 
  language: string;
  onClick: () => void;
  recommendation?: Recommendation;
}) {
  const title = language === "bg" ? movie.title_bg || movie.title : movie.title;
  const posterUrl = movie.poster_url || (movie.poster_path ? `https://image.tmdb.org/t/p/w342${movie.poster_path}` : null);
  
  // Get the reason text - prefer Bulgarian if available
  const getReason = () => {
    if (!recommendation?.explanation) return null;
    
    const { reasons, reasons_bg } = recommendation.explanation;
    
    // Try Bulgarian first if language is bg
    if (language === "bg" && reasons_bg && reasons_bg.length > 0) {
      return reasons_bg[0];
    }
    
    // Fall back to English reasons
    if (reasons && reasons.length > 0) {
      return reasons[0];
    }
    
    return null;
  };

  const reason = getReason();
  
  return (
    <div 
      onClick={onClick}
      className={`group cursor-pointer rounded-xl overflow-hidden shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl ${
        theme === "dark" ? "bg-gray-900" : "bg-white border border-gray-200"
      }`}
    >
      <div className="relative aspect-[2/3]">
        {posterUrl ? (
          <img src={posterUrl} alt={title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className={`w-full h-full flex items-center justify-center ${theme === "dark" ? "bg-gray-800" : "bg-gray-200"}`}>
            <Film className="w-12 h-12 text-gray-500" />
          </div>
        )}
        
        {movie.average_rating && (
          <div className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-black/70 backdrop-blur-sm flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
            <span className="text-white text-sm font-medium">{movie.average_rating.toFixed(1)}</span>
          </div>
        )}

        {recommendation && (
          <div className="absolute bottom-2 left-2 px-2 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-medium">
            {Math.round(recommendation.score * 100)}% Match
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      <div className="p-3">
        <h3 className={`font-semibold text-sm line-clamp-1 group-hover:text-tmdb-light-blue transition-colors ${
          theme === "dark" ? "text-white" : "text-gray-900"
        }`}>
          {title}
        </h3>
        
        {reason && (
          <p className={`text-xs mt-1 line-clamp-2 ${theme === "dark" ? "text-purple-400" : "text-purple-600"}`}>
            {reason}
          </p>
        )}
      </div>
    </div>
  );
}

// Completed Movies Sample Section
function CompletedSection({ theme, language }: { theme: string; language: string }) {
  const navigate = useNavigate();
  const [completed, setCompleted] = useState<WatchlistEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompleted();
  }, []);

  const loadCompleted = async () => {
    setLoading(true);
    try {
      const response = await api.get('/watchlist/', { params: { status: 'completed' } });
      setCompleted(response.data.slice(0, 5)); // Only show first 5
    } catch (err) {
      console.error("Failed to load completed:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className={`w-6 h-6 animate-spin ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`} />
      </div>
    );
  }

  if (completed.length === 0) {
    return (
      <div className={`text-center py-8 rounded-xl ${theme === "dark" ? "bg-gray-900/50" : "bg-gray-100"}`}>
        <Check className={`w-10 h-10 mx-auto mb-2 ${theme === "dark" ? "text-gray-700" : "text-gray-400"}`} />
        <p className={`text-sm ${theme === "dark" ? "text-gray-500" : "text-gray-500"}`}>
          {language === "bg" ? "Няма завършени филми" : "No completed movies yet"}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {completed.map((entry) => {
        const movie = entry.movie;
        if (!movie) return null;
        
        const title = language === "bg" ? movie.title_bg || movie.title : movie.title;
        const posterUrl = movie.poster_url || (movie.poster_path ? `https://image.tmdb.org/t/p/w342${movie.poster_path}` : null);
        
        return (
          <div 
            key={entry.id}
            onClick={() => navigate(`/movie/${entry.movie_id}`)}
            className={`group cursor-pointer rounded-xl overflow-hidden shadow-lg transition-all hover:scale-[1.02] ${
              theme === "dark" ? "bg-gray-900" : "bg-white border border-gray-200"
            }`}
          >
            <div className="relative aspect-[2/3]">
              {posterUrl ? (
                <img src={posterUrl} alt={title} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className={`w-full h-full flex items-center justify-center ${theme === "dark" ? "bg-gray-800" : "bg-gray-200"}`}>
                  <Film className="w-10 h-10 text-gray-500" />
                </div>
              )}
              
              {/* Completed badge */}
              <div className="absolute top-2 right-2 p-1.5 rounded-full bg-green-500">
                <Check className="w-3 h-3 text-white" />
              </div>

              {movie.average_rating && (
                <div className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-black/70 flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                  <span className="text-white text-xs font-medium">{movie.average_rating.toFixed(1)}</span>
                </div>
              )}
            </div>

            <div className="p-2">
              <h3 className={`font-medium text-sm line-clamp-1 group-hover:text-tmdb-light-blue ${
                theme === "dark" ? "text-white" : "text-gray-900"
              }`}>
                {title}
              </h3>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// For You Section
function ForYouSection({ theme, language }: { theme: string; language: string }) {
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/ai/recommend/for-me', { params: { top_k: 10 } });
      console.log('[ForYou] Recommendations:', response.data);
      // Log first recommendation's explanation to debug
      if (response.data?.[0]?.explanation) {
        console.log('[ForYou] First recommendation explanation:', response.data[0].explanation);
      }
      setRecommendations(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className={`w-8 h-8 animate-spin mx-auto mb-3 ${theme === "dark" ? "text-purple-400" : "text-purple-500"}`} />
          <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
            {language === "bg" ? "Анализираме вкуса ти..." : "Analyzing your taste..."}
          </p>
        </div>
      </div>
    );
  }

  if (error || recommendations.length === 0) {
    return (
      <div className={`text-center py-12 rounded-xl ${theme === "dark" ? "bg-gray-900/50" : "bg-gray-100"}`}>
        <Sparkles className={`w-12 h-12 mx-auto mb-3 ${theme === "dark" ? "text-gray-700" : "text-gray-400"}`} />
        <p className={`${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
          {language === "bg" 
            ? "Добави филми в списъка си за персонализирани препоръки" 
            : "Add movies to your watchlist to get personalized recommendations"}
        </p>
        <button
          onClick={() => navigate("/browse")}
          className="mt-4 px-4 py-2 bg-tmdb-light-blue text-tmdb-dark-blue text-sm font-medium rounded-lg hover:bg-tmdb-light-blue/90"
        >
          {language === "bg" ? "Разгледай филми" : "Browse Movies"}
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {recommendations.map((rec, index) => (
        <MovieCard
          key={rec.movie.id || index}
          movie={rec.movie}
          theme={theme}
          language={language}
          recommendation={rec}
          onClick={() => navigate(`/movie/${rec.movie.id}`)}
        />
      ))}
    </div>
  );
}

// Profile Settings
function ProfileSettings({ theme, language, user }: { theme: string; language: string; user: any }) {
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSaveProfile = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await api.patch('/auth/me', { name, email });
      setMessage({ type: 'success', text: language === "bg" ? "Профилът е обновен" : "Profile updated" });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.detail || "Failed to update" });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) return;
    setSaving(true);
    setMessage(null);
    try {
      await api.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setMessage({ type: 'success', text: language === "bg" ? "Паролата е сменена" : "Password changed" });
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.detail || "Failed to change password" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' 
            ? "bg-green-500/10 border border-green-500/20 text-green-500"
            : "bg-red-500/10 border border-red-500/20 text-red-500"
        }`}>
          {message.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      {/* Profile Info */}
      <div className={`rounded-xl p-6 ${theme === "dark" ? "bg-gray-900" : "bg-white border border-gray-200"}`}>
        <h3 className={`text-lg font-semibold mb-4 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
          {language === "bg" ? "Профилна информация" : "Profile Information"}
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
              {language === "bg" ? "Име" : "Name"}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-tmdb-light-blue ${
                theme === "dark" ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-300 text-gray-900"
              }`}
            />
          </div>
          
          <div>
            <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
              {language === "bg" ? "Имейл" : "Email"}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-tmdb-light-blue ${
                theme === "dark" ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-300 text-gray-900"
              }`}
            />
          </div>

          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="px-6 py-2.5 bg-tmdb-light-blue text-tmdb-dark-blue font-semibold rounded-lg hover:bg-tmdb-light-blue/90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : (language === "bg" ? "Запази" : "Save Changes")}
          </button>
        </div>
      </div>

      {/* Change Password */}
      <div className={`rounded-xl p-6 ${theme === "dark" ? "bg-gray-900" : "bg-white border border-gray-200"}`}>
        <h3 className={`text-lg font-semibold mb-4 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
          {language === "bg" ? "Смяна на парола" : "Change Password"}
        </h3>
        
        <div className="space-y-4">
          <div className="relative">
            <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
              {language === "bg" ? "Текуща парола" : "Current Password"}
            </label>
            <input
              type={showCurrentPassword ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={`w-full px-4 py-3 pr-12 rounded-lg border focus:outline-none focus:ring-2 focus:ring-tmdb-light-blue ${
                theme === "dark" ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-300 text-gray-900"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className={`absolute right-3 top-[38px] ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}
            >
              {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          
          <div className="relative">
            <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
              {language === "bg" ? "Нова парола" : "New Password"}
            </label>
            <input
              type={showNewPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={`w-full px-4 py-3 pr-12 rounded-lg border focus:outline-none focus:ring-2 focus:ring-tmdb-light-blue ${
                theme === "dark" ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-300 text-gray-900"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className={`absolute right-3 top-[38px] ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}
            >
              {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <button
            onClick={handleChangePassword}
            disabled={saving || !currentPassword || !newPassword}
            className="px-6 py-2.5 bg-tmdb-light-blue text-tmdb-dark-blue font-semibold rounded-lg hover:bg-tmdb-light-blue/90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : (language === "bg" ? "Смени паролата" : "Change Password")}
          </button>
        </div>
      </div>
    </div>
  );
}

// Main Profile Page
export default function Profile() {
  const navigate = useNavigate();
  const { theme, language, user, isAuthenticated } = useApp();
  const [activeTab, setActiveTab] = useState<ProfileTab>('foryou');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: "/profile" } });
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className={`min-h-screen ${theme === "dark" ? "bg-tmdb-dark" : "bg-gray-50"}`}>
      {/* Header */}
      <div className={`border-b ${theme === "dark" ? "bg-gray-900/50 border-gray-800" : "bg-white border-gray-200"}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-tmdb-light-green to-tmdb-light-blue flex items-center justify-center">
              <span className="text-2xl font-bold text-tmdb-dark-blue">
                {user.name?.charAt(0).toUpperCase() || "U"}
              </span>
            </div>
            <div>
              <h1 className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                {user.name}
              </h1>
              <p className={theme === "dark" ? "text-gray-400" : "text-gray-500"}>
                {user.email}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-6">
            <button
              onClick={() => setActiveTab('foryou')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                activeTab === 'foryou'
                  ? "bg-tmdb-light-blue text-tmdb-dark-blue"
                  : theme === "dark"
                  ? "text-gray-400 hover:text-white hover:bg-white/10"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              {language === "bg" ? "За теб" : "For You"}
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                activeTab === 'settings'
                  ? "bg-tmdb-light-blue text-tmdb-dark-blue"
                  : theme === "dark"
                  ? "text-gray-400 hover:text-white hover:bg-white/10"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <Settings className="w-4 h-4" />
              {language === "bg" ? "Настройки" : "Settings"}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {activeTab === 'foryou' && (
          <div className="space-y-10">
            {/* For You Recommendations */}
            <section>
              <div className={`flex items-center gap-3 mb-6 p-4 rounded-xl ${
                theme === "dark" 
                  ? "bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/20" 
                  : "bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200"
              }`}>
                <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className={`font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                    {language === "bg" ? "Препоръчано за теб" : "Recommended for You"}
                  </h2>
                  <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                    {language === "bg" 
                      ? "Базирано на твоите оценки и списък" 
                      : "Based on your ratings and watchlist"}
                  </p>
                </div>
              </div>
              
              <ForYouSection theme={theme} language={language} />
            </section>

            {/* Completed Movies Sample */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-green-500/10">
                    <Check className="w-5 h-5 text-green-500" />
                  </div>
                  <h2 className={`text-lg font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                    {language === "bg" ? "Изгледани филми" : "Completed Movies"}
                  </h2>
                </div>
                
                <Link 
                  to="/watchlist"
                  className={`flex items-center gap-1 text-sm font-medium transition-colors ${
                    theme === "dark" 
                      ? "text-tmdb-light-blue hover:text-tmdb-light-blue/80" 
                      : "text-tmdb-light-blue hover:text-tmdb-light-blue/80"
                  }`}
                >
                  {language === "bg" ? "Виж всички" : "View All"}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              
              <CompletedSection theme={theme} language={language} />
            </section>
          </div>
        )}

        {activeTab === 'settings' && (
          <ProfileSettings theme={theme} language={language} user={user} />
        )}
      </div>
    </div>
  );
}