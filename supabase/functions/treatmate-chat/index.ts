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
        "Record that a user has taken a medication dose. Use when the user says they took their medication.",
      parameters: {
        type: "object",
        properties: {
          medication_name: {
            type: "string",
            description: "Name of the medication taken",
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
      const { medication_name, status, notes } = args as {
        medication_name: string;
        status: string;
        notes?: string;
      };

      // Find the medication
      const { data: meds, error: medErr } = await supabaseAdmin
        .from("medications")
        .select("id, name")
        .eq("user_id", userId)
        .eq("active", true)
        .ilike("name", `%${medication_name}%`)
        .limit(1);

      if (medErr || !meds?.length) {
        return JSON.stringify({
          success: false,
          message: `Could not find a medication matching "${medication_name}". Please check the name and try again.`,
        });
      }

      const med = meds[0];

      // Find the schedule
      const { data: schedules } = await supabaseAdmin
        .from("medication_schedules")
        .select("id, time_of_day")
        .eq("medication_id", med.id)
        .eq("active", true)
        .limit(1);

      if (!schedules?.length) {
        return JSON.stringify({
          success: false,
          message: `No active schedule found for ${med.name}.`,
        });
      }

      const schedule = schedules[0];
      const now = new Date();

      const { error: logErr } = await supabaseAdmin
        .from("dose_logs")
        .insert({
          medication_id: med.id,
          schedule_id: schedule.id,
          scheduled_time: now.toISOString(),
          taken_at: status === "taken" ? now.toISOString() : null,
          status,
          notes: notes || null,
          dose_status: status === "taken" ? "ON_TIME" : null,
        });

      if (logErr) {
        return JSON.stringify({
          success: false,
          message: `Failed to log dose: ${logErr.message}`,
        });
      }

      return JSON.stringify({
        success: true,
        message: `✅ Logged ${med.name} as ${status}${notes ? ` — "${notes}"` : ""}.`,
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
        .select("name, dosage, form, pills_remaining")
        .eq("user_id", userId)
        .eq("active", true)
        .order("name");

      if (!meds?.length) {
        return JSON.stringify({ medications: [], message: "No active medications found." });
      }

      return JSON.stringify({
        medications: meds,
        message: `Found ${meds.length} active medication(s).`,
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
