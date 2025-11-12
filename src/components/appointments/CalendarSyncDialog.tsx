import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CalendarSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId?: string;
  appointmentData?: {
    title: string;
    date: string;
    time: string;
    location?: string;
    description?: string;
    duration_minutes?: number;
  };
}

export function CalendarSyncDialog({
  open,
  onOpenChange,
  appointmentId,
  appointmentData,
}: CalendarSyncDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showingCalendarPopup, setShowingCalendarPopup] = useState(false);

  const handleAllow = async () => {
    setIsLoading(true);
    try {
      // Check if user already has calendar sync enabled
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to sync with calendar");
        return;
      }

      const { data: existingSettings } = await supabase
        .from("calendar_sync_settings")
        .select("*")
        .eq("user_id", user.id)
        .eq("provider", "google")
        .single();

      if (existingSettings?.sync_enabled && existingSettings?.access_token) {
        // User already has calendar sync enabled, directly sync this appointment
        await syncAppointment();
      } else {
        // Need to initiate OAuth flow
        initiateGoogleOAuth();
      }
    } catch (error) {
      console.error("Calendar sync error:", error);
      toast.error("Failed to sync with calendar");
      setIsLoading(false);
    }
  };

  const initiateGoogleOAuth = () => {
    // Google OAuth configuration
    const clientId = "YOUR_GOOGLE_CLIENT_ID"; // This should be stored in secrets
    const redirectUri = `${window.location.origin}/auth/callback`;
    const scope = "https://www.googleapis.com/auth/calendar.events";
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scope)}&` +
      `access_type=offline&` +
      `prompt=consent`;

    setShowingCalendarPopup(true);
    
    // Open OAuth in a popup
    const width = 500;
    const height = 600;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    
    const popup = window.open(
      authUrl,
      "Google Calendar Authorization",
      `width=${width},height=${height},left=${left},top=${top}`
    );

    // Listen for OAuth callback
    const checkPopup = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(checkPopup);
        setShowingCalendarPopup(false);
        setIsLoading(false);
        // Check if sync was successful
        checkSyncStatus();
      }
    }, 500);
  };

  const syncAppointment = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("sync-calendar-event", {
        body: {
          appointmentId,
          appointmentData,
        },
      });

      if (error) throw error;

      toast.success("Appointment synced to Google Calendar!");
      onOpenChange(false);
    } catch (error) {
      console.error("Sync error:", error);
      toast.error("Failed to sync appointment");
    } finally {
      setIsLoading(false);
    }
  };

  const checkSyncStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("calendar_sync_settings")
      .select("*")
      .eq("user_id", user.id)
      .eq("provider", "google")
      .single();

    if (data?.sync_enabled) {
      await syncAppointment();
    }
  };

  const handleDontAllow = () => {
    onOpenChange(false);
  };

  const handleSkip = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden bg-background">
        <div className="flex flex-col min-h-[500px]">
          {/* Skip button */}
          <div className="flex justify-end p-4">
            <Button
              variant="ghost"
              onClick={handleSkip}
              className="text-muted-foreground"
            >
              skip
            </Button>
          </div>

          {/* Icon and content */}
          <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-primary/10 mb-6">
                <Calendar className="h-16 w-16 text-primary" />
              </div>
            </div>

            <h2 className="text-2xl font-bold mb-6">
              Sync your Medisafe appointments with your Calendar app to better manage your schedule
            </h2>

            <p className="text-muted-foreground mb-8">
              On the next screen, choose "Allow" to enable automatic updates when changes are made in the calendar app.
            </p>
          </div>

          {/* Action buttons */}
          <div className="px-8 pb-8 space-y-3">
            <div className="bg-muted/30 rounded-lg p-4 flex items-center justify-center gap-3">
              <Calendar className="h-6 w-6" />
              <span className="font-medium">Allow Medisafe to access your calendar?</span>
            </div>
            
            <Button
              onClick={handleAllow}
              disabled={isLoading || showingCalendarPopup}
              className="w-full h-12 text-base"
            >
              {showingCalendarPopup ? "Waiting for authorization..." : isLoading ? "Syncing..." : "Allow"}
            </Button>

            <Button
              variant="outline"
              onClick={handleDontAllow}
              disabled={isLoading || showingCalendarPopup}
              className="w-full h-12 text-base"
            >
              Don't allow
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}