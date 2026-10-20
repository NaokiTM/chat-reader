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
const FONT_KEY = "reader_font";
const FONT_SIZE_KEY = "reader_font_size";

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


export type CustomFont = {
  id: string;
  name: string;     // shown in the carousel
  family: string;   // CSS family name, e.g. "custom-1729..."
  fileName: string; // file inside Paths.document/fonts
  format: "truetype" | "opentype" | "woff" | "woff2";
};

const CUSTOM_FONTS_KEY = "custom_fonts";

type ThemeContextValue = {
  theme: Theme;
  isDark: boolean;
  colors: ReturnType<typeof getColors>;
  toggleTheme: () => void;
  fontFamily: string;
  setFontFamily: (f: string) => void;
  fontSize: number;
  setFontSize: (n: number) => void;
  customFonts: CustomFont[];
  addCustomFont: (f: CustomFont) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [fontFamily, setFontFamilyState] = useState("System");
  const [fontSize, setFontSizeState] = useState(16);
  const [customFonts, setCustomFonts] = useState<CustomFont[]>([]);

  // restore the saved theme on launch
  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((saved) => {
      if (saved === "light" || saved === "dark") setTheme(saved);
    });
  }, []);

  //get custom fonts from async storage
  useEffect(() => {
    AsyncStorage.getItem(CUSTOM_FONTS_KEY).then((j) => j && setCustomFonts(JSON.parse(j)));
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(FONT_KEY).then((f) => f && setFontFamilyState(f));
    AsyncStorage.getItem(FONT_SIZE_KEY).then((s) => s && setFontSizeState(Number(s)));
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
        fontFamily,
        setFontFamily: (f) => {
        setFontFamilyState(f);
        AsyncStorage.setItem(FONT_KEY, f);
        },
        fontSize,
        setFontSize: (n) => {
        setFontSizeState(n);
        AsyncStorage.setItem(FONT_SIZE_KEY, String(n));
        },
        customFonts,
        addCustomFont: (f) => {
        const next = [...customFonts, f];
        setCustomFonts(next);
        AsyncStorage.setItem(CUSTOM_FONTS_KEY, JSON.stringify(next));
        },
    };
  }, [theme, fontFamily, fontSize, customFonts]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}