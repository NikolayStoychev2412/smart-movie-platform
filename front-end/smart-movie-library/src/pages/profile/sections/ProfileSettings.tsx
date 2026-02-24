import { useState, useEffect } from "react";
import api from "../../../api/client";
import type { ApiError } from "../../../types";
import { GENRES, MOODS } from "../../../constants/preferences";
import { translations } from "../../../i18n/translations";
import {
  Sun, Moon, Globe, Shield, AlertTriangle, Loader2,
  SlidersHorizontal, Palette, Lock, Database, Eye, EyeOff,
} from "lucide-react";

// ── Password strength indicator ──────────────────────────────────────────────

function PasswordStrength({ password, language }: { password: string; language: string }) {
  if (!password) return null;

  const t = translations[language as "bg" | "en"];

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const levels = [
    { label: t.strengthWeak,      color: "bg-red-500",    width: "w-1/5" },
    { label: t.strengthWeak,      color: "bg-red-500",    width: "w-1/5" },
    { label: t.strengthFair,      color: "bg-yellow-500", width: "w-2/5" },
    { label: t.strengthGood,      color: "bg-blue-500",   width: "w-3/5" },
    { label: t.strengthStrong,    color: "bg-green-500",  width: "w-4/5" },
    { label: t.strengthExcellent, color: "bg-green-400",  width: "w-full" },
  ];

  const level = levels[Math.min(score, 5)];

  return (
    <div className="mt-2 space-y-1">
      <div className="h-1.5 rounded-full bg-gray-700 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-300 ${level.color} ${level.width}`} />
      </div>
      <p className={`text-xs ${level.color.replace("bg-", "text-")}`}>{level.label}</p>
    </div>
  );
}

// ── ProfileSettings ───────────────────────────────────────────────────────────

