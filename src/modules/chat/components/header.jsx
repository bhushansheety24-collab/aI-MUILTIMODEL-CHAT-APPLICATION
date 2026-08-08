"use client";
import { Moon, Sun } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Frontend-only header with a simple local dark/light toggle
 * (swap for next-themes' useTheme if you add that later).
 */
const Header = () => {
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => {
    setIsDark((prev) => !prev);
    document.documentElement.classList.toggle("dark");
  };

  return (
    <div className="flex h-14 w-full flex-row justify-end items-center border-b border-border bg-sidebar px-4 py-2">
      <Button variant="ghost" size="icon" onClick={toggleTheme}>
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
    </div>
  );
};

export default Header;