import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Home, Pill, AlertTriangle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-background via-background to-primary/5">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '0s' }} />
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-accent/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '0.5s' }} />
        <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-secondary/10 rounded-full blur-2xl animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-1/3 right-1/4 w-36 h-36 bg-primary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
      </div>

      {/* Floating pills */}
      <div className="absolute top-10 left-1/4 animate-float opacity-20" style={{ animationDelay: '0.3s' }}>
        <Pill className="w-8 h-8 text-primary animate-spin-slow" />
      </div>
      <div className="absolute bottom-20 right-1/3 animate-float opacity-20" style={{ animationDelay: '0.7s' }}>
        <Pill className="w-10 h-10 text-accent animate-spin-slow" />
      </div>
      <div className="absolute top-1/3 right-10 animate-float opacity-20" style={{ animationDelay: '1.2s' }}>
        <Pill className="w-6 h-6 text-secondary animate-spin-slow" />
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center px-4 max-w-2xl mx-auto">
        {/* Animated warning icon */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-destructive/20 animate-glow blur-xl" />
            <div className="relative p-6 rounded-full bg-destructive/10 animate-float border-2 border-destructive/30">
              <AlertTriangle className="w-20 h-20 text-destructive animate-pulse" />
            </div>
          </div>
        </div>

        {/* Animated 404 text */}
        <div className="mb-6 relative">
          <h1 className="text-9xl md:text-[12rem] font-bold text-primary/90 animate-bounce-smooth select-none">
            404
          </h1>
          <div className="absolute -top-4 -right-4 animate-float" style={{ animationDelay: '0.5s' }}>
            <Sparkles className="w-12 h-12 text-accent animate-spin-slow" />
          </div>
          <div className="absolute -bottom-4 -left-4 animate-float" style={{ animationDelay: '1s' }}>
            <Sparkles className="w-10 h-10 text-secondary animate-spin-slow" />
          </div>
        </div>

        {/* Animated subtitle */}
        <div className="mb-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Oops! Page Not Found
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground">
            Looks like this page took its medication and disappeared! 💊
          </p>
        </div>

        {/* Animated dots */}
        <div className="flex gap-2 justify-center mb-8 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <span className="w-3 h-3 rounded-full bg-primary animate-bounce-smooth" style={{ animationDelay: '0s' }} />
          <span className="w-3 h-3 rounded-full bg-accent animate-bounce-smooth" style={{ animationDelay: '0.2s' }} />
          <span className="w-3 h-3 rounded-full bg-secondary animate-bounce-smooth" style={{ animationDelay: '0.4s' }} />
        </div>

        {/* Animated button */}
        <div className="animate-fade-in" style={{ animationDelay: '0.6s' }}>
          <Button 
            onClick={() => navigate('/')}
            size="lg"
            className="group relative overflow-hidden"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] animate-shimmer" />
            <span className="relative flex items-center gap-2">
              <Home className="w-5 h-5 group-hover:animate-bounce-smooth" />
              Return to Home
            </span>
          </Button>
        </div>

        {/* Error path display */}
        <div className="mt-8 p-4 bg-muted/50 rounded-lg border border-border/50 backdrop-blur-sm animate-fade-in" style={{ animationDelay: '0.8s' }}>
          <p className="text-sm text-muted-foreground font-mono break-all">
            Lost path: <span className="text-destructive">{location.pathname}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
