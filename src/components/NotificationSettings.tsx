import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Volume2, VolumeX, Clock, Moon } from "lucide-react";
import { useNotification } from "@/hooks/use-notification";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

export const NotificationSettings = () => {
  const { 
    permission, 
    preferences, 
    loading,
    requestPermission,
    updatePreferences,
    sendNotification
  } = useNotification();

  const testNotification = async () => {
    try {
      if (!("Notification" in window)) {
        toast.error("Your browser doesn't support notifications");
        return;
      }

      if (permission !== "granted") {
        const granted = await requestPermission();
        if (!granted) {
          toast.error("Please allow notifications in your browser settings");
          return;
        }
      }
      
      sendNotification("Test Notification 🔔", {
        body: "Notifications are working! You'll receive reminders for your medications.",
        requireInteraction: false,
      });
      
      toast.success("Test notification sent!");
    } catch (error) {
      console.error("Failed to send test notification:", error);
      toast.error(`Failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  if (loading || !preferences) {
    return (
      <Card className="animate-fade-in">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
      <CardHeader className="p-4 sm:p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-t-lg">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notification Settings
        </CardTitle>
        <CardDescription className="text-sm">Configure when and how you receive medication reminders</CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 space-y-6">
        {/* Master switch */}
        <div className="flex items-center justify-between rounded-lg border p-4 gap-3">
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm sm:text-base flex items-center gap-2">
              {preferences.enabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4 text-muted-foreground" />}
              Enable Notifications
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground">Turn all medication reminders on or off</div>
          </div>
          <Switch 
            checked={preferences.enabled} 
            onCheckedChange={(checked) => updatePreferences({ enabled: checked })}
            className="shrink-0"
          />
        </div>

        {preferences.enabled && (
          <>
            {/* Browser notifications */}
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border p-4 gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm sm:text-base">Browser Notifications</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    {permission === "granted" ? "Receive push notifications" : "Permission required"}
                  </div>
                </div>
                <Switch 
                  checked={preferences.browser_enabled && permission === "granted"} 
                  onCheckedChange={async (checked) => {
                    if (checked && permission !== "granted") {
                      const granted = await requestPermission();
                      if (granted) {
                        updatePreferences({ browser_enabled: true });
                      }
                    } else {
                      updatePreferences({ browser_enabled: checked });
                    }
                  }}
                  className="shrink-0"
                />
              </div>

              {permission === "default" && (
                <Button 
                  onClick={requestPermission}
                  variant="outline"
                  className="w-full"
                  size="sm"
                >
                  Enable Browser Notifications
                </Button>
              )}

              {permission === "denied" && (
                <div className="text-sm text-muted-foreground bg-destructive/10 p-3 rounded-lg">
                  Notifications blocked. Please enable them in your browser settings.
                </div>
              )}
            </div>

            {/* Sound */}
            <div className="flex items-center justify-between rounded-lg border p-4 gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm sm:text-base flex items-center gap-2">
                  {preferences.sound_enabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}
                  Notification Sound
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground">Play a sound with notifications</div>
              </div>
              <Switch 
                checked={preferences.sound_enabled} 
                onCheckedChange={(checked) => updatePreferences({ sound_enabled: checked })}
                className="shrink-0"
              />
            </div>

            {/* Reminder timing */}
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <Label className="font-medium text-sm sm:text-base">Reminder Timing</Label>
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">
                Notify me {preferences.reminder_minutes_before} minutes before each dose
              </div>
              <Slider
                value={[preferences.reminder_minutes_before]}
                onValueChange={([value]) => updatePreferences({ reminder_minutes_before: value })}
                min={5}
                max={60}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>5 min</span>
                <span>30 min</span>
                <span>60 min</span>
              </div>
            </div>

            {/* Missed dose reminders */}
            <div className="flex items-center justify-between rounded-lg border p-4 gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm sm:text-base">Missed Dose Alerts</div>
                <div className="text-xs sm:text-sm text-muted-foreground">Get notified about missed medications</div>
              </div>
              <Switch 
                checked={preferences.remind_for_missed} 
                onCheckedChange={(checked) => updatePreferences({ remind_for_missed: checked })}
                className="shrink-0"
              />
            </div>

            {/* Quiet hours */}
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <Moon className="w-4 h-4 text-muted-foreground" />
                <Label className="font-medium text-sm sm:text-base">Quiet Hours</Label>
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground mb-3">
                Disable notifications during specific hours
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="quiet-start" className="text-xs">Start Time</Label>
                  <Input
                    id="quiet-start"
                    type="time"
                    value={preferences.quiet_hours_start || ""}
                    onChange={(e) => updatePreferences({ quiet_hours_start: e.target.value || null })}
                    className="h-10 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quiet-end" className="text-xs">End Time</Label>
                  <Input
                    id="quiet-end"
                    type="time"
                    value={preferences.quiet_hours_end || ""}
                    onChange={(e) => updatePreferences({ quiet_hours_end: e.target.value || null })}
                    className="h-10 text-sm"
                  />
                </div>
              </div>
              {preferences.quiet_hours_start && preferences.quiet_hours_end && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => updatePreferences({ 
                    quiet_hours_start: null, 
                    quiet_hours_end: null 
                  })}
                  className="w-full text-xs"
                >
                  Clear Quiet Hours
                </Button>
              )}
            </div>

            {/* Test Notification */}
            <Button 
              onClick={testNotification}
              variant="outline"
              className="w-full"
            >
              Send Test Notification
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};
