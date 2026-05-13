import { useState, useEffect } from "react";

export function useTheme() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    try {
      const t = localStorage.getItem("theme");
      if (t === "dark") {
        document.documentElement.classList.add("dark");
        setDark(true);
      } else {
        document.documentElement.classList.remove("dark");
        setDark(false);
      }
    } catch (e) {}
  }, []);

  const toggleTheme = () => {
    try {
      if (dark) {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("theme", "light");
        setDark(false);
      } else {
        document.documentElement.classList.add("dark");
        localStorage.setItem("theme", "dark");
        setDark(true);
      }
    } catch (e) {}
  };

  return { dark, toggleTheme };
}
