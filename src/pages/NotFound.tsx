import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Home, Pill, Frown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="h-[calc(100vh-8rem)] flex items-center justify-center p-3 md:p-6">
      <div className="relative w-full max-w-3xl border-4 border-dashed border-primary/30 rounded-3xl p-4 md:p-8 bg-background/50 backdrop-blur-sm overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden rounded-3xl">
          <div className="absolute top-5 left-5 w-20 h-20 md:w-24 md:h-24 bg-primary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '0s' }} />
          <div className="absolute bottom-5 right-5 w-24 h-24 md:w-28 md:h-28 bg-accent/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '0.5s' }} />
          <div className="absolute top-1/2 left-1/4 w-16 h-16 md:w-20 md:h-20 bg-secondary/10 rounded-full blur-2xl animate-float" style={{ animationDelay: '1s' }} />
        </div>

        {/* Floating pills */}
        <div className="hidden lg:block absolute top-8 left-1/4 animate-float opacity-20" style={{ animationDelay: '0.3s' }}>
          <Pill className="w-6 h-6 text-primary animate-spin-slow" />
        </div>
        <div className="hidden lg:block absolute bottom-16 right-1/3 animate-float opacity-20" style={{ animationDelay: '0.7s' }}>
          <Pill className="w-8 h-8 text-accent animate-spin-slow" />
        </div>

        {/* Main content */}
        <div className="relative z-10 text-center space-y-3 md:space-y-4">
          {/* Animated friendly icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-glow blur-xl" />
              <div className="relative p-3 md:p-4 rounded-full bg-primary/10 animate-float">
                <Frown className="w-10 h-10 md:w-12 md:h-12 text-primary animate-bounce-smooth" />
              </div>
            </div>
          </div>

          {/* Animated 404 text */}
          <div className="relative">
            <h1 className="text-5xl sm:text-7xl md:text-8xl font-bold text-primary/90 animate-bounce-smooth select-none">
              404
            </h1>
            <div className="absolute -top-1 -right-1 md:-top-2 md:-right-2 animate-float" style={{ animationDelay: '0.5s' }}>
              <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-accent animate-spin-slow" />
            </div>
            <div className="absolute -bottom-1 -left-1 md:-bottom-2 md:-left-2 animate-float" style={{ animationDelay: '1s' }}>
              <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-secondary animate-spin-slow" />
            </div>
          </div>

          {/* Animated subtitle */}
          <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-1.5 md:mb-2">
              Oops! Page Not Found
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground px-2">
              Looks like this page took its medication and disappeared! 💊
            </p>
          </div>

          {/* Animated dots */}
          <div className="flex gap-2 justify-center animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <span className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-primary animate-bounce-smooth" style={{ animationDelay: '0s' }} />
            <span className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-accent animate-bounce-smooth" style={{ animationDelay: '0.2s' }} />
            <span className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-secondary animate-bounce-smooth" style={{ animationDelay: '0.4s' }} />
          </div>

          {/* Animated button */}
          <div className="animate-fade-in" style={{ animationDelay: '0.6s' }}>
            <Button 
              onClick={() => navigate('/dashboard')}
              size="default"
              className="rounded-full w-full sm:w-auto hover:scale-105 transition-transform"
            >
              <Home className="w-4 h-4 mr-2" />
              Return to Home
            </Button>
          </div>

          {/* Error path display */}
          <div className="p-2.5 md:p-3 bg-muted/50 rounded-lg border-2 border-dashed border-border/50 backdrop-blur-sm animate-fade-in" style={{ animationDelay: '0.8s' }}>
            <p className="text-xs text-muted-foreground font-mono break-all">
              Lost path: <span className="text-destructive">{location.pathname}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
