import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type Theme = "light" | "dark";
const THEME_KEY = "app_theme";

// same palette you already use in Settings
export const getColors = (isDark: boolean) => ({
  background: isDark ? "#121212" : "#FFFFFF",
  surface: isDark ? "#1E1E1E" : "#F2F2F2",
  button: isDark ? "#333333" : "#E5E5E5",
  text: isDark ? "#FFFFFF" : "#111111",
  secondaryText: isDark ? "#BBBBBB" : "#666666",
  border: isDark ? "#444444" : "#DDDDDD",
  accent: isDark ? "#FFFFFF" : "#555555",
});

type ThemeContextValue = {
  theme: Theme;
  isDark: boolean;
  colors: ReturnType<typeof getColors>;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  // restore the saved theme on launch
  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((saved) => {
      if (saved === "light" || saved === "dark") setTheme(saved);
    });
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    const isDark = theme === "dark";
    return {
      theme,
      isDark,
      colors: getColors(isDark),
      toggleTheme: () => {
        const next: Theme = isDark ? "light" : "dark";
        setTheme(next);
        AsyncStorage.setItem(THEME_KEY, next);
      },
    };
  }, [theme]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}