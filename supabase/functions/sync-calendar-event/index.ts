import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { appointmentId, appointmentData } = await req.json();

    console.log('Syncing appointment:', { appointmentId, appointmentData });

    // Get user's calendar sync settings
    const { data: syncSettings, error: settingsError } = await supabaseClient
      .from('calendar_sync_settings')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'google')
      .single();

    if (settingsError || !syncSettings?.access_token) {
      throw new Error('Calendar sync not configured');
    }

    // Check if token is expired and refresh if needed
    let accessToken = syncSettings.access_token;
    if (syncSettings.token_expiry && new Date(syncSettings.token_expiry) < new Date()) {
      // Token expired, refresh it
      const refreshedToken = await refreshGoogleToken(syncSettings.refresh_token);
      accessToken = refreshedToken.access_token;

      // Update the stored token
      await supabaseClient
        .from('calendar_sync_settings')
        .update({
          access_token: refreshedToken.access_token,
          token_expiry: new Date(Date.now() + refreshedToken.expires_in * 1000).toISOString(),
        })
        .eq('user_id', user.id)
        .eq('provider', 'google');
    }

    // Create Google Calendar event
    const event = {
      summary: appointmentData.title,
      description: appointmentData.description || '',
      location: appointmentData.location || '',
      start: {
        dateTime: `${appointmentData.date}T${appointmentData.time}:00`,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: calculateEndTime(appointmentData.date, appointmentData.time, appointmentData.duration_minutes || 30),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    };

    console.log('Creating calendar event:', event);

    const calendarResponse = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (!calendarResponse.ok) {
      const errorData = await calendarResponse.text();
      console.error('Google Calendar API error:', errorData);
      throw new Error(`Failed to create calendar event: ${errorData}`);
    }

    const calendarEvent = await calendarResponse.json();
    console.log('Calendar event created:', calendarEvent.id);

    // Update last sync time
    await supabaseClient
      .from('calendar_sync_settings')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('provider', 'google');

    return new Response(
      JSON.stringify({
        success: true,
        eventId: calendarEvent.id,
        eventLink: calendarEvent.htmlLink,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in sync-calendar-event function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

async function refreshGoogleToken(refreshToken: string) {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId!,
      client_secret: clientSecret!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh token');
  }

  return await response.json();
}

function calculateEndTime(date: string, time: string, durationMinutes: number): string {
  const startDateTime = new Date(`${date}T${time}:00`);
  const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60000);
  return endDateTime.toISOString();
}