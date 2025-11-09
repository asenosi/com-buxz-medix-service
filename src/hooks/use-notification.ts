import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface NotificationPreferences {
  id?: string;
  user_id: string;
  enabled: boolean;
  browser_enabled: boolean;
  sound_enabled: boolean;
  reminder_minutes_before: number;
  remind_for_missed: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  enabled_types?: string[] | null;
  default_type?: string | null;
  use_actions?: boolean | null;
}

export function useNotification() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  // Check notification permission status
  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Load user preferences
  const loadPreferences = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      if (!data) {
        // Create default preferences
        const defaultPrefs: NotificationPreferences = {
          user_id: session.user.id,
          enabled: true,
          browser_enabled: true,
          sound_enabled: true,
          reminder_minutes_before: 15,
          remind_for_missed: true,
          quiet_hours_start: null,
          quiet_hours_end: null,
          enabled_types: ["dose_due", "refill_reminder", "streak_milestone"],
          default_type: "dose_due",
          use_actions: true,
        };

        const { data: newData, error: insertError } = await supabase
          .from("notification_preferences")
          .insert(defaultPrefs)
          .select()
          .single();

        if (insertError) throw insertError;
        setPreferences(newData);
      } else {
        setPreferences(data);
      }
    } catch (error) {
      console.error("Failed to load notification preferences:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) {
      toast.error("Browser doesn't support notifications");
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === "granted") {
        toast.success("Notifications enabled!");
        return true;
      } else if (result === "denied") {
        toast.error("Notification permission denied");
        return false;
      }
      return false;
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      toast.error("Failed to request notification permission");
      return false;
    }
  }, []);

  // Update preferences
  const updatePreferences = useCallback(async (updates: Partial<NotificationPreferences>) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Ensure we always have a row; use upsert to avoid 0-row update errors
      // Only include keys that exist on the loaded record to avoid unknown-column errors
      const allowed = new Set(Object.keys(preferences ?? {}));
      const filteredUpdates = preferences
        ? (Object.fromEntries(
            Object.entries(updates).filter(([k]) => allowed.has(k))
          ) as Partial<NotificationPreferences>)
        : updates;

      // If nothing to change (e.g., field not present on this schema), exit quietly
      if (!filteredUpdates || Object.keys(filteredUpdates).length === 0) {
        return;
      }

      // Ensure we operate on a single row by id (handles duplicates safely)
      const existingId = preferences?.id
        ?? (await supabase
              .from("notification_preferences")
              .select("id")
              .eq("user_id", session.user.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle()
            ).data?.id;

      if (existingId) {
        const { data, error } = await supabase
          .from("notification_preferences")
          .update(filteredUpdates)
          .eq("id", existingId)
          .select()
          .single();
        if (error) throw error;
        setPreferences(data);
      } else {
        // Insert a minimal valid row (only required NOT NULL columns), merge known updates
        const base = {
          user_id: session.user.id,
          enabled: true,
          browser_enabled: true,
          sound_enabled: true,
          reminder_minutes_before: 15,
          remind_for_missed: true,
          quiet_hours_start: null as string | null,
          quiet_hours_end: null as string | null,
        };
        const insertPayload = { ...base, ...filteredUpdates } as NotificationPreferences;
        const { data, error } = await supabase
          .from("notification_preferences")
          .insert(insertPayload)
          .select()
          .single();
        if (error) throw error;
        setPreferences(data);
      }
      toast.success("Notification settings updated");
    } catch (err) {
      console.error("Failed to update preferences:", err);
      let msg = "Unknown error";
      if (typeof err === "string") {
        msg = err;
      } else if (err && typeof err === "object") {
        const e = err as { message?: string; hint?: string; code?: string };
        msg = e.message || e.hint || e.code || msg;
      }
      toast.error(`Failed to update notification settings: ${msg}`);
    }
  }, [preferences]);

  // Check if within quiet hours
  const isQuietHours = useCallback(() => {
    if (!preferences?.quiet_hours_start || !preferences?.quiet_hours_end) {
      return false;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [startHour, startMin] = preferences.quiet_hours_start.split(":").map(Number);
    const [endHour, endMin] = preferences.quiet_hours_end.split(":").map(Number);
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Quiet hours span midnight
      return currentTime >= startTime || currentTime <= endTime;
    }
  }, [preferences]);

  // Send notification
  const sendNotification = useCallback((title: string, options?: NotificationOptions & { url?: string }) => {
    if (!preferences?.enabled || !preferences?.browser_enabled) {
      return;
    }

    if (permission !== "granted") {
      return;
    }

    if (isQuietHours()) {
      console.log("Skipping notification during quiet hours");
      return;
    }

    try {
      const notificationOptions: NotificationOptions = {
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        requireInteraction: true, // Keeps notification in tray until dismissed
        tag: options?.tag || 'medication-reminder', // Groups similar notifications
        silent: !preferences?.sound_enabled,
        ...options,
      };

      const notification = new Notification(title, notificationOptions);

      if (options?.url) {
        notification.onclick = () => {
          window.focus();
          window.location.href = options.url!;
          notification.close();
        };
      }

      if (preferences?.sound_enabled) {
        // Play notification sound (you can add a sound file)
        const audio = new Audio("/notification.mp3");
        audio.play().catch(() => {
          // Silently fail if sound can't play
        });
      }

      return notification;
    } catch (error) {
      console.error("Failed to send notification:", error);
    }
  }, [permission, preferences, isQuietHours]);

  return {
    permission,
    preferences,
    loading,
    requestPermission,
    updatePreferences,
    sendNotification,
    isQuietHours,
    loadPreferences,
  };
}
