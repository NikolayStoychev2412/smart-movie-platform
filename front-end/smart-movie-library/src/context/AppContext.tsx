/* eslint-disable react-refresh/only-export-components */
// src/context/AppContext.tsx
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { translations, type Language, type Translations } from '../i18n/translations';
import { API_BASE } from '../api/client';

type Theme = 'light' | 'dark';

// User type matching backend UserResponse
export interface User {
  id: number;
  name: string;
  email: string;
  is_admin: boolean;
}

interface AppContextType {
  // Language
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
  
  // Theme
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  
  // Auth
  user: User | null;
  setUser: (user: User | null) => void;
  isAuthenticated: boolean;
  logout: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  // Language state
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language') as Language;
    return saved || 'bg';
  });

  // Theme state
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme') as Theme;
    return saved || 'dark';
  });

  // User state - load from localStorage on init
  const [user, setUserState] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Language setter
  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  // Theme setter
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  // User setter - also persists to localStorage
  const setUser = (newUser: User | null) => {
    setUserState(newUser);
    if (newUser) {
      localStorage.setItem('user', JSON.stringify(newUser));
    } else {
      localStorage.removeItem('user');
    }
  };

  // Logout function - clears both user and token
  const logout = () => {
    setUserState(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  // Check if authenticated (both user and token must exist)
  const isAuthenticated = !!user && !!localStorage.getItem('token');

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }, [theme]);

  // Validate token on app startup — if expired/invalid, clear everything
  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      // No token at all — make sure user state is clean
      if (user) {
        setUserState(null);
        localStorage.removeItem('user');
      }
      return;
    }

    // Token exists — verify it's still valid with the backend
    fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        if (res.status === 401 || res.status === 403) {
          // Token is invalid/expired — clear auth state
          setUserState(null);
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          return null;
        }
        if (!res.ok) return null; // Server error — keep current session
        return res.json();
      })
      .then((freshUser: User | null) => {
        if (freshUser) {
          setUserState(freshUser);
          localStorage.setItem('user', JSON.stringify(freshUser));
        }
      })
      .catch(() => {
        // Network error — server unreachable, keep current session
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount only

  const t = translations[language];

  return (
    <AppContext.Provider value={{ 
      language, 
      setLanguage, 
      t, 
      theme, 
      setTheme, 
      toggleTheme,
      user,
      setUser,
      isAuthenticated,
      logout,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}