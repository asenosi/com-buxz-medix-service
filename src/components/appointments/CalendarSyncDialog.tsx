import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CalendarSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
}

export function CalendarSyncDialog({ open, onOpenChange, appointmentId }: CalendarSyncDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleAllow = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in");
        return;
      }

      // Call edge function to initiate Google OAuth flow
      const { data, error } = await supabase.functions.invoke('sync-calendar-event', {
        body: {
          action: 'authorize',
          appointmentId,
        },
      });

      if (error) throw error;

      if (data?.authUrl) {
        // Open Google OAuth page
        window.location.href = data.authUrl;
      } else {
        // Already authorized, sync the event
        toast.success("Appointment synced with your calendar", {
          style: {
            background: "hsl(var(--success))",
            color: "hsl(var(--success-foreground))",
            border: "1px solid hsl(var(--success))",
          },
        });
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Calendar sync error:", error);
      toast.error("Failed to sync with calendar");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDontAllow = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 bg-card/95 backdrop-blur-sm border-border/50">
        <div className="flex flex-col items-center text-center p-8 space-y-6">
          {/* Icon */}
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
            <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/10">
              <CalendarIcon className="h-12 w-12 text-primary" />
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none">
                  <path d="M10 14.5L8 12.5L6.5 14L10 17.5L17.5 10L16 8.5L10 14.5Z" fill="currentColor" />
                </svg>
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">
              Sync your Medisafe appointments with your Calendar app to better manage your schedule
            </h2>
          </div>

          {/* Subtitle */}
          <p className="text-sm text-muted-foreground max-w-sm">
            On the next screen, choose "Allow" to enable automatic updates when changes are made in the calendar app.
          </p>

          {/* Permission card */}
          <div className="w-full bg-background/50 rounded-2xl p-6 space-y-6 border border-border/50">
            <div className="flex items-center justify-center">
              <div className="w-16 h-16 rounded-lg bg-background flex items-center justify-center border border-border">
                <CalendarIcon className="w-8 h-8" />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">
                Allow Medisafe to access your calendar?
              </h3>

              <Button
                onClick={handleAllow}
                disabled={isLoading}
                className="w-full h-12 text-base font-medium"
              >
                {isLoading ? "Connecting..." : "Allow"}
              </Button>

              <Button
                onClick={handleDontAllow}
                variant="ghost"
                disabled={isLoading}
                className="w-full h-12 text-base font-medium text-primary"
              >
                Don't allow
              </Button>
            </div>
          </div>

          {/* Skip button */}
          <Button
            onClick={handleDontAllow}
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
          >
            Skip
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}