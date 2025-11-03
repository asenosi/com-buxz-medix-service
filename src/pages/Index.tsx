import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pill, Shield, Clock, Users, Heart } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <header className="bg-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/80 opacity-90" />
        <div className="max-w-4xl mx-auto px-6 py-20 md:py-32 relative">
          <div className="text-center space-y-8">
            <div className="flex justify-center">
              <div className="bg-primary-foreground/10 backdrop-blur-sm rounded-full p-8 shadow-lg">
                <Pill className="w-20 h-20" />
              </div>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              MedTracker
            </h1>
            <p className="text-lg md:text-xl max-w-2xl mx-auto opacity-90 leading-relaxed">
              Never miss a dose again. Your reliable companion for managing medications with ease and confidence.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Button
                onClick={() => navigate("/auth")}
                size="lg"
                variant="secondary"
                className="shadow-lg hover:shadow-xl transition-all"
              >
                Get Started
              </Button>
              <Button
                onClick={() => navigate("/auth")}
                size="lg"
                variant="outline"
                className="border-2 border-primary-foreground/30 bg-primary-foreground/5 hover:bg-primary-foreground/10 backdrop-blur-sm"
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="py-20 md:py-32">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold">
              Designed for Your Health
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Simple, clear, and reliable medication management
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="border-border/40 hover:border-primary/20 hover:shadow-lg transition-all">
              <CardContent className="pt-8 pb-8 text-center space-y-4">
                <div className="flex justify-center">
                  <div className="bg-primary/10 rounded-2xl p-5">
                    <Clock className="w-10 h-10 text-primary" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold">Smart Reminders</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Get timely notifications for each medication with clear instructions
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/40 hover:border-primary/20 hover:shadow-lg transition-all">
              <CardContent className="pt-8 pb-8 text-center space-y-4">
                <div className="flex justify-center">
                  <div className="bg-secondary/10 rounded-2xl p-5">
                    <Heart className="w-10 h-10 text-secondary" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold">Easy Tracking</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Mark doses as taken with a single tap and track your history
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/40 hover:border-primary/20 hover:shadow-lg transition-all">
              <CardContent className="pt-8 pb-8 text-center space-y-4">
                <div className="flex justify-center">
                  <div className="bg-accent/10 rounded-2xl p-5">
                    <Users className="w-10 h-10 text-accent" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold">Family Support</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Allow caregivers to monitor and help manage medications
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/40 hover:border-primary/20 hover:shadow-lg transition-all">
              <CardContent className="pt-8 pb-8 text-center space-y-4">
                <div className="flex justify-center">
                  <div className="bg-primary/10 rounded-2xl p-5">
                    <Pill className="w-10 h-10 text-primary" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold">Refill Alerts</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Know when you're running low on your prescriptions
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/40 hover:border-primary/20 hover:shadow-lg transition-all">
              <CardContent className="pt-8 pb-8 text-center space-y-4">
                <div className="flex justify-center">
                  <div className="bg-secondary/10 rounded-2xl p-5">
                    <Shield className="w-10 h-10 text-secondary" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold">Secure & Private</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Your health data is encrypted and protected
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/40 hover:border-primary/20 hover:shadow-lg transition-all">
              <CardContent className="pt-8 pb-8 text-center space-y-4">
                <div className="flex justify-center">
                  <div className="bg-accent/10 rounded-2xl p-5">
                    <Clock className="w-10 h-10 text-accent" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold">Flexible Schedules</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Set up complex medication schedules easily
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary text-primary-foreground relative overflow-hidden py-20 md:py-28">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/80" />
        <div className="max-w-3xl mx-auto px-6 text-center relative space-y-8">
          <h2 className="text-4xl md:text-5xl font-bold leading-tight">
            Start Managing Your Medications Today
          </h2>
          <p className="text-lg opacity-90 leading-relaxed">
            Join thousands of users who trust MedTracker for their daily medication management
          </p>
          <Button
            onClick={() => navigate("/auth")}
            size="lg"
            variant="secondary"
            className="shadow-xl hover:shadow-2xl transition-all"
          >
            Create Free Account
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card/50 backdrop-blur-sm border-t border-border/50 py-12">
        <div className="max-w-6xl mx-auto px-6 text-center space-y-4">
          <div className="flex justify-center">
            <div className="bg-primary rounded-full p-3">
              <Pill className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
          <p className="text-muted-foreground">
            © 2025 MedTracker. Helping you stay healthy, one dose at a time.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
