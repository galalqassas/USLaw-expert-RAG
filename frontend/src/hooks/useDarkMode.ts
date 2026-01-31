'use client';

import { useSyncExternalStore, useCallback, useRef, useEffect } from 'react';

// External store for dark mode
let darkModeState = false;
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot() {
  return darkModeState;
}

function getServerSnapshot() {
  return false;
}

function setDarkMode(value: boolean) {
  darkModeState = value;
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', value);
  }
  listeners.forEach(listener => listener());
}

export function useDarkMode() {
  const isDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const initialized = useRef(false);

  // Initialize from system preference once on mount (in effect, not render)
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark && !darkModeState) {
        setDarkMode(true);
      }
    }
  }, []);

  const toggle = useCallback(() => {
    setDarkMode(!darkModeState);
  }, []);

  return { isDark, toggle };
}
