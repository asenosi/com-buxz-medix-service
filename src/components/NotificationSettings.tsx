import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Volume2, VolumeX, Clock, Moon, Check } from "lucide-react";
import { useNotification } from "@/hooks/use-notification";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { NOTIFICATION_TYPES } from "@/constants/notification-types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as AccordionUI from "@/components/ui/accordion";

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
      
      const defaultType = preferences.default_type || "dose_due";
      const def = NOTIFICATION_TYPES.find(t => t.key === defaultType);

      const n = sendNotification(def?.defaultTitle || "Test Notification 🔔", {
        body: def?.defaultBody || "Notifications are working! You'll receive reminders for your medications.",
        requireInteraction: preferences.use_actions ?? true,
        url: window.location.origin + "/dashboard",
      });

      // In-app fallback with actions
      if (preferences.use_actions) {
        toast(
          def?.defaultTitle || "Test Notification",
          {
            description: def?.defaultBody,
            action: {
              label: "Open",
              onClick: () => {
                window.location.href = "/dashboard";
              },
            },
          }
        );
      }
      
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
      <CardContent className="p-4 sm:p-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left: System + Scheduling */}
          <div className="space-y-6">
            <div className="rounded-lg border p-4 space-y-4">
              <div className="font-medium text-sm sm:text-base">System Settings</div>
              {/* Master */}
              <div className="flex items-center justify-between rounded-lg border p-3 gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm sm:text-base flex items-center gap-2">
                    {preferences.enabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4 text-muted-foreground" />}
                    Enable Notifications
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Turn all medication reminders on or off</div>
                </div>
                <Switch checked={preferences.enabled} onCheckedChange={(checked) => updatePreferences({ enabled: checked })} className="shrink-0" />
              </div>

              {/* Browser */}
              <div className="flex items-center justify-between rounded-lg border p-3 gap-3">
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
                      if (granted) updatePreferences({ browser_enabled: true });
                    } else {
                      updatePreferences({ browser_enabled: checked });
                    }
                  }}
                  className="shrink-0"
                />
              </div>
              {permission === "default" && (
                <Button onClick={requestPermission} variant="outline" className="w-full" size="sm">Enable Browser Notifications</Button>
              )}
              {permission === "denied" && (
                <div className="text-sm text-muted-foreground bg-destructive/10 p-3 rounded-lg">Notifications blocked. Enable them in your browser settings.</div>
              )}

              {/* Sound */}
              <div className="flex items-center justify-between rounded-lg border p-3 gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm sm:text-base flex items-center gap-2">
                    {preferences.sound_enabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}
                    Notification Sound
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Play a sound with notifications</div>
                </div>
                <Switch checked={preferences.sound_enabled} onCheckedChange={(checked) => updatePreferences({ sound_enabled: checked })} className="shrink-0" />
              </div>
            </div>

            {/* Scheduling */}
            <div className="rounded-lg border p-4 space-y-4">
              <div className="font-medium text-sm sm:text-base">Scheduling</div>
              <div className="space-y-3 rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <Label className="font-medium text-sm sm:text-base">Reminder Timing</Label>
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground">Notify me {preferences.reminder_minutes_before} minutes before each dose</div>
                <Slider value={[preferences.reminder_minutes_before]} onValueChange={([value]) => updatePreferences({ reminder_minutes_before: value })} min={5} max={60} step={5} className="w-full" />
                <div className="flex justify-between text-xs text-muted-foreground"><span>5 min</span><span>30 min</span><span>60 min</span></div>
              </div>

              <div className="space-y-3 rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <Moon className="w-4 h-4 text-muted-foreground" />
                  <Label className="font-medium text-sm sm:text-base">Quiet Hours</Label>
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground mb-3">Disable notifications during specific hours</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="quiet-start" className="text-xs">Start Time</Label>
                    <Input id="quiet-start" type="time" value={preferences.quiet_hours_start || ""} onChange={(e) => updatePreferences({ quiet_hours_start: e.target.value || null })} className="h-10 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quiet-end" className="text-xs">End Time</Label>
                    <Input id="quiet-end" type="time" value={preferences.quiet_hours_end || ""} onChange={(e) => updatePreferences({ quiet_hours_end: e.target.value || null })} className="h-10 text-sm" />
                  </div>
                </div>
                {preferences.quiet_hours_start && preferences.quiet_hours_end && (
                  <Button variant="ghost" size="sm" onClick={() => updatePreferences({ quiet_hours_start: null, quiet_hours_end: null })} className="w-full text-xs">Clear Quiet Hours</Button>
                )}

                <Button onClick={testNotification} variant="outline" className="w-full">Send Test Notification</Button>
              </div>
            </div>
          </div>

          {/* Right: Advanced (Types) */}
          <div className="space-y-6">
            <AccordionUI.Accordion type="single" collapsible defaultValue="types">
              <AccordionUI.AccordionItem value="types" className="border rounded-lg">
                <AccordionUI.AccordionTrigger className="px-3 py-2 text-sm">Advanced: Notification Types</AccordionUI.AccordionTrigger>
                <AccordionUI.AccordionContent className="px-4 pb-4 space-y-4">
                  {Array.from(
                    NOTIFICATION_TYPES.reduce((map, t) => {
                      const list = map.get(t.category) || [] as typeof NOTIFICATION_TYPES;
                      list.push(t);
                      map.set(t.category, list);
                      return map;
                    }, new Map<string, typeof NOTIFICATION_TYPES>())
                  ).map(([category, items]) => (
                    <div key={category} className="space-y-2">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">{category}</div>
                      <div className="grid gap-2">
                        {items.map((t) => {
                          const enabled = preferences.enabled_types?.includes(t.key) ?? true;
                          return (
                            <div key={t.key} className="flex items-center justify-between rounded-md border p-3">
                              <div className="min-w-0">
                                <div className="font-medium text-sm">{t.name}</div>
                                <div className="text-xs text-muted-foreground truncate">{t.description}</div>
                              </div>
                              <Switch checked={enabled} onCheckedChange={(checked) => {
                                const set = new Set(preferences.enabled_types || NOTIFICATION_TYPES.map(x=>x.key));
                                if (checked) set.add(t.key); else set.delete(t.key);
                                updatePreferences({ enabled_types: Array.from(set) });
                              }} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <div className="grid sm:grid-cols-2 gap-3 items-center">
                    <div className="text-sm">Default Type</div>
                    <Select value={preferences.default_type || "dose_due"} onValueChange={(val)=> updatePreferences({ default_type: val })}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Pick default" />
                      </SelectTrigger>
                      <SelectContent>
                        {NOTIFICATION_TYPES.filter(t => (preferences.enabled_types||NOTIFICATION_TYPES.map(x=>x.key)).includes(t.key)).map(t => (
                          <SelectItem key={t.key} value={t.key}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <div className="text-sm">Enable Actions on Notifications</div>
                    <Switch checked={preferences.use_actions ?? true} onCheckedChange={(checked)=> updatePreferences({ use_actions: checked })} />
                  </div>
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <div className="font-medium text-sm sm:text-base">Missed Dose Alerts</div>
                    <Switch checked={preferences.remind_for_missed} onCheckedChange={(checked) => updatePreferences({ remind_for_missed: checked })} className="shrink-0" />
                  </div>
                </AccordionUI.AccordionContent>
              </AccordionUI.AccordionItem>
            </AccordionUI.Accordion>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
