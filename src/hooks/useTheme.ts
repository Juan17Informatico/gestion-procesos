import { useEffect, useState } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'gestion-procesos-theme';
const themePreferences = new Set<ThemePreference>(['light', 'dark', 'system']);

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readThemePreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system';

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return themePreferences.has(stored as ThemePreference) ? (stored as ThemePreference) : 'system';
  } catch {
    return 'system';
  }
}

export function useTheme() {
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>(readThemePreference);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);
  const resolvedTheme = themePreference === 'system' ? systemTheme : themePreference;

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    function handleSystemThemeChange(event: MediaQueryListEvent): void {
      setSystemTheme(event.matches ? 'dark' : 'light');
    }

    setSystemTheme(mediaQuery.matches ? 'dark' : 'light');
    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = resolvedTheme;
    root.dataset.themePreference = themePreference;
    root.style.colorScheme = resolvedTheme;

    try {
      window.localStorage.setItem(STORAGE_KEY, themePreference);
    } catch {
      // The selected theme still works for the current session.
    }
  }, [resolvedTheme, themePreference]);

  return { themePreference, resolvedTheme, setThemePreference: setThemePreferenceState };
}
