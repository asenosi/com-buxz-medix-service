import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Frequency-to-grace mapping configuration
 * Maps medication frequency types to their grace period parameters
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
 * Determines the dose status based on grace period rules
 * @param scheduledTime - When the dose was scheduled
 * @param takenAt - When the dose was actually taken (null if not taken)
 * @param gracePeriodMinutes - Minutes allowed after scheduled time
 * @param missedDoseCutoffMinutes - Minutes after which dose is considered MISSED
 * @returns "ON_TIME" | "LATE" | "MISSED" | "PENDING"
 */
function determineDoseStatus(
  scheduledTime: Date,
  takenAt: Date | null,
  gracePeriodMinutes: number,
  missedDoseCutoffMinutes: number
): string {
  const now = new Date();
  const scheduledTimestamp = scheduledTime.getTime();
  const graceEndTime = scheduledTimestamp + (gracePeriodMinutes * 60 * 1000);
  const missedCutoffTime = scheduledTimestamp + (missedDoseCutoffMinutes * 60 * 1000);

  // If not taken yet
  if (!takenAt) {
    if (now.getTime() > missedCutoffTime) {
      return "MISSED";
    }
    if (now.getTime() > scheduledTimestamp) {
      return "PENDING_LATE";
    }
    return "PENDING";
  }

  // If taken, check timing
  const takenTimestamp = takenAt.getTime();
  const minutesAfterScheduled = (takenTimestamp - scheduledTimestamp) / (60 * 1000);

  if (minutesAfterScheduled <= gracePeriodMinutes) {
    return "ON_TIME";
  }
  return "LATE";
}

/**
 * Calculates if a reminder should be sent
 * @param scheduledTime - When the dose is scheduled
 * @param reminderWindowMinutes - Minutes before scheduled time to send reminder
 * @returns true if reminder should be sent now
 */
function shouldSendReminder(
  scheduledTime: Date,
  reminderWindowMinutes: number
): boolean {
  const now = new Date();
  const reminderTime = scheduledTime.getTime() - (reminderWindowMinutes * 60 * 1000);
  return now.getTime() >= reminderTime && now.getTime() < scheduledTime.getTime();
}

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

    console.log('Fetching reminders for user:', user.id);

    // Get all active medications for user
    const { data: medications, error: medsError } = await supabase
      .from('medications')
      .select(`
        *,
        medication_schedules (*)
      `)
      .eq('user_id', user.id)
      .eq('active', true);

    if (medsError) throw medsError;

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get existing dose logs for today
    const { data: doseLogs, error: logsError } = await supabase
      .from('dose_logs')
      .select('*')
      .gte('scheduled_time', today.toISOString())
      .lt('scheduled_time', tomorrow.toISOString());

    if (logsError) throw logsError;

    const doseLogMap = new Map(
      doseLogs?.map(log => [`${log.medication_id}-${log.schedule_id}-${log.scheduled_time}`, log]) || []
    );

    // Generate reminders for each medication schedule
    const reminders: any[] = [];

    for (const medication of medications || []) {
      const config = FREQUENCY_CONFIG[medication.frequency_type as keyof typeof FREQUENCY_CONFIG] || {
        gracePeriodMinutes: medication.grace_period_minutes || 60,
        reminderWindowMinutes: medication.reminder_window_minutes || 15,
        missedDoseCutoffMinutes: medication.missed_dose_cutoff_minutes || 180,
      };

      for (const schedule of medication.medication_schedules || []) {
        if (!schedule.active) continue;

        // Create scheduled time for today
        const [hours, minutes] = schedule.time_of_day.split(':').map(Number);
        const scheduledTime = new Date(today);
        scheduledTime.setHours(hours, minutes, 0, 0);

        // Check if this dose is in the future or should still be tracked today
        if (scheduledTime < today && scheduledTime.getDate() !== today.getDate()) {
          continue;
        }

        const logKey = `${medication.id}-${schedule.id}-${scheduledTime.toISOString()}`;
        const existingLog = doseLogMap.get(logKey);

        const doseStatus = determineDoseStatus(
          scheduledTime,
          existingLog?.taken_at ? new Date(existingLog.taken_at) : null,
          config.gracePeriodMinutes,
          config.missedDoseCutoffMinutes
        );

        const sendReminder = shouldSendReminder(
          scheduledTime,
          config.reminderWindowMinutes
        );

        reminders.push({
          id: existingLog?.id || `pending-${logKey}`,
          medication_id: medication.id,
          medication_name: medication.name,
          dosage: medication.dosage,
          form: medication.form,
          schedule_id: schedule.id,
          scheduled_time: scheduledTime.toISOString(),
          time_of_day: schedule.time_of_day,
          with_food: schedule.with_food,
          special_instructions: schedule.special_instructions,
          status: existingLog?.status || 'pending',
          dose_status: doseStatus,
          taken_at: existingLog?.taken_at || null,
          snooze_until: existingLog?.snooze_until || null,
          notes: existingLog?.notes || null,
          grace_period_minutes: config.gracePeriodMinutes,
          reminder_window_minutes: config.reminderWindowMinutes,
          missed_dose_cutoff_minutes: config.missedDoseCutoffMinutes,
          should_send_reminder: sendReminder,
          frequency_type: medication.frequency_type,
        });
      }
    }

    // Sort by scheduled time
    reminders.sort((a, b) => 
      new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime()
    );

    console.log(`Generated ${reminders.length} reminders`);

    return new Response(
      JSON.stringify({ reminders }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-reminders:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});