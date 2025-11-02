import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Frequency-to-grace mapping - automatically applies grace periods based on frequency
 */
const FREQUENCY_CONFIG = {
  "Once daily": {
    intervalHours: 24,
    gracePeriodMinutes: 120,
    reminderWindowMinutes: 30,
    missedDoseCutoffMinutes: 360,
  },
  "Twice daily": {
    intervalHours: 12,
    gracePeriodMinutes: 60,
    reminderWindowMinutes: 20,
    missedDoseCutoffMinutes: 240,
  },
  "Three times daily": {
    intervalHours: 8,
    gracePeriodMinutes: 30,
    reminderWindowMinutes: 15,
    missedDoseCutoffMinutes: 120,
  },
  "Four times daily": {
    intervalHours: 6,
    gracePeriodMinutes: 15,
    reminderWindowMinutes: 10,
    missedDoseCutoffMinutes: 60,
  },
  "With meals": {
    intervalHours: null,
    gracePeriodMinutes: 15,
    reminderWindowMinutes: 10,
    missedDoseCutoffMinutes: 60,
  },
  "Before meals (fasting)": {
    intervalHours: null,
    gracePeriodMinutes: 15,
    reminderWindowMinutes: 10,
    missedDoseCutoffMinutes: 60,
  },
};

/**
 * Create medication with schedules
 * Automatically applies grace period settings based on frequency type
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify user
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const body = await req.json();
    const {
      name,
      dosage,
      form,
      frequency_type,
      intake_times, // Array of time strings like ["08:00", "20:00"]
      start_date,
      end_date,
      with_food,
      special_instructions,
      pills_remaining,
      total_pills,
    } = body;

    console.log('Creating medication:', { name, frequency_type, intake_times });

    // Validate required fields
    if (!name || !dosage || !frequency_type || !intake_times || intake_times.length === 0) {
      throw new Error('Missing required fields: name, dosage, frequency_type, intake_times');
    }

    // Get grace period configuration
    const config = FREQUENCY_CONFIG[frequency_type as keyof typeof FREQUENCY_CONFIG];
    if (!config) {
      throw new Error(`Invalid frequency_type: ${frequency_type}`);
    }

    // Create medication with grace period settings
    const { data: medication, error: medError } = await supabase
      .from('medications')
      .insert({
        user_id: user.id,
        name,
        dosage,
        form: form || 'pill',
        frequency_type,
        grace_period_minutes: config.gracePeriodMinutes,
        reminder_window_minutes: config.reminderWindowMinutes,
        missed_dose_cutoff_minutes: config.missedDoseCutoffMinutes,
        start_date: start_date || new Date().toISOString(),
        end_date,
        pills_remaining,
        total_pills,
        active: true,
      })
      .select()
      .single();

    if (medError) throw medError;

    console.log('Medication created:', medication.id);

    // Create schedules for each intake time
    const schedules = intake_times.map((time: string) => ({
      medication_id: medication.id,
      time_of_day: time,
      frequency_type,
      with_food: with_food || false,
      special_instructions,
      active: true,
    }));

    const { data: createdSchedules, error: schedError } = await supabase
      .from('medication_schedules')
      .insert(schedules)
      .select();

    if (schedError) throw schedError;

    console.log(`Created ${createdSchedules.length} schedules`);

    return new Response(
      JSON.stringify({
        success: true,
        medication: {
          ...medication,
          schedules: createdSchedules,
        },
        message: `Medication "${name}" created with ${createdSchedules.length} scheduled times`,
        grace_period_info: {
          grace_period_minutes: config.gracePeriodMinutes,
          reminder_window_minutes: config.reminderWindowMinutes,
          missed_dose_cutoff_minutes: config.missedDoseCutoffMinutes,
          description: `Doses taken within ${config.gracePeriodMinutes} minutes are ON_TIME. After ${config.missedDoseCutoffMinutes} minutes, doses are MISSED.`,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-medication:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});