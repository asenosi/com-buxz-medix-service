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
    const { imageBase64 } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log('Extracting comprehensive prescription data from image...');

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
            content: `You are an expert medical prescription and medication label parser. Your job is to extract ALL visible information from prescription labels and medication packaging with high accuracy.

IMPORTANT PARSING RULES:
1. The image may be rotated or upside down - read text from any orientation
2. Extract exact text as shown, don't modify medication names
3. Parse South African pharmacy formats (Dis-Chem, Clicks, etc.)
4. Interpret medical abbreviations:
   - CAPS = Capsules
   - TABS = Tablets
   - S1, S2, S3 = Schedule classifications
   - "TAKE ONE" = 1 unit per dose
   - "THREE TIMES A DAY" = 3 times daily
   - "8 HOURLY" = every 8 hours
   - "IF NECESSARY" = as needed condition
   
5. Confidence scoring:
   - HIGH: Clear text, all fields readable
   - MEDIUM: Some fields unclear but medication name/dosage readable
   - LOW: Significant text unclear, may need manual verification`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this prescription/medication label image and extract ALL visible information. The image may be rotated - read text from any orientation.

Extract and structure:
1. MEDICATION: Drug name, strength (with unit), form (tablet/capsule/liquid), quantity, pharmacy code, schedule classification
2. DOSAGE: How many to take, frequency, timing/interval, any conditions, route of administration  
3. METADATA: Pharmacy name/address/phone, prescription date, prescription number, patient name, doctor/dispenser name

Be thorough and extract every piece of visible text. Assign a confidence level based on image clarity.`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_prescription_data",
              description: "Extract comprehensive prescription data from medication label image",
              parameters: {
                type: "object",
                properties: {
                  prescriptions: {
                    type: "array",
                    description: "Array of prescriptions found in the image (usually one, but could be multiple)",
                    items: {
                      type: "object",
                      properties: {
                        medication: {
                          type: "object",
                          properties: {
                            name: { type: "string", description: "Full medication name as shown (e.g., 'IBUGESIC PLUS')" },
                            strength: { type: "string", description: "Numeric strength value (e.g., '400', '10')" },
                            strengthUnit: { type: "string", description: "Unit of strength (e.g., 'MG', 'ML')" },
                            form: { 
                              type: "string", 
                              enum: ["pill", "capsule", "solution", "drops", "inhaler", "powder", "spray", "cream", "strip", "stick", "insert", "other"],
                              description: "Medication form - CAPS=capsule, TABS=pill" 
                            },
                            quantity: { type: "number", description: "Number of units in package (e.g., 30)" },
                            pharmacyCode: { type: "string", description: "Pharmacy/product code (e.g., '524994')" },
                            schedule: { type: "string", description: "Schedule classification (e.g., 'S1', 'S2')" }
                          },
                          required: ["name"]
                        },
                        dosage: {
                          type: "object",
                          properties: {
                            quantityPerDose: { type: "string", description: "Amount per dose (e.g., 'ONE TABLET', 'TWO CAPSULES')" },
                            frequency: { type: "string", description: "How often (e.g., 'THREE TIMES A DAY', 'TWICE DAILY')" },
                            timing: { type: "string", description: "Specific timing (e.g., '8 HOURLY', 'MORNING AND EVENING')" },
                            interval: { type: "string", description: "Hours between doses if specified" },
                            condition: { type: "string", description: "Conditions (e.g., 'IF NECESSARY', 'WITH FOOD')" },
                            route: { 
                              type: "string", 
                              enum: ["by_mouth", "topical", "inhaled", "nose_eyes_ear", "rectum_vagina", "injection"],
                              description: "Route - ORALLY=by_mouth" 
                            }
                          }
                        },
                        metadata: {
                          type: "object",
                          properties: {
                            pharmacyName: { type: "string", description: "Pharmacy name (e.g., 'CARLSWALD PHARMACY', 'Dis-Chem')" },
                            pharmacyAddress: { type: "string", description: "Pharmacy address" },
                            pharmacyPhone: { type: "string", description: "Pharmacy phone number" },
                            prescriptionDate: { type: "string", description: "Date in YYYY-MM-DD format" },
                            prescriptionNumber: { type: "string", description: "Prescription/reference number" },
                            patientName: { type: "string", description: "Patient name" },
                            doctorName: { type: "string", description: "Doctor or prescriber name" },
                            dispenserName: { type: "string", description: "Dispenser name" }
                          }
                        },
                        rawText: { type: "string", description: "All visible text from the label" },
                        confidence: { 
                          type: "string", 
                          enum: ["low", "medium", "high"],
                          description: "Confidence level of extraction" 
                        }
                      },
                      required: ["medication", "dosage", "metadata", "confidence"]
                    }
                  }
                },
                required: ["prescriptions"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_prescription_data" } }
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
    console.log('AI Response received');

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No structured data extracted from image");
    }

    const extractedData = JSON.parse(toolCall.function.arguments);
    console.log('Extracted prescriptions:', JSON.stringify(extractedData, null, 2));

    return new Response(
      JSON.stringify(extractedData),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('Error in extract-prescription-v2:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to extract prescription data" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