export default function ProfileSettings({
  theme,
  language,
  setTheme,
  setLanguage,
}: {
  theme: string;
  language: string;
  setTheme: (t: "dark" | "light") => void;
  setLanguage: (l: "en" | "bg") => void;
}) {
  const t = translations[language as "bg" | "en"];

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsMessage, setPrefsMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    api.get("/users/preferences")
      .then((res) => {
        setSelectedGenres(res.data.preferred_genres || []);
        setSelectedMood(res.data.preferred_mood || null);
      })
      .catch(() => {});
  }, []);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) return;
    setSavingPassword(true);
    setPasswordMessage(null);
    try {
      await api.put("/users/me/password", { current_password: currentPassword, new_password: newPassword });
      setPasswordMessage({ type: "success", text: t.passwordChangedSuccess });
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setPasswordMessage({ type: "error", text: (err as ApiError).response?.data?.detail || t.passwordChangeFailed });
    } finally {
      setSavingPassword(false);
    }
  };

  const toggleGenre = (genreId: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genreId)
        ? prev.filter((g) => g !== genreId)
        : prev.length < 5 ? [...prev, genreId] : prev
    );
  };

  const handleSavePreferences = async () => {
    setSavingPrefs(true);
    setPrefsMessage(null);
    try {
      await api.post("/users/preferences", { preferred_genres: selectedGenres, preferred_mood: selectedMood });
      setPrefsMessage({ type: "success", text: t.preferencesSaved });
    } catch {
      setPrefsMessage({ type: "error", text: t.prefsSaveFailed });
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleDeleteAccount = () => {
    if (confirm(t.deleteAccountConfirm)) {
      // Future: implement delete account API
      alert(t.featureComingSoon);
    }
  };

  const cardClass = `rounded-xl p-6 ${theme === "dark" ? "bg-surface-2/80 border border-border" : "bg-white border border-border shadow-sm"}`;
  const labelClass = `block text-sm font-medium mb-2 text-muted`;
  const headingClass = `text-lg font-semibold mb-4 flex items-center gap-2 text-text`;

  return (
    <div className="max-w-2xl space-y-6">
      {/* Preferences */}
      <div className={cardClass}>
        <h3 className={headingClass}>
          <SlidersHorizontal className="w-5 h-5 text-primary" />
          {t.preferencesSection}
        </h3>

        <div className="mb-6">
          <label className={labelClass}>
            {t.preferredGenres}
            <span className={`ml-2 text-xs font-normal text-muted`}>
              ({selectedGenres.length}/5)
            </span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {GENRES.map((genre) => (
              <button
                key={genre.id}
                onClick={() => toggleGenre(genre.id)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  selectedGenres.includes(genre.id)
                    ? "bg-primary text-white"
                    : theme === "dark" ? "bg-border text-muted hover:bg-[#3A3A5A]" : "bg-gray-100 text-muted hover:bg-gray-200"
                }`}
              >
                {genre.emoji} {language === "bg" ? genre.bg : genre.en}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className={labelClass}>
            {t.preferredMood}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {MOODS.map((mood) => (
              <button
                key={mood.id}
                onClick={() => setSelectedMood(selectedMood === mood.id ? null : mood.id)}
                className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  selectedMood === mood.id
                    ? "bg-secondary text-white"
                    : theme === "dark" ? "bg-border text-muted hover:bg-[#3A3A5A]" : "bg-gray-100 text-muted hover:bg-gray-200"
                }`}
              >
                {language === "bg" ? mood.bg : mood.en}
              </button>
            ))}
          </div>
        </div>

        {prefsMessage && (
          <div className={`p-3 rounded-lg mb-4 ${prefsMessage.type === "success" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
            {prefsMessage.text}
          </div>
        )}

        <button
          onClick={handleSavePreferences}
          disabled={savingPrefs}
          className="px-6 py-2.5 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
        >
          {savingPrefs && <Loader2 className="w-4 h-4 animate-spin" />}
          {t.savePreferences}
        </button>
      </div>

      {/* Appearance */}
      <div className={cardClass}>
        <h3 className={headingClass}>
          <Palette className="w-5 h-5 text-purple-500" />
          {t.appearance}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>{t.themeLabel}</label>
            <div className="flex gap-2">
              <button
                onClick={() => setTheme("light")}
                className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  theme === "light" ? "bg-primary text-white" : theme === "dark" ? "bg-border text-muted" : "bg-gray-100 text-muted"
                }`}
              >
                <Sun className="w-4 h-4" />
                {t.lightTheme}
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  theme === "dark" ? "bg-primary text-white" : "bg-gray-100 text-muted"
                }`}
              >
                <Moon className="w-4 h-4" />
                {t.darkTheme}
              </button>
            </div>
          </div>

          <div>
            <label className={labelClass}>{t.languageLabel}</label>
            <div className="flex gap-2">
              <button
                onClick={() => setLanguage("en")}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  language === "en" ? "bg-primary text-white" : theme === "dark" ? "bg-border text-muted" : "bg-gray-100 text-muted"
                }`}
              >
                <Globe className="w-4 h-4" />
                English
              </button>
              <button
                onClick={() => setLanguage("bg")}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  language === "bg" ? "bg-primary text-white" : theme === "dark" ? "bg-border text-muted" : "bg-gray-100 text-muted"
                }`}
              >
                <Globe className="w-4 h-4" />
                Български
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Security */}
      <div className={cardClass}>
        <h3 className={headingClass}>
          <Shield className="w-5 h-5 text-green-500" />
          {t.security}
        </h3>

        <div>
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-4 h-4 text-muted" />
            <h4 className={`font-medium text-text`}>
              {t.changePassword}
            </h4>
          </div>

          {passwordMessage && (
            <div className={`p-3 rounded-lg mb-4 ${passwordMessage.type === "success" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
              {passwordMessage.text}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={t.currentPasswordPlaceholder}
                className={`w-full px-4 py-2.5 pr-10 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary ${
                  theme === "dark" ? "bg-border border-border text-white placeholder-[#5B5D78]" : "bg-bg border-border text-text placeholder-[#A7A7C7]"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 text-muted`}
              >
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t.newPasswordPlaceholder}
                className={`w-full px-4 py-2.5 pr-10 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary ${
                  theme === "dark" ? "bg-border border-border text-white placeholder-[#5B5D78]" : "bg-bg border-border text-text placeholder-[#A7A7C7]"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 text-muted`}
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {newPassword && <PasswordStrength password={newPassword} language={language} />}
          <button
            onClick={handleChangePassword}
            disabled={savingPassword || !currentPassword || !newPassword}
            className="mt-4 px-5 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
          >
            {savingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
            {t.changePasswordBtn}
          </button>
        </div>
      </div>

      {/* Data */}
      <div className={cardClass}>
        <h3 className={headingClass}>
          <Database className="w-5 h-5 text-orange-500" />
          {t.dataSection}
        </h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="font-medium text-red-500">
                  {t.deleteAccount}
                </p>
                <p className={`text-xs text-muted`}>
                  {t.irreversibleAction}
                </p>
              </div>
            </div>
            <button
              onClick={handleDeleteAccount}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500/10 text-red-500 hover:bg-red-500/20"
            >
              {t.deleteBtn}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
