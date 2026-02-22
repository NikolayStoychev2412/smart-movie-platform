import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import api from "../../api/client";
import {
  BarChart3, Users, Film, MessageSquare, ShieldCheck, Activity,
} from "lucide-react";
import DashboardTab from "./tabs/DashboardTab";
import UsersTab from "./tabs/UsersTab";
import MoviesTab from "./tabs/MoviesTab";
import ReviewsTab from "./tabs/ReviewsTab";
import ActivityTab from "./tabs/ActivityTab";
import { headText, mutedText } from "./constants";
import type { Stats, Tab } from "./types";

export default function AdminPage() {
  const { theme, language, user } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Guard: keep all hooks above any early return (Rules of Hooks)
  useEffect(() => {
    // Only redirect once we know for sure the user is not an admin
    if (user !== null && user !== undefined && !user.is_admin) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  // Fetch stats for dashboard tab
  useEffect(() => {
    if (activeTab === "dashboard") {
      setStatsLoading(true);
      api.get("/admin/stats")
        .then(r => { setStats(r.data); setStatsLoading(false); })
        .catch(() => setStatsLoading(false));
    }
  }, [activeTab]);

  // Render nothing while auth is loading or user is not an admin (prevents flash)
  if (!user?.is_admin) return null;

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "dashboard", label: language === "bg" ? "Табло" : "Dashboard",        icon: BarChart3 },
    { id: "users",     label: language === "bg" ? "Потребители" : "Users",      icon: Users },
    { id: "movies",    label: language === "bg" ? "Филми" : "Movies",           icon: Film },
    { id: "reviews",   label: language === "bg" ? "Ревюта" : "Reviews",         icon: MessageSquare },
    { id: "activity",  label: language === "bg" ? "Дневник" : "Activity",       icon: Activity },
  ];

  return (
    <div className={`min-h-screen bg-bg`}>
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2.5 rounded-xl bg-amber-500/20">
            <ShieldCheck className="w-7 h-7 text-amber-400" />
          </div>
          <div>
            <h1 className={`text-2xl font-bold ${headText(theme)}`}>
              {language === "bg" ? "Администрация" : "Admin Panel"}
            </h1>
            <p className={`text-sm ${mutedText(theme)}`}>
              {language === "bg" ? "Управление на приложението" : "Manage your application"}
            </p>
          </div>
        </div>

        {/* Tab bar */}
        <div className={`flex gap-1 p-1 rounded-xl mb-8 overflow-x-auto bg-surface-2`}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-primary text-white shadow-sm"
                  : theme === "dark"
                    ? "text-muted hover:text-text hover:bg-border"
                    : "text-muted hover:text-text hover:bg-white"
              }`}>
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "dashboard" && <DashboardTab stats={stats} loading={statsLoading} />}
        {activeTab === "users"     && <UsersTab />}
        {activeTab === "movies"    && <MoviesTab />}
        {activeTab === "reviews"   && <ReviewsTab />}
        {activeTab === "activity"  && <ActivityTab />}
      </div>
    </div>
  );
}
