import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Update reminder status endpoint
 * Handles: taken, snoozed, skipped, missed
 * Calculates dose_status based on grace periods
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
      medication_id,
      schedule_id,
      scheduled_time,
      status, // 'taken', 'snoozed', 'skipped', 'missed'
      notes,
      snooze_minutes,
    } = body;

    console.log('Updating reminder status:', { medication_id, schedule_id, status });

    // Validate required fields
    if (!medication_id || !schedule_id || !scheduled_time || !status) {
      throw new Error('Missing required fields: medication_id, schedule_id, scheduled_time, status');
    }

    // Verify medication belongs to user
    const { data: medication, error: medError } = await supabase
      .from('medications')
      .select('*, medication_schedules!inner(*)')
      .eq('id', medication_id)
      .eq('user_id', user.id)
      .single();

    if (medError || !medication) {
      throw new Error('Medication not found or unauthorized');
    }

    // Get grace period settings
    const gracePeriodMinutes = medication.grace_period_minutes || 60;
    const missedDoseCutoffMinutes = medication.missed_dose_cutoff_minutes || 180;

    // Calculate dose_status based on timing
    let doseStatus = 'PENDING';
    let takenAt = null;
    let snoozeUntil = null;

    const scheduledDate = new Date(scheduled_time);
    const now = new Date();
    const minutesAfterScheduled = (now.getTime() - scheduledDate.getTime()) / (60 * 1000);

    if (status === 'taken') {
      takenAt = now.toISOString();
      
      // Determine if taken ON_TIME or LATE
      if (minutesAfterScheduled <= gracePeriodMinutes) {
        doseStatus = 'ON_TIME';
      } else if (minutesAfterScheduled <= missedDoseCutoffMinutes) {
        doseStatus = 'LATE';
      } else {
        doseStatus = 'MISSED'; // Taken but way too late
      }
    } else if (status === 'snoozed') {
      // Calculate snooze_until
      snoozeUntil = new Date(now.getTime() + (snooze_minutes || 10) * 60 * 1000).toISOString();
      doseStatus = 'PENDING';
    } else if (status === 'skipped') {
      doseStatus = 'MISSED';
    } else if (status === 'missed') {
      doseStatus = 'MISSED';
    }

    // Check if dose log already exists
    const { data: existingLog } = await supabase
      .from('dose_logs')
      .select('id')
      .eq('medication_id', medication_id)
      .eq('schedule_id', schedule_id)
      .eq('scheduled_time', scheduled_time)
      .maybeSingle();

    let result;
    
    if (existingLog) {
      // Update existing log
      const { data, error } = await supabase
        .from('dose_logs')
        .update({
          status,
          dose_status: doseStatus,
          taken_at: takenAt,
          snooze_until: snoozeUntil,
          notes,
        })
        .eq('id', existingLog.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Create new log
      const { data, error } = await supabase
        .from('dose_logs')
        .insert({
          medication_id,
          schedule_id,
          scheduled_time,
          scheduled_for: scheduled_time,
          status,
          dose_status: doseStatus,
          taken_at: takenAt,
          snooze_until: snoozeUntil,
          notes,
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    // If status is 'taken', decrement pills_remaining if medication tracks pills
    if (status === 'taken' && medication.pills_remaining !== null && medication.pills_remaining > 0) {
      const { error: updateError } = await supabase
        .from('medications')
        .update({
          pills_remaining: medication.pills_remaining - 1,
        })
        .eq('id', medication_id);

      if (updateError) {
        console.error('Error updating pills_remaining:', updateError);
      }
    }

    console.log('Reminder updated successfully:', result.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        dose_log: result,
        message: `Dose marked as ${status}`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in update-reminder-status:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});