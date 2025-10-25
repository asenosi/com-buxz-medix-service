import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Palette } from "lucide-react";
import { useTheme, ThemeName } from "@/hooks/use-theme";

type ThemeDef = {
  id: ThemeName;
  title: string;
  description: string;
  colors: { circle: string; bar1: string; bar2: string; button: string };
};

const themes: ThemeDef[] = [
  { id: "ubuntu", title: "Ubuntu", description: "Earth tones representing unity and community", colors: { circle: "bg-orange-500", bar1: "bg-orange-300", bar2: "bg-orange-200", button: "bg-orange-500" } },
  { id: "default", title: "Default", description: "Clean medical blue palette", colors: { circle: "bg-sky-500", bar1: "bg-sky-300", bar2: "bg-sky-200", button: "bg-sky-600" } },
  { id: "african-sunset", title: "African Sunset", description: "Warm sunset inspired by African landscapes", colors: { circle: "bg-rose-500", bar1: "bg-rose-300", bar2: "bg-orange-200", button: "bg-rose-600" } },
  { id: "township-green", title: "Township Green", description: "Fresh green representing growth and prosperity", colors: { circle: "bg-green-500", bar1: "bg-green-300", bar2: "bg-green-200", button: "bg-green-600" } },
  { id: "kwazulu-gold", title: "KwaZulu Gold", description: "Inspired by South African gold heritage", colors: { circle: "bg-amber-500", bar1: "bg-amber-300", bar2: "bg-amber-200", button: "bg-amber-500" } },
  { id: "cape-blue", title: "Cape Blue", description: "Cool blue like Cape waters", colors: { circle: "bg-blue-500", bar1: "bg-blue-300", bar2: "bg-blue-200", button: "bg-blue-600" } },
  { id: "pretoria-purple", title: "Pretoria Purple", description: "Royal purple inspired by jacarandas", colors: { circle: "bg-violet-500", bar1: "bg-violet-300", bar2: "bg-violet-200", button: "bg-violet-600" } },
  { id: "mandela", title: "Mandela", description: "Dignified and timeless", colors: { circle: "bg-neutral-700", bar1: "bg-neutral-400", bar2: "bg-neutral-300", button: "bg-neutral-800" } },
];

const ThemeCard = ({ themeId, title, description, colors, selected, onSelect }: {
  themeId: ThemeName; title: string; description: string; colors: ThemeDef["colors"]; selected: boolean; onSelect: (id: ThemeName) => void;
}) => (
  <Card className={`relative hover:shadow-lg transition-all duration-300 ${selected ? "ring-2 ring-primary" : ""}`} role="button" onClick={() => onSelect(themeId)}>
    <CardHeader>
      <div className="flex items-center justify-between">
        <div>
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        {selected && <Check className="w-5 h-5 text-primary" />}
      </div>
    </CardHeader>
    <CardContent>
      <div className="flex items-center gap-3">
        <div className={`h-8 w-8 rounded-full ${colors.circle}`} />
        <div className="flex-1 space-y-2">
          <div className={`h-2 rounded ${colors.bar1}`} />
          <div className={`h-2 rounded w-2/3 ${colors.bar2}`} />
        </div>
      </div>
      <div className={`h-8 rounded mt-4 ${colors.button} text-white text-center leading-8`}>Sample Button</div>
    </CardContent>
  </Card>
);

const ThemePicker = ({ trigger }: { trigger?: React.ReactNode }) => {
  const { palette, setPalette } = useTheme();
  const cols = useMemo(() => (themes.length % 2 === 0 ? 2 : 3), []);

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" className="hover:scale-105 transition-transform" aria-label="Choose theme">
            <Palette className="w-4 h-4 mr-2" /> Themes
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Choose Your Theme</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {themes.map(t => (
            <ThemeCard key={t.id} themeId={t.id} title={t.title} description={t.description} colors={t.colors} selected={palette === t.id} onSelect={setPalette} />
          ))}
        </div>
        <div className="text-center text-xs text-muted-foreground mt-2">ZA Proudly South African Themes</div>
      </DialogContent>
    </Dialog>
  );
};

export default ThemePicker;
