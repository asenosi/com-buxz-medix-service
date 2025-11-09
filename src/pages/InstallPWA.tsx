import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Bell, Smartphone, Check } from "lucide-react";
import { useNotification } from "@/hooks/use-notification";
import { toast } from "sonner";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const InstallPWA = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const { permission, requestPermission } = useNotification();

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      toast.info(
        "To install on iOS: Tap the Share button and select 'Add to Home Screen'"
      );
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      toast.success("App installed successfully!");
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
  };

  const handleEnableNotifications = async () => {
    const granted = await requestPermission();
    if (granted) {
      toast.success("Notifications enabled! You'll receive medication reminders in your system tray.");
    }
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Install App</h1>
          <p className="text-sm text-muted-foreground">
            Get the best experience with our mobile app
          </p>
        </div>

        {/* Install App Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Smartphone className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Install MedTracker</CardTitle>
                <CardDescription>
                  Add to your home screen for quick access
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isInstalled ? (
              <div className="flex items-center gap-2 p-4 bg-success/10 text-success rounded-lg">
                <Check className="w-5 h-5" />
                <span className="font-medium">App is already installed!</span>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Installing MedTracker as an app gives you:
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-success mt-0.5 shrink-0" />
                    <span>Faster loading and better performance</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-success mt-0.5 shrink-0" />
                    <span>Works offline</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-success mt-0.5 shrink-0" />
                    <span>System notifications for medication reminders</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-success mt-0.5 shrink-0" />
                    <span>Full screen experience without browser bars</span>
                  </li>
                </ul>
                <Button onClick={handleInstall} className="w-full" size="lg">
                  <Download className="w-4 h-4 mr-2" />
                  Install App
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  On iOS: Tap Share → Add to Home Screen
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Enable Notifications Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Bell className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Enable Notifications</CardTitle>
                <CardDescription>
                  Get reminders in your notification tray
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {permission === "granted" ? (
              <div className="flex items-center gap-2 p-4 bg-success/10 text-success rounded-lg">
                <Check className="w-5 h-5" />
                <span className="font-medium">Notifications are enabled!</span>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Enable notifications to receive medication reminders directly in
                  your phone's notification tray, just like other apps.
                </p>
                <Button
                  onClick={handleEnableNotifications}
                  className="w-full"
                  size="lg"
                  variant="outline"
                >
                  <Bell className="w-4 h-4 mr-2" />
                  Enable Notifications
                </Button>
                {permission === "denied" && (
                  <p className="text-xs text-destructive text-center">
                    Notifications blocked. Please enable them in your browser
                    settings.
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* How it Works */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">How Notifications Work</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Once you install the app and enable notifications, MedTracker will
              send reminders to your phone's notification tray:
            </p>
            <ol className="list-decimal list-inside space-y-2 pl-2">
              <li>Reminders appear in your system notification tray</li>
              <li>Works even when the app is closed</li>
              <li>Tap the notification to open the app</li>
              <li>Customize reminder times in notification settings</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InstallPWA;
