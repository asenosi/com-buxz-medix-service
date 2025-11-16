import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Palette } from "lucide-react";
import { useTheme, ThemeName } from "@/hooks/use-theme";
import { ScrollArea } from "@/components/ui/scroll-area";

type ThemeDef = {
  id: ThemeName;
  title: string;
  description: string;
  colors: { circle: string; bar1: string; bar2: string; button: string };
};

const themes: ThemeDef[] = [
  { id: "ubuntu", title: "Wellness", description: "Calming teal for peace of mind", colors: { circle: "bg-teal-500", bar1: "bg-teal-300", bar2: "bg-teal-200", button: "bg-teal-600" } },
  { id: "default", title: "Healthcare", description: "Professional medical blue", colors: { circle: "bg-blue-600", bar1: "bg-blue-400", bar2: "bg-blue-200", button: "bg-blue-700" } },
  { id: "african-sunset", title: "Vitality", description: "Energizing coral for active health", colors: { circle: "bg-pink-500", bar1: "bg-pink-300", bar2: "bg-pink-200", button: "bg-pink-600" } },
  { id: "township-green", title: "Recovery", description: "Fresh mint for healing and renewal", colors: { circle: "bg-emerald-500", bar1: "bg-emerald-300", bar2: "bg-emerald-200", button: "bg-emerald-600" } },
  { id: "kwazulu-gold", title: "Sunshine", description: "Bright yellow for positivity", colors: { circle: "bg-yellow-500", bar1: "bg-yellow-300", bar2: "bg-yellow-200", button: "bg-yellow-600" } },
  { id: "cape-blue", title: "Tranquil", description: "Serene sky blue", colors: { circle: "bg-cyan-500", bar1: "bg-cyan-300", bar2: "bg-cyan-200", button: "bg-cyan-600" } },
  { id: "pretoria-purple", title: "Balance", description: "Harmonious lavender", colors: { circle: "bg-purple-500", bar1: "bg-purple-300", bar2: "bg-purple-200", button: "bg-purple-600" } },
  { id: "mandela", title: "Midnight", description: "Sleek dark mode aesthetic", colors: { circle: "bg-slate-700", bar1: "bg-slate-500", bar2: "bg-slate-400", button: "bg-slate-800" } },
];

const ThemeCard = ({ themeId, title, colors, selected, onSelect }: {
  themeId: ThemeName; title: string; colors: ThemeDef["colors"]; selected: boolean; onSelect: (id: ThemeName) => void;
}) => (
  <button
    onClick={() => onSelect(themeId)}
    className={`relative p-3 rounded-lg border-2 transition-all hover:shadow-md ${
      selected ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/50"
    }`}
  >
    {selected && (
      <div className="absolute top-2 right-2">
        <Check className="w-4 h-4 text-primary" />
      </div>
    )}
    <div className="text-left mb-2">
      <div className="font-semibold text-sm">{title}</div>
    </div>
    <div className="flex items-center gap-2 mb-2">
      <div className={`h-6 w-6 rounded-full ${colors.circle}`} />
      <div className="flex-1 space-y-1">
        <div className={`h-1.5 rounded ${colors.bar1}`} />
        <div className={`h-1.5 rounded w-3/4 ${colors.bar2}`} />
      </div>
    </div>
    <div className={`h-6 rounded ${colors.button} text-white text-xs text-center leading-6`}>
      Button
    </div>
  </button>
);

const ThemePicker = ({ trigger }: { trigger?: React.ReactNode }) => {
  const { palette, setPalette } = useTheme();
  const [open, setOpen] = useState(false);

  const handleSelect = (themeId: ThemeName) => {
    setPalette(themeId);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" className="hover:scale-105 transition-transform" aria-label="Choose theme">
            <Palette className="w-4 h-4 mr-2" /> Themes
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Choose Your Theme</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 pr-4">
            {themes.map(t => (
              <ThemeCard key={t.id} themeId={t.id} title={t.title} colors={t.colors} selected={palette === t.id} onSelect={handleSelect} />
            ))}
          </div>
        </ScrollArea>
        <div className="text-center text-xs text-muted-foreground">Choose a theme that matches your wellness journey</div>
      </DialogContent>
    </Dialog>
  );
};

export default ThemePicker;
