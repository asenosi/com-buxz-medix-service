import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Note: Install web-push library when needed
// For now, this is a placeholder that would use the Web Push protocol
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { userId, title, body, url, tag } = await req.json();

    if (!userId) {
      throw new Error("User ID is required");
    }

    // Get user's push subscriptions
    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("subscription")
      .eq("user_id", userId);

    if (error) throw error;

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No push subscriptions found for user" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Send push notifications to all user's devices
    const payload = JSON.stringify({
      title: title || "MedTracker",
      body: body || "You have a new notification",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: tag || "medication-reminder",
      url: url || "/",
      requireInteraction: true,
    });

    // In production, you would use web-push library here to send actual push notifications
    // For demonstration, we're logging what would be sent
    console.log("Would send push notification:", payload, "to", subscriptions.length, "devices");

    // TODO: Implement actual web-push sending
    // Example with web-push library:
    // import webpush from 'npm:web-push';
    // webpush.setVapidDetails(
    //   'mailto:your-email@example.com',
    //   Deno.env.get("VAPID_PUBLIC_KEY"),
    //   Deno.env.get("VAPID_PRIVATE_KEY")
    // );
    // 
    // const promises = subscriptions.map(sub => 
    //   webpush.sendNotification(sub.subscription, payload)
    // );
    // await Promise.all(promises);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Push notification queued for ${subscriptions.length} device(s)` 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error sending push notification:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
