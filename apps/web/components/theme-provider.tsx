'use client';
import { createContext, useContext, useEffect, useState } from 'react';
type Theme = 'light' | 'dark';
const ThemeContext = createContext<{ resolved: Theme; setTheme: (theme: Theme) => void }>({
  resolved: 'light',
  setTheme: () => {},
});
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [resolved, update] = useState<Theme>('light');
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem('humanette-theme');
    } catch {}
    const value =
      saved === 'light' || saved === 'dark'
        ? saved
        : matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
    document.documentElement.dataset.theme = value;
    update(value);
    try {
      localStorage.setItem('humanette-theme', value);
    } catch {}
  }, []);
  function setTheme(value: Theme) {
    update(value);
    document.documentElement.dataset.theme = value;
    try {
      localStorage.setItem('humanette-theme', value);
    } catch {}
  }
  return <ThemeContext.Provider value={{ resolved, setTheme }}>{children}</ThemeContext.Provider>;
}
export const useTheme = () => useContext(ThemeContext);
