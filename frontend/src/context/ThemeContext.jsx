import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState(
    () => localStorage.getItem('ds_mode') || 'dark'
  );

  const setMode = (newMode) => {
    setModeState(newMode);
    localStorage.setItem('ds_mode', newMode);
    document.documentElement.setAttribute('data-mode', newMode);
  };

  // Apply on first mount
  useEffect(() => {
    document.documentElement.setAttribute('data-mode', mode);
  }, []);

  return (
    <ThemeContext.Provider value={{ mode, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
