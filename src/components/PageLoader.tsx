import { Pill } from "lucide-react";

const PageLoader = () => (
  <div className="min-h-[50vh] flex items-center justify-center">
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-primary/20 animate-glow" />
        <div className="relative p-4 rounded-full bg-primary/10 animate-float">
          <Pill className="w-10 h-10 text-primary animate-spin-slow" />
        </div>
      </div>
      <div className="flex gap-1.5">
        <span className="w-2 h-2 rounded-full bg-primary animate-bounce-smooth" style={{ animationDelay: '0s' }} />
        <span className="w-2 h-2 rounded-full bg-primary animate-bounce-smooth" style={{ animationDelay: '0.2s' }} />
        <span className="w-2 h-2 rounded-full bg-primary animate-bounce-smooth" style={{ animationDelay: '0.4s' }} />
      </div>
      <p className="text-muted-foreground animate-fade-in">Loading…</p>
    </div>
  </div>
);

export default PageLoader;

