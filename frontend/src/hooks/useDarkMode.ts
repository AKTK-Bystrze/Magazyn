/**
 * useDarkMode Hook
 * 
 * Manages dark/light theme state with localStorage persistence.
 * SSR-safe with proper hydration handling.
 * 
 * @example
 * const { isDark, toggle, setTheme } = useDarkMode();
 * 
 * @module hooks/useDarkMode
 */
import { useState, useCallback, useSyncExternalStore } from 'react';
import { THEME_STORAGE_KEY, THEME, type Theme } from '@/lib/config/nav-config';

interface UseDarkModeReturn {
  /** Whether dark mode is currently active */
  isDark: boolean;
  /** Current theme value */
  theme: Theme;
  /** Toggle between dark and light mode */
  toggle: () => void;
  /** Set a specific theme */
  setTheme: (theme: Theme) => void;
}

/**
 * Gets the current dark mode state from the DOM
 */
function getSnapshot(): boolean {
  return document.documentElement.classList.contains('dark');
}

/**
 * Server snapshot for SSR
 */
function getServerSnapshot(): boolean {
  return true;
}

/**
 * Subscribe to class changes on document element
 */
function subscribe(callback: () => void): () => void {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { 
    attributes: true, 
    attributeFilter: ['class'] 
  });
  return () => observer.disconnect();
}

/**
 * Hook for managing dark/light mode with localStorage persistence
 * 
 * @returns Object with theme state and control functions
 */
export function useDarkMode(): UseDarkModeReturn {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return THEME.SYSTEM;
    return (localStorage.getItem(THEME_STORAGE_KEY) as Theme) || THEME.SYSTEM;
  });

  const isDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const applyTheme = useCallback((newTheme: Theme) => {
    const root = document.documentElement;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    let shouldBeDark: boolean;
    if (newTheme === THEME.DARK) {
      shouldBeDark = true;
    } else if (newTheme === THEME.LIGHT) {
      shouldBeDark = false;
    } else {
      shouldBeDark = prefersDark;
    }

    if (shouldBeDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    setThemeState(newTheme);
    applyTheme(newTheme);
  }, [applyTheme]);

  const toggle = useCallback(() => {
    const newTheme = isDark ? THEME.LIGHT : THEME.DARK;
    setTheme(newTheme);
  }, [isDark, setTheme]);

  return { isDark, theme, toggle, setTheme };
}
