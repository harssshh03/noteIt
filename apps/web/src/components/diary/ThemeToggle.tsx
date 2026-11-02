import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem("theme", dark ? "dark" : "light");
    } catch {
      /* private mode — fine */
    }
  }, [dark]);

  return (
    <Button variant="ghost" size="icon" onClick={() => setDark((d) => !d)} aria-label={dark ? "Switch to light" : "Switch to dark"}>
      {dark ? <Sun /> : <Moon />}
    </Button>
  );
}
