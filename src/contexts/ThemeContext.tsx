import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type ThemeType = 
  | "brown-light" 
  | "dark-neon";

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  themes: { id: ThemeType; name: string; icon: string }[];
}

const THEMES: { id: ThemeType; name: string; icon: string }[] = [
  { id: "brown-light", name: "Marrom Claro", icon: "☀️" },
  { id: "dark-neon", name: "Dark Neon", icon: "🌙" },
];

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeType>(() => {
    const saved = localStorage.getItem("app-theme");
    // Default to brown-light
    return (saved as ThemeType) || "brown-light";
  });

  useEffect(() => {
    localStorage.setItem("app-theme", theme);
    
    // Remove all previous theme classes
    document.documentElement.classList.remove(
      "theme-brown-light",
      "theme-dark-neon",
      "theme-blue-minimal",
      "theme-green-accounting",
      "theme-high-contrast"
    );
    // Add current theme class
    document.documentElement.classList.add(`theme-${theme}`);
  }, [theme]);

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}