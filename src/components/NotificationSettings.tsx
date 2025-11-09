import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Volume2, VolumeX, Clock, Moon, Check, ChevronDown, Smartphone, ExternalLink } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { useNotification } from "@/hooks/use-notification";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { NOTIFICATION_TYPES } from "@/constants/notification-types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as AccordionUI from "@/components/ui/accordion";
import { useNavigate } from "react-router-dom";

export const NotificationSettings = () => {
  const navigate = useNavigate();
  const { 
    permission, 
    preferences, 
    loading,
    pushSubscription,
    requestPermission,
    updatePreferences,
    sendNotification,
    subscribeToPush,
    unsubscribeFromPush,
  } = useNotification();

  const [advancedOpen, setAdvancedOpen] = useState(false);

  const isInstalled = window.matchMedia("(display-mode: standalone)").matches;

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
    <div className="space-y-6">
      {/* Install PWA Banner */}
      {(!isInstalled || permission !== "granted") && (
        <Card className="border-primary/20 bg-primary/5 animate-fade-in">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                <Smartphone className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm mb-1">
                  {!isInstalled ? "Install App for Better Notifications" : "Enable System Notifications"}
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
                  {!isInstalled 
                    ? "Install MedTracker as an app to receive notifications in your phone's notification tray, just like other apps."
                    : "Allow notifications to receive medication reminders in your system notification tray."
                  }
                </p>
                <Button 
                  size="sm" 
                  onClick={() => navigate("/install")}
                  className="h-8 text-xs"
                >
                  <ExternalLink className="w-3 h-3 mr-1.5" />
                  {!isInstalled ? "Install App" : "Setup Guide"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Settings Card */}
      <Card className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
        <CardHeader>
          <CardTitle className="text-lg">System Settings</CardTitle>
          <CardDescription>Manage notification permissions and preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Master */}
          <div className="flex items-center justify-between p-3 gap-3 rounded-lg hover:bg-muted/30 transition-colors">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm flex items-center gap-2">
                {preferences.enabled ? <Bell className="w-4 h-4 shrink-0" /> : <BellOff className="w-4 h-4 shrink-0 text-muted-foreground" />}
                <span className="truncate">Enable Notifications</span>
              </div>
              <div className="text-xs text-muted-foreground line-clamp-1">Turn all medication reminders on or off</div>
            </div>
            <Switch checked={preferences.enabled} onCheckedChange={(checked) => updatePreferences({ enabled: checked })} className="shrink-0" />
          </div>

          {/* Browser */}
          <div className="flex items-center justify-between p-3 gap-3 rounded-lg hover:bg-muted/30 transition-colors">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">Browser Notifications</div>
              <div className="text-xs text-muted-foreground line-clamp-1">
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
          <div className="flex items-center justify-between p-3 gap-3 rounded-lg hover:bg-muted/30 transition-colors">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm flex items-center gap-2">
                {preferences.sound_enabled ? <Volume2 className="w-4 h-4 shrink-0" /> : <VolumeX className="w-4 h-4 shrink-0 text-muted-foreground" />}
                <span className="truncate">Notification Sound</span>
              </div>
              <div className="text-xs text-muted-foreground line-clamp-1">Play a sound with notifications</div>
            </div>
            <Switch checked={preferences.sound_enabled} onCheckedChange={(checked) => updatePreferences({ sound_enabled: checked })} className="shrink-0" />
          </div>

          {/* Push Notifications */}
          <div className="flex items-center justify-between p-3 gap-3 rounded-lg hover:bg-muted/30 transition-colors">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">Push Notifications</div>
              <div className="text-xs text-muted-foreground line-clamp-1">
                {pushSubscription ? "Background notifications enabled" : "Enable background push"}
              </div>
            </div>
            <Switch
              checked={!!pushSubscription}
              onCheckedChange={async (checked) => {
                if (checked) {
                  await subscribeToPush();
                } else {
                  await unsubscribeFromPush();
                }
              }}
              className="shrink-0"
            />
          </div>
        </CardContent>
      </Card>

      {/* Scheduling Card */}
      <Card className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
        <CardHeader>
          <CardTitle className="text-lg">Scheduling</CardTitle>
          <CardDescription>Configure when you receive notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 p-3 rounded-lg bg-muted/20">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 shrink-0 text-muted-foreground" />
              <Label className="font-medium text-sm truncate">Reminder Timing</Label>
            </div>
            <div className="text-xs text-muted-foreground">Notify me {preferences.reminder_minutes_before} minutes before each dose</div>
            <Slider value={[preferences.reminder_minutes_before]} onValueChange={([value]) => updatePreferences({ reminder_minutes_before: value })} min={5} max={60} step={5} className="w-full" />
            <div className="flex justify-between text-xs text-muted-foreground"><span>5 min</span><span>30 min</span><span>60 min</span></div>
          </div>

          <div className="space-y-3 p-3 rounded-lg bg-muted/20">
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4 shrink-0 text-muted-foreground" />
              <Label className="font-medium text-sm truncate">Quiet Hours</Label>
            </div>
            <div className="text-xs text-muted-foreground mb-3">Disable notifications during specific hours</div>
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
          </div>

          <Button onClick={testNotification} variant="outline" className="w-full">Send Test Notification</Button>
        </CardContent>
      </Card>

      {/* Advanced Settings Card */}
      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <Card className="animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <CardTitle className="text-lg">Advanced Settings</CardTitle>
                  <CardDescription>Customize notification types and behavior</CardDescription>
                </div>
                <ChevronDown className={`h-5 w-5 shrink-0 transition-transform duration-200 ${advancedOpen ? 'rotate-180' : ''}`} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
          <AccordionUI.Accordion type="single" collapsible defaultValue="types">
            <AccordionUI.AccordionItem value="types" className="border-0">
              <AccordionUI.AccordionTrigger className="px-3 py-2 text-sm bg-muted/20 rounded-lg hover:bg-muted/30">Notification Types</AccordionUI.AccordionTrigger>
              <AccordionUI.AccordionContent className="px-3 pb-3 space-y-3 overflow-hidden">
                {Array.from(
                  NOTIFICATION_TYPES.reduce((map, t) => {
                    const list = map.get(t.category) || [] as typeof NOTIFICATION_TYPES;
                    list.push(t);
                    map.set(t.category, list);
                    return map;
                  }, new Map<string, typeof NOTIFICATION_TYPES>())
                ).map(([category, items]) => (
                  <div key={category} className="space-y-2 overflow-hidden">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground truncate">{category}</div>
                    <div className="grid gap-2">
                      {items.map((t) => {
                        const enabled = preferences.enabled_types?.includes(t.key) ?? true;
                        return (
                          <div key={t.key} className="flex items-center justify-between p-2.5 gap-3 rounded-md hover:bg-muted/40 transition-colors">
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-sm truncate">{t.name}</div>
                              <div className="text-xs text-muted-foreground line-clamp-2">{t.description}</div>
                            </div>
                            <Switch checked={enabled} onCheckedChange={(checked) => {
                              const set = new Set(preferences.enabled_types || NOTIFICATION_TYPES.map(x=>x.key));
                              if (checked) set.add(t.key); else set.delete(t.key);
                              updatePreferences({ enabled_types: Array.from(set) });
                            }} className="shrink-0" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <div className="grid sm:grid-cols-2 gap-3 items-center overflow-hidden pt-2">
                  <div className="text-sm truncate">Default Type</div>
                  <Select value={preferences.default_type || "dose_due"} onValueChange={(val)=> updatePreferences({ default_type: val })}>
                    <SelectTrigger className="w-full min-w-0">
                      <SelectValue placeholder="Pick default" />
                    </SelectTrigger>
                    <SelectContent>
                      {NOTIFICATION_TYPES.filter(t => (preferences.enabled_types||NOTIFICATION_TYPES.map(x=>x.key)).includes(t.key)).map(t => (
                        <SelectItem key={t.key} value={t.key}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </AccordionUI.AccordionContent>
            </AccordionUI.AccordionItem>
          </AccordionUI.Accordion>

          <div className="flex items-center justify-between p-3 gap-3 rounded-lg hover:bg-muted/30 transition-colors">
            <div className="text-sm flex-1 min-w-0 truncate">Enable Actions on Notifications</div>
            <Switch checked={preferences.use_actions ?? true} onCheckedChange={(checked)=> updatePreferences({ use_actions: checked })} className="shrink-0" />
          </div>
          
          <div className="flex items-center justify-between p-3 gap-3 rounded-lg hover:bg-muted/30 transition-colors">
            <div className="font-medium text-sm flex-1 min-w-0 truncate">Missed Dose Alerts</div>
            <Switch checked={preferences.remind_for_missed} onCheckedChange={(checked) => updatePreferences({ remind_for_missed: checked })} className="shrink-0" />
          </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
};
