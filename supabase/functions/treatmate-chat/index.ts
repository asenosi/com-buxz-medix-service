import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const tools = [
  {
    type: "function",
    function: {
      name: "log_dose",
      description:
        "Record that a user has taken a medication dose. Use when the user says they took their medication. IMPORTANT: Always call list_medications first to check the scheduled times, then specify the correct scheduled_time for the dose being logged.",
      parameters: {
        type: "object",
        properties: {
          medication_name: {
            type: "string",
            description: "Name of the medication taken",
          },
          scheduled_time: {
            type: "string",
            description: "The scheduled time this dose corresponds to, in HH:MM format (24h). Must match one of the medication's scheduled times. If the user doesn't specify, ask which time slot they mean.",
          },
          status: {
            type: "string",
            enum: ["taken", "skipped", "snoozed"],
            description: "Whether the dose was taken, skipped, or snoozed",
          },
          notes: {
            type: "string",
            description: "Optional notes about the dose",
          },
        },
        required: ["medication_name", "status"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "schedule_appointment",
      description:
        "Schedule a new medical appointment. Use when the user wants to book or create an appointment.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Appointment title" },
          appointment_date: {
            type: "string",
            description: "Date in YYYY-MM-DD format",
          },
          appointment_time: {
            type: "string",
            description: "Time in HH:MM format (24h)",
          },
          doctor_name: {
            type: "string",
            description: "Name of the doctor (optional)",
          },
          location: {
            type: "string",
            description: "Location of the appointment (optional)",
          },
          appointment_type: {
            type: "string",
            enum: [
              "checkup",
              "follow_up",
              "lab_test",
              "imaging",
              "procedure",
              "consultation",
              "vaccination",
              "therapy",
              "other",
            ],
            description: "Type of appointment",
          },
          notes: {
            type: "string",
            description: "Additional notes (optional)",
          },
        },
        required: ["title", "appointment_date", "appointment_time"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_medications",
      description:
        "List the user's current active medications. Use when user asks what medications they have.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "list_upcoming_appointments",
      description:
        "List the user's upcoming appointments. Use when user asks about their schedule.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
];

async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string
): Promise<string> {
  switch (toolName) {
    case "log_dose": {
      const { medication_name, status, notes, scheduled_time: requestedTime } = args as {
        medication_name: string;
        status: string;
        notes?: string;
        scheduled_time?: string;
      };
      console.log(`[log_dose] medication_name="${medication_name}", status="${status}", requestedTime="${requestedTime ?? 'none'}", userId="${userId}"`);

      // Find the medication
      const { data: meds, error: medErr } = await supabaseAdmin
        .from("medications")
        .select("id, name, pills_remaining")
        .eq("user_id", userId)
        .eq("active", true)
        .ilike("name", `%${medication_name}%`)
        .limit(1);

      console.log(`[log_dose] meds found: ${meds?.length ?? 0}, error: ${medErr?.message ?? 'none'}`);

      if (medErr || !meds?.length) {
        return JSON.stringify({
          success: false,
          message: `Could not find a medication matching "${medication_name}". Please check the name and try again.`,
        });
      }

      const med = meds[0];
      console.log(`[log_dose] matched medication: ${med.name} (${med.id})`);

      // Find all active schedules for this medication
      const { data: schedules } = await supabaseAdmin
        .from("medication_schedules")
        .select("id, time_of_day")
        .eq("medication_id", med.id)
        .eq("active", true)
        .order("time_of_day");

      console.log(`[log_dose] schedules found: ${schedules?.length ?? 0}`);

      if (!schedules?.length) {
        return JSON.stringify({
          success: false,
          message: `No active schedule found for ${med.name}.`,
        });
      }

      // Match to the correct schedule
      let schedule;
      if (schedules.length === 1) {
        schedule = schedules[0];
      } else if (requestedTime) {
        // Match by time (compare HH:MM)
        const normalizedReq = requestedTime.substring(0, 5);
        schedule = schedules.find((s) => s.time_of_day.substring(0, 5) === normalizedReq);
        if (!schedule) {
          const availableTimes = schedules.map((s) => s.time_of_day.substring(0, 5)).join(", ");
          return JSON.stringify({
            success: false,
            message: `No schedule at ${requestedTime} for ${med.name}. Available times: ${availableTimes}. Which one did you take?`,
          });
        }
      } else {
        // Multiple schedules, no time specified — ask the user
        const availableTimes = schedules.map((s) => s.time_of_day.substring(0, 5)).join(", ");
        return JSON.stringify({
          success: false,
          message: `${med.name} has multiple scheduled times: ${availableTimes}. Which dose did you take?`,
        });
      }

      const now = new Date();
      const todayDate = now.toISOString().split("T")[0];
      // Build the scheduled_for timestamp using the schedule's time_of_day
      const scheduledForTimestamp = `${todayDate}T${schedule.time_of_day}`;

      // Check if a dose log already exists for this medication+schedule today
      const { data: existingLogs } = await supabaseAdmin
        .from("dose_logs")
        .select("id")
        .eq("medication_id", med.id)
        .eq("schedule_id", schedule.id)
        .gte("scheduled_for", `${todayDate}T00:00:00Z`)
        .lte("scheduled_for", `${todayDate}T23:59:59Z`)
        .limit(1);

      console.log(`[log_dose] existing logs today: ${existingLogs?.length ?? 0}`);

      if (existingLogs?.length) {
        const { error: updateErr } = await supabaseAdmin
          .from("dose_logs")
          .update({
            taken_at: status === "taken" ? now.toISOString() : null,
            scheduled_for: scheduledForTimestamp,
            status,
            notes: notes || null,
            dose_status: status === "taken" ? "ON_TIME" : null,
          })
          .eq("id", existingLogs[0].id);

        console.log(`[log_dose] update result: ${updateErr?.message ?? 'success'}`);

        if (updateErr) {
          return JSON.stringify({
            success: false,
            message: `Failed to update dose: ${updateErr.message}`,
          });
        }

        return JSON.stringify({
          success: true,
          message: `✅ Updated ${med.name} (${schedule.time_of_day.substring(0, 5)}) as ${status}${notes ? ` — "${notes}"` : ""}.`,
        });
      }

      const { error: logErr } = await supabaseAdmin
        .from("dose_logs")
        .insert({
          medication_id: med.id,
          schedule_id: schedule.id,
          scheduled_time: scheduledForTimestamp,
          scheduled_for: scheduledForTimestamp,
          taken_at: status === "taken" ? now.toISOString() : null,
          status,
          notes: notes || null,
          dose_status: status === "taken" ? "ON_TIME" : null,
        });

      console.log(`[log_dose] insert result: ${logErr?.message ?? 'success'}`);

      if (logErr) {
        return JSON.stringify({
          success: false,
          message: `Failed to log dose: ${logErr.message}`,
        });
      }

      return JSON.stringify({
        success: true,
        message: `✅ Logged ${med.name} (${schedule.time_of_day.substring(0, 5)}) as ${status}${notes ? ` — "${notes}"` : ""}.`,
      });
    }

    case "schedule_appointment": {
      const {
        title,
        appointment_date,
        appointment_time,
        doctor_name,
        location,
        appointment_type,
        notes,
      } = args as {
        title: string;
        appointment_date: string;
        appointment_time: string;
        doctor_name?: string;
        location?: string;
        appointment_type?: string;
        notes?: string;
      };

      // Check for existing appointment on same date/time
      const { data: existing } = await supabaseAdmin
        .from("appointments")
        .select("id, title, appointment_date, appointment_time")
        .eq("user_id", userId)
        .eq("appointment_date", appointment_date)
        .eq("appointment_time", appointment_time)
        .eq("status", "scheduled")
        .limit(1);

      if (existing?.length) {
        // Update existing appointment instead of creating duplicate
        const { error } = await supabaseAdmin
          .from("appointments")
          .update({
            title,
            doctor_name: doctor_name || null,
            location: location || null,
            appointment_type: appointment_type || "checkup",
            notes: notes || null,
          })
          .eq("id", existing[0].id);

        if (error) {
          return JSON.stringify({
            success: false,
            message: `Failed to update appointment: ${error.message}`,
          });
        }

        return JSON.stringify({
          success: true,
          message: `✅ Updated existing appointment to "${title}" on ${appointment_date} at ${appointment_time}${doctor_name ? ` with ${doctor_name}` : ""}.`,
        });
      }

      // Also check for same title on same date (different time)
      const { data: sameDayMatch } = await supabaseAdmin
        .from("appointments")
        .select("id, title, appointment_time")
        .eq("user_id", userId)
        .eq("appointment_date", appointment_date)
        .ilike("title", `%${title}%`)
        .eq("status", "scheduled")
        .limit(1);

      if (sameDayMatch?.length) {
        const { error } = await supabaseAdmin
          .from("appointments")
          .update({
            title,
            appointment_time,
            doctor_name: doctor_name || null,
            location: location || null,
            appointment_type: appointment_type || "checkup",
            notes: notes || null,
          })
          .eq("id", sameDayMatch[0].id);

        if (error) {
          return JSON.stringify({
            success: false,
            message: `Failed to update appointment: ${error.message}`,
          });
        }

        return JSON.stringify({
          success: true,
          message: `✅ Updated existing "${title}" appointment on ${appointment_date} to ${appointment_time}${doctor_name ? ` with ${doctor_name}` : ""}.`,
        });
      }

      const { error } = await supabaseAdmin.from("appointments").insert({
        user_id: userId,
        title,
        appointment_date,
        appointment_time,
        doctor_name: doctor_name || null,
        location: location || null,
        appointment_type: appointment_type || "checkup",
        notes: notes || null,
        status: "scheduled",
      });

      if (error) {
        return JSON.stringify({
          success: false,
          message: `Failed to create appointment: ${error.message}`,
        });
      }

      return JSON.stringify({
        success: true,
        message: `✅ Appointment "${title}" scheduled for ${appointment_date} at ${appointment_time}${doctor_name ? ` with ${doctor_name}` : ""}.`,
      });
    }

    case "list_medications": {
      const { data: meds } = await supabaseAdmin
        .from("medications")
        .select("id, name, dosage, form, pills_remaining")
        .eq("user_id", userId)
        .eq("active", true)
        .order("name");

      if (!meds?.length) {
        return JSON.stringify({ medications: [], message: "No active medications found." });
      }

      // Fetch schedules for all medications
      const medIds = meds.map((m) => m.id);
      const { data: schedules } = await supabaseAdmin
        .from("medication_schedules")
        .select("medication_id, time_of_day, days_of_week, with_food, special_instructions, frequency_type")
        .in("medication_id", medIds)
        .eq("active", true)
        .order("time_of_day");

      // Fetch today's dose logs
      const todayDate = new Date().toISOString().split("T")[0];
      const { data: todayLogs } = await supabaseAdmin
        .from("dose_logs")
        .select("medication_id, schedule_id, status, taken_at")
        .in("medication_id", medIds)
        .gte("scheduled_for", `${todayDate}T00:00:00Z`)
        .lte("scheduled_for", `${todayDate}T23:59:59Z`);

      const medsWithSchedules = meds.map((med) => {
        const medSchedules = (schedules || []).filter((s) => s.medication_id === med.id);
        const medLogs = (todayLogs || []).filter((l) => l.medication_id === med.id);
        return {
          name: med.name,
          dosage: med.dosage,
          form: med.form,
          pills_remaining: med.pills_remaining,
          scheduled_times: medSchedules.map((s) => {
            const log = medLogs.find((l) => l.schedule_id === s.medication_id) || null;
            return {
              time: s.time_of_day,
              with_food: s.with_food,
              frequency: s.frequency_type,
              special_instructions: s.special_instructions,
              today_status: log?.status || "pending",
            };
          }),
        };
      });

      return JSON.stringify({
        medications: medsWithSchedules,
        message: `Found ${meds.length} active medication(s) with their schedules.`,
      });
    }

    case "list_upcoming_appointments": {
      const today = new Date().toISOString().split("T")[0];
      const { data: appts } = await supabaseAdmin
        .from("appointments")
        .select("title, appointment_date, appointment_time, doctor_name, location, status")
        .eq("user_id", userId)
        .eq("status", "scheduled")
        .gte("appointment_date", today)
        .order("appointment_date")
        .order("appointment_time")
        .limit(10);

      if (!appts?.length) {
        return JSON.stringify({ appointments: [], message: "No upcoming appointments." });
      }

      return JSON.stringify({
        appointments: appts,
        message: `Found ${appts.length} upcoming appointment(s).`,
      });
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user from JWT
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();

    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const today = new Date().toISOString().split("T")[0];
    const currentTime = new Date().toLocaleTimeString("en-ZA", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const systemPrompt = `You are TreatMate Assistant, a friendly and helpful healthcare companion chatbot. You help users:
1. Record medication doses they've taken (log_dose tool)
2. Schedule medical appointments (schedule_appointment tool)
3. Check their current medications (list_medications tool)
4. View upcoming appointments (list_upcoming_appointments tool)

Today's date is ${today} and the current time is ${currentTime}.

Guidelines:
- Be warm, encouraging, and conversational — like a caring friend
- When a user mentions taking medication, confirm the medication name and log it
- When scheduling appointments, ask for missing details naturally (date, time, doctor, type)
- **STRICTLY only schedule medical-related appointments** (doctor visits, checkups, lab tests, imaging, procedures, consultations, vaccinations, therapy, follow-ups, etc.). If a user tries to schedule a non-medical appointment (e.g. a date, wedding, birthday party, meeting, or any non-healthcare event), politely decline and explain that you can only help with medical and health-related appointments.
- If information is ambiguous, ask clarifying follow-up questions before acting
- After performing an action, confirm what you did clearly
- Use simple language suitable for elderly users
- Keep responses concise but friendly
- If you're unsure about a medication name, list their medications and ask them to confirm
- IMPORTANT: Before logging a dose, ALWAYS call list_medications first to check the user's medications and their scheduled times. When logging, match the dose to the correct scheduled time. If a medication has multiple scheduled times and the user doesn't specify which one, ask them.
- For dates, help interpret relative dates like "tomorrow", "next Monday", etc. relative to today (${today})
- Always confirm details before saving: "Just to confirm, you'd like me to schedule X on Y at Z?"

Interactive UI hints — append these tags at the END of your message when appropriate (they will be parsed by the frontend):
- When you need the user to pick a date, append: [DATE_PICKER]
- When you need a yes/no or simple choice confirmation, append: [QUICK_REPLIES:option1,option2,...] (e.g. [QUICK_REPLIES:Yes,No] or [QUICK_REPLIES:Morning,Afternoon,Evening])
- You can combine both if needed
- Only use these when actively asking the user for that specific input`;

    // Non-streaming: handle tool calls in a loop
    let currentMessages = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    const maxIterations = 5;
    for (let i = 0; i < maxIterations; i++) {
      const aiResponse = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: currentMessages,
            tools,
            stream: false,
          }),
        }
      );

      if (!aiResponse.ok) {
        const status = aiResponse.status;
        if (status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (status === 402) {
          return new Response(
            JSON.stringify({ error: "AI usage limit reached. Please add credits." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const t = await aiResponse.text();
        console.error("AI gateway error:", status, t);
        throw new Error("AI gateway error");
      }

      const result = await aiResponse.json();
      const choice = result.choices?.[0];

      if (!choice) throw new Error("No response from AI");

      const assistantMessage = choice.message;
      console.log(`[Iteration ${i}] finish_reason=${choice.finish_reason}, tool_calls=${assistantMessage.tool_calls?.length ?? 0}, content_length=${assistantMessage.content?.length ?? 0}`);
      if (assistantMessage.tool_calls?.length) {
        for (const tc of assistantMessage.tool_calls) {
          console.log(`  Tool call: ${tc.function.name}(${tc.function.arguments})`);
        }
      }
      currentMessages.push(assistantMessage);

      // If no tool calls, we're done
      if (
        !assistantMessage.tool_calls ||
        assistantMessage.tool_calls.length === 0
      ) {
        return new Response(
          JSON.stringify({ reply: assistantMessage.content }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Execute tool calls
      for (const toolCall of assistantMessage.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments);
        const toolResult = await executeTool(
          toolCall.function.name,
          args,
          supabaseAdmin,
          user.id
        );
        currentMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: toolResult,
        });
      }
      // Loop again to get the AI's response incorporating tool results
    }

    return new Response(
      JSON.stringify({
        reply: "I'm sorry, I had trouble processing that. Could you try again?",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("chat error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
