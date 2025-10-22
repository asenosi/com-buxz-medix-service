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
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="bg-primary text-primary-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="text-center">
            <div className="flex justify-center mb-8">
              <div className="bg-primary-foreground/10 rounded-full p-6">
                <Pill className="w-16 h-16 md:w-20 md:h-20" />
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              MedTracker
            </h1>
            <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto leading-relaxed">
              Never miss a dose again. Your reliable companion for managing medications with ease and confidence.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => navigate("/auth")}
                size="lg"
                variant="secondary"
                className="text-xl h-16 px-12"
              >
                Get Started
              </Button>
              <Button
                onClick={() => navigate("/auth")}
                size="lg"
                variant="outline"
                className="text-xl h-16 px-12 bg-primary-foreground/10 border-primary-foreground hover:bg-primary-foreground/20"
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Designed for Your Health
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Simple, clear, and easy to use - especially designed for elderly users
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <Card className="border-2 hover:shadow-lg transition-shadow">
              <CardContent className="pt-8 text-center">
                <div className="flex justify-center mb-6">
                  <div className="bg-primary/10 rounded-full p-6">
                    <Clock className="w-12 h-12 text-primary" />
                  </div>
                </div>
                <h3 className="text-2xl font-semibold mb-4">Smart Reminders</h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Get timely notifications for each medication with clear instructions
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-lg transition-shadow">
              <CardContent className="pt-8 text-center">
                <div className="flex justify-center mb-6">
                  <div className="bg-secondary/10 rounded-full p-6">
                    <Heart className="w-12 h-12 text-secondary" />
                  </div>
                </div>
                <h3 className="text-2xl font-semibold mb-4">Easy Tracking</h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Mark doses as taken with a single tap and track your medication history
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-lg transition-shadow">
              <CardContent className="pt-8 text-center">
                <div className="flex justify-center mb-6">
                  <div className="bg-accent/10 rounded-full p-6">
                    <Users className="w-12 h-12 text-accent" />
                  </div>
                </div>
                <h3 className="text-2xl font-semibold mb-4">Family Support</h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Allow caregivers to monitor and help manage your medications
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-lg transition-shadow">
              <CardContent className="pt-8 text-center">
                <div className="flex justify-center mb-6">
                  <div className="bg-primary/10 rounded-full p-6">
                    <Pill className="w-12 h-12 text-primary" />
                  </div>
                </div>
                <h3 className="text-2xl font-semibold mb-4">Refill Alerts</h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Know when you're running low and need to refill your prescription
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-lg transition-shadow">
              <CardContent className="pt-8 text-center">
                <div className="flex justify-center mb-6">
                  <div className="bg-secondary/10 rounded-full p-6">
                    <Shield className="w-12 h-12 text-secondary" />
                  </div>
                </div>
                <h3 className="text-2xl font-semibold mb-4">Secure & Private</h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Your health data is encrypted and protected with industry-standard security
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-lg transition-shadow">
              <CardContent className="pt-8 text-center">
                <div className="flex justify-center mb-6">
                  <div className="bg-accent/10 rounded-full p-6">
                    <Clock className="w-12 h-12 text-accent" />
                  </div>
                </div>
                <h3 className="text-2xl font-semibold mb-4">Flexible Schedules</h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Set up complex medication schedules with multiple times per day
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary text-primary-foreground py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Start Managing Your Medications Today
          </h2>
          <p className="text-xl md:text-2xl mb-8 leading-relaxed">
            Join thousands of users who trust MedTracker for their daily medication management
          </p>
          <Button
            onClick={() => navigate("/auth")}
            size="lg"
            variant="secondary"
            className="text-2xl h-16 px-12"
          >
            Create Free Account
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-primary rounded-full p-4">
              <Pill className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <p className="text-lg text-muted-foreground">
            © 2025 MedTracker. Helping you stay healthy, one dose at a time.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
