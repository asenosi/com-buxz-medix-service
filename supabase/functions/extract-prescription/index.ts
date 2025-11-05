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
            content: "You are a medical prescription parser. Extract medication details from prescription images and return structured data."
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract all medication information from this prescription. For each medication, identify: name, dosage/strength, form (tablet/capsule/liquid/etc), frequency (how often to take), route of administration, reason for taking, and any special instructions. Return ONLY valid JSON with no markdown formatting."
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
                        dosage: { type: "string", description: "Dosage/strength (e.g., 100mg, 2 puffs)" },
                        form: { type: "string", description: "Form (tablet, capsule, liquid, etc.)" },
                        frequency_type: { type: "string", description: "Frequency (Once daily, Twice daily, etc.)" },
                        route_of_administration: { type: "string", description: "Route (Oral, Topical, etc.)" },
                        reason_for_taking: { type: "string", description: "Condition being treated" },
                        instructions: { type: "string", description: "Special instructions" }
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
