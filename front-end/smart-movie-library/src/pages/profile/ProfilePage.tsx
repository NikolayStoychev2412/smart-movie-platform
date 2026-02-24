import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import {
  Settings, Film, Check, Heart, Bookmark, MessageSquare, TrendingUp,
} from "lucide-react";
import SectionHeader from "./components/SectionHeader";
import ProfileStatsSection from "./sections/ProfileStatsSection";
import FavoritesSection from "./sections/FavoritesSection";
import ContinueWatchingSection from "./sections/ContinueWatchingSection";
import CompletedSection from "./sections/CompletedSection";
import WatchlistSection from "./sections/WatchlistSection";
import MyReviewsSection from "./sections/MyReviewsSection";
import ProfileSettings from "./sections/ProfileSettings";
import type { ProfileTab, ProfileCounts } from "./types";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { theme, language, user, isAuthenticated, setTheme, setLanguage, t } = useApp();
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");
  const [counts, setCounts] = useState<ProfileCounts>({ favorites: 0, completed: 0, watchlist: 0, watching: 0, reviews: 0 });

  const updateCount = (key: keyof ProfileCounts) => (n: number) => {
    setCounts(prev => ({ ...prev, [key]: n }));
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: "/profile" } });
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated || !user) return null;

  const initial = user.name?.charAt(0).toUpperCase() || "U";

  return (
    <div className={`min-h-screen bg-bg`}>
      {/* Header / Banner */}
      <div className={`bg-surface`}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-10">
          <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-8">
            {/* Avatar + name */}
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-primary flex items-center justify-center">
                <span className="text-3xl md:text-4xl font-bold text-white">{initial}</span>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">{user.name}</h1>
                <p className="text-muted text-sm md:text-base mt-0.5 hidden sm:block">{user.email}</p>
              </div>
            </div>

            {/* Stat pills */}
            <div className="flex gap-3 md:ml-auto flex-wrap">
              <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl ${theme === "dark" ? "bg-white/5 border border-white/10" : "bg-white/10 border border-white/20"}`}>
                <Heart className="w-4 h-4 text-secondary" />
                <span className="text-white font-semibold text-lg">{counts.favorites}</span>
                <span className="text-muted text-sm hidden sm:inline">{t.favoritesLabel}</span>
              </div>
              <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl ${theme === "dark" ? "bg-white/5 border border-white/10" : "bg-white/10 border border-white/20"}`}>
                <Check className="w-4 h-4 text-green-400" />
                <span className="text-white font-semibold text-lg">{counts.completed}</span>
                <span className="text-muted text-sm hidden sm:inline">{t.completedLabel}</span>
              </div>
              <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl ${theme === "dark" ? "bg-white/5 border border-white/10" : "bg-white/10 border border-white/20"}`}>
                <Bookmark className="w-4 h-4 text-blue-400" />
                <span className="text-white font-semibold text-lg">{counts.watchlist}</span>
                <span className="text-muted text-sm hidden sm:inline">{t.toWatch}</span>
              </div>
              <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl ${theme === "dark" ? "bg-white/5 border border-white/10" : "bg-white/10 border border-white/20"}`}>
                <MessageSquare className="w-4 h-4 text-purple-400" />
                <span className="text-white font-semibold text-lg">{counts.reviews}</span>
                <span className="text-muted text-sm hidden sm:inline">{t.tabReviews}</span>
              </div>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 mt-6 p-1 rounded-xl bg-white/5 w-fit">
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all ${
                activeTab === "overview" ? "bg-primary text-white shadow-sm" : "text-muted hover:text-text"
              }`}
            >
              <Film className="w-4 h-4" />
              {t.overviewTab}
            </button>
            <button
              onClick={() => setActiveTab("reviews")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all ${
                activeTab === "reviews" ? "bg-primary text-white shadow-sm" : "text-muted hover:text-text"
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              {t.tabReviews}
              {counts.reviews > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === "reviews" ? "bg-white/20" : "bg-white/10"}`}>
                  {counts.reviews}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all ${
                activeTab === "settings" ? "bg-primary text-white shadow-sm" : "text-muted hover:text-text"
              }`}
            >
              <Settings className="w-4 h-4" />
              {t.settingsLabel}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {activeTab === "overview" && (
          <div className="space-y-10">
            <section>
              <SectionHeader
                icon={TrendingUp} iconColor="bg-primary/10 text-primary"
                label={t.dashboard}
                theme={theme}
              />
              <ProfileStatsSection theme={theme} language={language} />
            </section>

            <ContinueWatchingSection theme={theme} language={language} onCount={updateCount("watching")} />

            <section>
              <SectionHeader
                icon={Heart} iconColor="bg-secondary/10 text-secondary"
                label={t.favoriteMovies}
                count={counts.favorites}
                viewAllTo="/browse" viewAllLabel={t.viewAll}
                theme={theme}
              />
              <FavoritesSection theme={theme} language={language} onCount={updateCount("favorites")} />
            </section>

            <section>
              <SectionHeader
                icon={Check} iconColor="bg-green-500/10 text-green-500"
                label={t.completedMovies}
                count={counts.completed}
                viewAllTo="/watchlist" viewAllLabel={t.viewAll}
                theme={theme}
              />
              <CompletedSection theme={theme} language={language} onCount={updateCount("completed")} />
            </section>

            <section>
              <SectionHeader
                icon={Bookmark} iconColor="bg-blue-500/10 text-blue-500"
                label={t.toWatch}
                count={counts.watchlist}
                viewAllTo="/watchlist" viewAllLabel={t.viewAll}
                theme={theme}
              />
              <WatchlistSection theme={theme} language={language} onCount={updateCount("watchlist")} />
            </section>
          </div>
        )}

        {activeTab === "reviews" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <MessageSquare className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <h2 className={`text-xl font-semibold text-text`}>
                    {t.myReviews}
                  </h2>
                  <p className={`text-sm text-muted`}>
                    {t.allReviewsDesc}
                  </p>
                </div>
              </div>
            </div>
            <MyReviewsSection theme={theme} language={language} onCount={updateCount("reviews")} />
          </div>
        )}

        {activeTab === "settings" && (
          <ProfileSettings
            theme={theme}
            language={language}
            setTheme={setTheme}
            setLanguage={setLanguage}
          />
        )}
      </div>
    </div>
  );
}
