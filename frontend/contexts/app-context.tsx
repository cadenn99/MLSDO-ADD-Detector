"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { checkHealth } from "@/lib/api";

interface AppContextType {
  isOnline: boolean;
  isChecking: boolean;
  isDark: boolean;
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

/**
 * Global provider for application state.
 * Handles the 10-second health check polling and dark mode persistence.
 * @component
 */
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isDark, setIsDark] = useState(true);

  // Global Health Polling Logic
  useEffect(() => {
    /**
     * Executes an async health check to verify backend connectivity.
     */
    const poll = async () => {
      setIsChecking(true);
      const status = await checkHealth();
      setIsOnline(status);
      setIsChecking(false);
    };

    poll(); // Run once on mount
    const interval = setInterval(poll, 10000); // Re-run every 10 seconds

    return () => clearInterval(interval);
  }, []);

  /**
   * Switches the theme state and toggles the 'dark' class on the HTML document.
   */
  const toggleTheme = () => {
    setIsDark((prev) => !prev);
    document.documentElement.classList.toggle("dark");
  };

  return (
    <AppContext.Provider value={{ isOnline, isChecking, isDark, toggleTheme }}>
      {children}
    </AppContext.Provider>
  );
}

/**
 * Custom hook to access global application state.
 * @throws Error if used outside of an AppProvider.
 */
export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within an AppProvider");
  return context;
}
