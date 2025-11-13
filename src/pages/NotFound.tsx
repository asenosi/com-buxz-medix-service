import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Home, Pill, MapPin, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-background via-background to-primary/5 p-4">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-10 left-5 w-24 h-24 md:w-32 md:h-32 bg-primary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '0s' }} />
        <div className="absolute bottom-10 right-5 w-28 h-28 md:w-40 md:h-40 bg-accent/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '0.5s' }} />
        <div className="absolute top-1/2 left-1/4 w-20 h-20 md:w-24 md:h-24 bg-secondary/10 rounded-full blur-2xl animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-1/3 right-1/4 w-24 h-24 md:w-36 md:h-36 bg-primary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
      </div>

      {/* Floating pills */}
      <div className="hidden md:block absolute top-10 left-1/4 animate-float opacity-20" style={{ animationDelay: '0.3s' }}>
        <Pill className="w-8 h-8 text-primary animate-spin-slow" />
      </div>
      <div className="hidden md:block absolute bottom-20 right-1/3 animate-float opacity-20" style={{ animationDelay: '0.7s' }}>
        <Pill className="w-10 h-10 text-accent animate-spin-slow" />
      </div>
      <div className="hidden md:block absolute top-1/3 right-10 animate-float opacity-20" style={{ animationDelay: '1.2s' }}>
        <Pill className="w-6 h-6 text-secondary animate-spin-slow" />
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center px-4 max-w-2xl mx-auto w-full">
        {/* Animated friendly icon */}
        <div className="mb-6 md:mb-8 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-glow blur-xl" />
            <div className="relative p-4 md:p-6 rounded-full bg-primary/10 animate-float border-2 border-dashed border-primary/40">
              <MapPin className="w-12 h-12 md:w-16 md:h-16 text-primary animate-bounce-smooth" />
            </div>
          </div>
        </div>

        {/* Animated 404 text */}
        <div className="mb-4 md:mb-6 relative">
          <h1 className="text-6xl sm:text-8xl md:text-9xl lg:text-[12rem] font-bold text-primary/90 animate-bounce-smooth select-none">
            404
          </h1>
          <div className="absolute -top-2 -right-2 md:-top-4 md:-right-4 animate-float" style={{ animationDelay: '0.5s' }}>
            <Sparkles className="w-8 h-8 md:w-12 md:h-12 text-accent animate-spin-slow" />
          </div>
          <div className="absolute -bottom-2 -left-2 md:-bottom-4 md:-left-4 animate-float" style={{ animationDelay: '1s' }}>
            <Sparkles className="w-6 h-6 md:w-10 md:h-10 text-secondary animate-spin-slow" />
          </div>
        </div>

        {/* Animated subtitle */}
        <div className="mb-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2 md:mb-3">
            Oops! Page Not Found
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground px-2">
            Looks like this page took its medication and disappeared! 💊
          </p>
        </div>

        {/* Animated dots */}
        <div className="flex gap-2 justify-center mb-6 md:mb-8 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <span className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-primary animate-bounce-smooth" style={{ animationDelay: '0s' }} />
          <span className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-accent animate-bounce-smooth" style={{ animationDelay: '0.2s' }} />
          <span className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-secondary animate-bounce-smooth" style={{ animationDelay: '0.4s' }} />
        </div>

        {/* Animated button */}
        <div className="animate-fade-in mb-6 md:mb-8" style={{ animationDelay: '0.6s' }}>
          <Button 
            onClick={() => navigate('/')}
            size="lg"
            className="group relative overflow-hidden w-full sm:w-auto"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] animate-shimmer" />
            <span className="relative flex items-center gap-2">
              <Home className="w-5 h-5 group-hover:animate-bounce-smooth" />
              Return to Home
            </span>
          </Button>
        </div>

        {/* Error path display */}
        <div className="mt-6 md:mt-8 p-3 md:p-4 bg-muted/50 rounded-lg border-2 border-dashed border-border/50 backdrop-blur-sm animate-fade-in" style={{ animationDelay: '0.8s' }}>
          <p className="text-xs md:text-sm text-muted-foreground font-mono break-all">
            Lost path: <span className="text-destructive">{location.pathname}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
