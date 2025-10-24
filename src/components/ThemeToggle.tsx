import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { Moon, Sun, Monitor } from "lucide-react";

const ThemeToggle = () => {
  const { mode, setMode, toggle } = useTheme();

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" className="h-10 w-10" onClick={toggle} aria-label="Toggle theme">
        <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      </Button>
      <div className="hidden sm:flex gap-1">
        <Button variant={mode === "light" ? "default" : "outline"} size="icon" className="h-10 w-10" onClick={() => setMode("light")} aria-label="Light mode">
          <Sun className="h-5 w-5" />
        </Button>
        <Button variant={mode === "dark" ? "default" : "outline"} size="icon" className="h-10 w-10" onClick={() => setMode("dark")} aria-label="Dark mode">
          <Moon className="h-5 w-5" />
        </Button>
        <Button variant={mode === "system" ? "default" : "outline"} size="icon" className="h-10 w-10" onClick={() => setMode("system")} aria-label="System mode">
          <Monitor className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default ThemeToggle;

