import { useEffect, useState } from "react";

export type Theme = "light" | "dark";
const KEY = "geoterra_theme";

export function applyTheme(t: Theme) {
  document.documentElement.classList.toggle("dark", t === "dark");
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");
  useEffect(() => {
    const cur = document.documentElement.classList.contains("dark") ? "dark" : "light";
    setTheme(cur);
  }, []);
  const set = (t: Theme) => {
    localStorage.setItem(KEY, t);
    applyTheme(t);
    setTheme(t);
  };
  return { theme, setTheme: set, toggle: () => set(theme === "dark" ? "light" : "dark") };
}
