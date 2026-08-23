'use client';

/**
 * Light/dark theme for the (app) surfaces. The class lands on <html> so
 * Radix portals (dialogs, dropdowns, selects render on document.body) pick
 * up the dark tokens too. Persisted in localStorage; `?theme=dark|light`
 * overrides once for shareable previews.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

type Theme = 'light' | 'dark';
const STORAGE_KEY = 'vava-theme';

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: 'light',
  toggle: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Start as 'light' on both server and first client render (hydration-safe);
  // the effect below applies the persisted choice right after mount.
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('theme');
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const initial = fromUrl === 'dark' || fromUrl === 'light' ? fromUrl : stored;
    if (initial === 'dark') setTheme('dark');
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}
