import { Pill } from "lucide-react";

const PageLoader = () => (
  <div className="min-h-[50vh] flex items-center justify-center">
    <div className="flex flex-col items-center gap-3 text-center animate-fade-in">
      <div className="p-3 rounded-full bg-primary/10">
        <Pill className="w-8 h-8 text-primary animate-pulse" />
      </div>
      <p className="text-muted-foreground">Loading…</p>
    </div>
  </div>
);

export default PageLoader;

