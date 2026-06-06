import { useState, useEffect, createContext, useContext, type ReactNode } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Language } from "@/lib/translations";

export type AccentColor = "indigo" | "emerald" | "amber" | "violet" | "rose";

type ThemeContextType = {
  isDark: boolean;
  accent: AccentColor;
  language: Language;
  toggle: () => void;
  setAccent: (accent: AccentColor) => void;
  setLanguage: (lang: Language) => void;
};

const ThemeContext = createContext<ThemeContextType>({
  isDark: true,
  accent: "indigo",
  language: "en",
  toggle: () => {},
  setAccent: () => {},
  setLanguage: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("stockvision-theme");
      if (stored) return stored === "dark";
      return true;
    }
    return true;
  });

  const [accent, setAccentState] = useState<AccentColor>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("stockvision-accent") as AccentColor;
      return stored || "indigo";
    }
    return "indigo";
  });

  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("stockvision-lang") as Language;
      return stored || "en";
    }
    return "en";
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("stockvision-theme", isDark ? "dark" : "light");
  }, [isDark]);

  useEffect(() => {
    document.documentElement.classList.remove("theme-emerald", "theme-amber", "theme-violet", "theme-rose");
    if (accent !== "indigo") {
      document.documentElement.classList.add(`theme-${accent}`);
    }
    localStorage.setItem("stockvision-accent", accent);
  }, [accent]);

  useEffect(() => {
    document.documentElement.dir = "ltr";
    document.documentElement.lang = language;
    localStorage.setItem("stockvision-lang", language);
  }, [language]);

  const toggle = () => setIsDark((d) => !d);
  const setAccent = (color: AccentColor) => setAccentState(color);
  const setLanguage = (lang: Language) => setLanguageState(lang);

  return (
    <ThemeContext.Provider value={{ isDark, accent, language, toggle, setAccent, setLanguage }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function ThemeToggle() {
  const { isDark, toggle } = useTheme();

  return (
    <Button
      data-testid="button-theme-toggle"
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label="Toggle theme"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
