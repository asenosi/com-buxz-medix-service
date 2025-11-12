import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, appointmentId, code } = await req.json();

    // Check if we have Google OAuth credentials configured
    const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID');
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET');
    const REDIRECT_URI = Deno.env.get('GOOGLE_OAUTH_REDIRECT_URI') || 
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/sync-calendar-event`;

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.log('Google OAuth credentials not configured');
      return new Response(
        JSON.stringify({ 
          error: 'Calendar sync is not configured. Please contact support.',
          needsSetup: true 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'authorize') {
      // Check if user already has valid token
      const { data: syncSettings } = await supabaseClient
        .from('calendar_sync_settings')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', 'google')
        .maybeSingle();

      if (syncSettings?.access_token && syncSettings.token_expiry) {
        const expiryDate = new Date(syncSettings.token_expiry);
        if (expiryDate > new Date()) {
          // Token is still valid, sync the event directly
          await syncAppointmentToCalendar(supabaseClient, user.id, appointmentId, syncSettings.access_token);
          return new Response(
            JSON.stringify({ success: true, message: 'Event synced successfully' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Generate OAuth URL
      const scopes = [
        'https://www.googleapis.com/auth/calendar.events',
      ].join(' ');

      const state = btoa(JSON.stringify({ userId: user.id, appointmentId }));

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${GOOGLE_CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent(scopes)}` +
        `&access_type=offline` +
        `&prompt=consent` +
        `&state=${encodeURIComponent(state)}`;

      return new Response(
        JSON.stringify({ authUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'callback' && code) {
      // Exchange code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        console.error('Token exchange failed:', error);
        throw new Error('Failed to exchange authorization code');
      }

      const tokens = await tokenResponse.json();
      
      // Calculate token expiry
      const expiryDate = new Date();
      expiryDate.setSeconds(expiryDate.getSeconds() + tokens.expires_in);

      // Store tokens in database
      await supabaseClient
        .from('calendar_sync_settings')
        .upsert({
          user_id: user.id,
          provider: 'google',
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expiry: expiryDate.toISOString(),
          sync_enabled: true,
        }, {
          onConflict: 'user_id,provider'
        });

      // Sync the appointment
      await syncAppointmentToCalendar(supabaseClient, user.id, appointmentId, tokens.access_token);

      return new Response(
        JSON.stringify({ success: true, message: 'Calendar sync enabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in sync-calendar-event:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function syncAppointmentToCalendar(
  supabaseClient: any,
  userId: string,
  appointmentId: string,
  accessToken: string
) {
  // Get appointment details
  const { data: appointment, error: appointmentError } = await supabaseClient
    .from('appointments')
    .select('*')
    .eq('id', appointmentId)
    .eq('user_id', userId)
    .single();

  if (appointmentError || !appointment) {
    throw new Error('Appointment not found');
  }

  // Create Google Calendar event
  const startDateTime = `${appointment.appointment_date}T${appointment.appointment_time}`;
  const endDate = new Date(startDateTime);
  endDate.setMinutes(endDate.getMinutes() + (appointment.duration_minutes || 30));

  const event = {
    summary: appointment.title,
    description: appointment.description || '',
    location: appointment.location || '',
    start: {
      dateTime: startDateTime,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: appointment.reminder_minutes_before || 60 },
      ],
    },
  };

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
    const error = await calendarResponse.text();
    console.error('Failed to create calendar event:', error);
    throw new Error('Failed to create calendar event');
  }

  const calendarEvent = await calendarResponse.json();
  
  // Update sync timestamp
  await supabaseClient
    .from('calendar_sync_settings')
    .update({ last_sync_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('provider', 'google');

  console.log('Event synced successfully:', calendarEvent.id);
}