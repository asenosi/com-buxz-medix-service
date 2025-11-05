import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log('Extracting prescription data from image...');

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a medical prescription parser. Extract medication details from prescription images and return structured data.

CRITICAL: Interpret common medical notation correctly:
- Duration notation: X/7 means X days (e.g., 14/7 = 14 days = 2 weeks), X/12 means X months (e.g., 1/12 = 1 month, 2/12 = 2 months)
- Frequency abbreviations:
  * od/OD = once daily (frequency_type: "once_daily")
  * bd/BD = twice daily (frequency_type: "twice_daily")
  * tds/TDS = three times daily (frequency_type: "three_times_daily")
  * qds/QDS = four times daily (frequency_type: "four_times_daily")
  * prn/PRN = as needed (frequency_type: "as_needed")
- Route abbreviations: p.o/PO = by mouth (route: "by_mouth"), topical = on skin (route: "topical"), etc.
- Dosage: Include the unit (mg, ml, puffs, drops, etc.)

Example: "20 mg od p.o 1/12" means: 20mg once daily by mouth for 1 month`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Extract all medication information from this prescription. For each medication, identify:
- name: Medication name
- dosage: Dosage/strength with unit (e.g., "20mg", "2 puffs", "1 drop")
- form: Form (tablet, capsule, liquid, cream, inhaler, etc.)
- frequency_type: Parse abbreviations correctly:
  * "od"/"OD" → "once_daily"
  * "bd"/"BD" → "twice_daily"
  * "tds"/"TDS" → "three_times_daily"
  * "qds"/"QDS" → "four_times_daily"
  * "prn"/"PRN" → "as_needed"
  * If specific days mentioned → "specific_days"
- route_of_administration: Parse abbreviations:
  * "p.o"/"PO" → "by_mouth"
  * "topical" → "topical"
  * "inhaled" → "inhaled"
  * "nose"/"eye"/"ear" → "nose_eyes_ear"
- duration: Parse duration notation (e.g., "1/12" = "1 month", "14/7" = "14 days", "2/12" = "2 months")
- reason_for_taking: Condition being treated (if visible)
- instructions: Any special instructions (take with food, before bed, etc.)

Return ONLY valid JSON with no markdown formatting.`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${image}`
                }
              }
            ]
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_medications",
              description: "Extract structured medication data from prescription",
              parameters: {
                type: "object",
                properties: {
                  medications: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Medication name" },
                        dosage: { type: "string", description: "Dosage with unit (e.g., '20mg', '2 puffs', '1 drop')" },
                        form: { 
                          type: "string", 
                          enum: ["pill", "capsule", "liquid", "cream", "inhaler", "spray", "drop", "syringe", "other"],
                          description: "Medication form" 
                        },
                        frequency_type: { 
                          type: "string",
                          enum: ["once_daily", "twice_daily", "three_times_daily", "four_times_daily", "as_needed", "specific_days", "everyday"],
                          description: "Frequency type parsed from abbreviations (od→once_daily, bd→twice_daily, tds→three_times_daily, qds→four_times_daily)" 
                        },
                        route_of_administration: { 
                          type: "string",
                          enum: ["by_mouth", "topical", "inhaled", "nose_eyes_ear", "rectum_vagina"],
                          description: "Route parsed from abbreviations (p.o→by_mouth)" 
                        },
                        duration: { type: "string", description: "Duration parsed from notation (e.g., '1/12'→'1 month', '14/7'→'14 days')" },
                        reason_for_taking: { type: "string", description: "Condition being treated" },
                        instructions: { type: "string", description: "Special instructions including duration" }
                      },
                      required: ["name", "dosage"]
                    }
                  }
                },
                required: ["medications"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_medications" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI Response:', JSON.stringify(data, null, 2));

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No tool call in AI response");
    }

    const extractedData = JSON.parse(toolCall.function.arguments);
    console.log('Extracted medications:', extractedData);

    return new Response(
      JSON.stringify(extractedData),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('Error in extract-prescription:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to extract prescription data" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
