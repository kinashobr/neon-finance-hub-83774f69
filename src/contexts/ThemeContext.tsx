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
  const [isManualTheme, setIsManualTheme] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("app-theme-manual") === "true";
  });

  const [theme, setThemeState] = useState<ThemeType>(() => {
    if (typeof window === "undefined") {
      return "brown-light";
    }

    const saved = localStorage.getItem("app-theme");
    if (saved === "brown-light" || saved === "dark-neon") {
      return saved as ThemeType;
    }

    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "dark-neon" : "brown-light";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    localStorage.setItem("app-theme", theme);

    // Remove all previous theme classes
    document.documentElement.classList.remove(
      "theme-brown-light",
      "theme-dark-neon"
    );
    // Add current theme class
    document.documentElement.classList.add(`theme-${theme}`);
  }, [theme]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!media) return;

    const handleChange = (event: MediaQueryListEvent) => {
      if (isManualTheme) return;
      setThemeState(event.matches ? "dark-neon" : "brown-light");
    };

    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [isManualTheme]);

  const setTheme = (newTheme: ThemeType) => {
    setIsManualTheme(true);
    if (typeof window !== "undefined") {
      localStorage.setItem("app-theme-manual", "true");
    }
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