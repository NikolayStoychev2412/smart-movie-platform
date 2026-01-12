// src/components/LanguageToggle.tsx
import { useApp } from '../context/AppContext';

export default function LanguageToggle() {
  const { language, setLanguage } = useApp();

  const toggleLanguage = () => {
    setLanguage(language === 'bg' ? 'en' : 'bg');
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
    >
      {language === 'bg' ? (
        <>
          <span>🇧🇬</span>
          <span className="text-gray-700 dark:text-gray-300">BG</span>
        </>
      ) : (
        <>
          <span>🇬🇧</span>
          <span className="text-gray-700 dark:text-gray-300">EN</span>
        </>
      )}
    </button>
  );
}