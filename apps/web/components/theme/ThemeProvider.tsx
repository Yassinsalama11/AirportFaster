'use client';

import { useEffect } from 'react';

const STORAGE_KEY = 'airportfaster-theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.add('light');
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = 'light';
    window.localStorage.setItem(STORAGE_KEY, 'light');
  }, []);

  return <>{children}</>;
}

export { STORAGE_KEY };
