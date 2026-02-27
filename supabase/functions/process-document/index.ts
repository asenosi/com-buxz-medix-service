import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Deterministic normalizer maps ───
const FREQ_MAP: Record<string, string> = {
  od: "Once daily", qd: "Once daily", daily: "Once daily",
  bd: "Twice daily", bid: "Twice daily",
  tds: "Three times daily", tid: "Three times daily",
  qid: "Four times daily", qds: "Four times daily",
  q4h: "Every 4 hours", q6h: "Every 6 hours", q8h: "Every 8 hours", q12h: "Every 12 hours",
  nocte: "At bedtime", mane: "In the morning",
  prn: "Only when needed", "as needed": "Only when needed",
  stat: "Take immediately (once-off)",
  ac: "Before meals", pc: "After meals", hs: "At bedtime",
  eod: "Every other day", qod: "Every other day",
};

const ROUTE_MAP: Record<string, string> = {
  po: "By mouth (swallow)", iv: "Into a vein (hospital only)",
  im: "Injection into muscle", sc: "Injection under skin", sq: "Injection under skin",
  topical: "Apply to skin", inhalation: "Breathe in (inhaler/nebuliser)",
  ophthalmic: "Into the eye(s)", otic: "Into the ear(s)",
  sl: "Under the tongue", sublingual: "Under the tongue",
  pr: "Rectally", rectal: "Rectally",
  pv: "Vaginally", vaginal: "Vaginally",
};

const FORM_MAP: Record<string, string> = {
  tab: "tablet(s)", tabs: "tablet(s)", tablet: "tablet(s)", tablets: "tablet(s)",
  cap: "capsule(s)", caps: "capsule(s)", capsule: "capsule(s)", capsules: "capsule(s)",
  susp: "suspension (liquid)", syr: "syrup",
  gtt: "drop(s)", gtts: "drop(s)",
  ung: "ointment", oint: "ointment", ointment: "ointment",
  supp: "suppository", inh: "inhaler", mdi: "inhaler",
  neb: "nebuliser solution",
};

const HIGH_ALERT_DRUGS = [
  "warfarin", "heparin", "insulin", "methotrexate", "digoxin",
  "morphine", "fentanyl", "oxycodone", "potassium chloride", "lithium",
  "phenytoin", "theophylline", "gentamicin", "vancomycin", "colchicine",
];

function normalizeDuration(raw: string): string {
  if (!raw) return raw;
  const lower = raw.toLowerCase().trim();
  if (lower === "ongoing" || lower === "chronic") return "Ongoing — do not stop without doctor's advice";
  // SA slash notation: X/7 = days, X/52 = weeks, X/12 = months
  const slashMatch = lower.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (slashMatch) {
    const num = parseInt(slashMatch[1]);
    const denom = parseInt(slashMatch[2]);
    if (denom === 7) {
      if (num === 7) return "7 days (1 week)";
      if (num === 14) return "14 days (2 weeks)";
      return `${num} days`;
    }
    if (denom === 52) return num === 1 ? "1 week" : `${num} weeks`;
    if (denom === 12) return num === 1 ? "1 month" : `${num} months`;
  }
  return raw;
}

function normalizeFrequency(raw: string): string {
  if (!raw) return raw;
  const key = raw.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
  return FREQ_MAP[key] || raw;
}

function normalizeRoute(raw: string): string {
  if (!raw) return raw;
  const key = raw.toLowerCase().trim();
  return ROUTE_MAP[key] || raw;
}

function normalizeForm(raw: string): string {
  if (!raw) return raw;
  const key = raw.toLowerCase().trim();
  return FORM_MAP[key] || raw;
}

interface AmbiguityItem {
  type: string;
  text: string;
  severity: string;
  suggestedUserChoices?: string[];
}

interface MedConfidence {
  drugName?: number;
  strength?: number;
  dose?: number;
  route?: number;
  frequency?: number;
  duration?: number;
  quantity?: number;
  refills?: number;
}

interface ExtractedMed {
  rawTextSpan?: string;
  drug?: { brandName?: string; genericName?: string };
  form?: string;
  strength?: { value?: number; unit?: string };
  dose?: { amount?: number | string; unit?: string };
  route?: string;
  frequency?: { raw?: string; normalized?: { timesPerDay?: number; intervalHours?: number } };
  duration?: { value?: number; unit?: string; raw?: string };
  quantity?: { value?: number; unit?: string };
  refills?: number;
  instructions?: string[];
  prn?: { isPrn?: boolean; reason?: string };
  ambiguities?: AmbiguityItem[];
  confidence?: MedConfidence;
  needsHumanReview?: boolean;
}

interface ExtractionResult {
  documentId?: string;
  extractionVersion?: string;
  patient?: { name?: string; dob?: string; idNumber?: string };
  prescriber?: { name?: string; practice?: string; signaturePresent?: boolean };
  medications?: ExtractedMed[];
  globalWarnings?: { type?: string; severity?: string }[];
}

function runSafetyChecks(med: ExtractedMed): AmbiguityItem[] {
  const warnings: AmbiguityItem[] = [];
  const drugName = (med.drug?.brandName || med.drug?.genericName || "").toLowerCase();

  // High-alert check
  if (HIGH_ALERT_DRUGS.some((d) => drugName.includes(d))) {
    warnings.push({
      type: "HIGH_ALERT_MEDICATION",
      text: `${drugName} is a high-alert medication requiring double-confirmation`,
      severity: "HIGH",
    });
  }

  // Unit mismatch
  if (med.dose?.unit?.toLowerCase() === "tablet" && med.strength?.unit?.toLowerCase() === "ml") {
    warnings.push({ type: "UNIT_MISMATCH", text: "Dose unit 'tablet' conflicts with strength unit 'mL'", severity: "HIGH" });
  }

  // mcg > 5000 confusion
  if (med.strength?.unit?.toLowerCase() === "mcg" && (med.strength?.value ?? 0) > 5000) {
    warnings.push({ type: "UNIT_CONFUSION", text: "mcg > 5000 — likely mg/mcg confusion", severity: "HIGH" });
  }

  // Dose range
  const doseStr = String(med.dose?.amount ?? "");
  if (doseStr.includes("-")) {
    warnings.push({ type: "DOSE_RANGE", text: `Dose range detected: ${doseStr}`, severity: "HIGH" });
  }

  // "As directed" without specifics
  if (med.instructions?.some((i) => i.toLowerCase().includes("as directed")) && !med.dose?.amount) {
    warnings.push({ type: "VAGUE_INSTRUCTIONS", text: "'As directed' without specific dosing", severity: "HIGH" });
  }

  // PRN without reason
  if (med.prn?.isPrn && !med.prn?.reason) {
    warnings.push({ type: "PRN_NO_REASON", text: "PRN medication without stated reason", severity: "MEDIUM" });
  }

  // Missing critical fields
  if (!drugName) warnings.push({ type: "MISSING_DRUG_NAME", text: "Drug name is missing", severity: "BLOCKING" });
  if (!med.dose?.amount) warnings.push({ type: "MISSING_DOSE", text: "Dose amount is missing", severity: "BLOCKING" });
  if (!med.frequency?.raw) warnings.push({ type: "MISSING_FREQUENCY", text: "Frequency is missing", severity: "BLOCKING" });

  return warnings;
}

function normalizeMedications(data: ExtractionResult): ExtractionResult {
  if (!data.medications) return data;

  const normalized = { ...data };
  normalized.medications = data.medications.map((med) => {
    const nm = { ...med };

    // Normalize fields to plain language
    if (nm.frequency?.raw) {
      nm.frequency = {
        ...nm.frequency,
        raw: normalizeFrequency(nm.frequency.raw),
      };
    }
    if (nm.route) nm.route = normalizeRoute(nm.route);
    if (nm.form) nm.form = normalizeForm(nm.form);
    if (nm.duration?.raw) {
      nm.duration = { ...nm.duration, raw: normalizeDuration(nm.duration.raw) };
    }

    // Run safety checks
    const safetyWarnings = runSafetyChecks(nm);
    nm.ambiguities = [...(nm.ambiguities || []), ...safetyWarnings];

    // Set needsHumanReview if any HIGH/BLOCKING ambiguities or low confidence
    const hasHighAmb = nm.ambiguities.some((a) => a.severity === "HIGH" || a.severity === "BLOCKING");
    const confValues = Object.values(nm.confidence || {}) as number[];
    const hasLowConf = confValues.some((v) => v < 0.8);
    nm.needsHumanReview = nm.needsHumanReview || hasHighAmb || hasLowConf;

    return nm;
  });

  return normalized;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { documentId } = await req.json();
    if (!documentId) throw new Error("documentId is required");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get document
    const { data: doc, error: docErr } = await supabaseAdmin
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();
    if (docErr || !doc) throw new Error("Document not found");

    // Update status
    await supabaseAdmin.from("documents").update({ status: "EXTRACTION_RUNNING" }).eq("id", documentId);
    await supabaseAdmin.from("audit_events").insert({
      document_id: documentId,
      event_type: "EXTRACTION_STARTED",
      payload: { model: "google/gemini-2.5-flash" },
    });

    // Download image from storage
    const filePath = doc.original_file_url;
    const { data: fileData, error: dlErr } = await supabaseAdmin.storage
      .from("prescriptions")
      .download(filePath);
    if (dlErr || !fileData) throw new Error("Failed to download file: " + (dlErr?.message || "unknown"));

    const arrayBuf = await fileData.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuf)));
    const mimeType = filePath.endsWith(".png") ? "image/png" : filePath.endsWith(".webp") ? "image/webp" : "image/jpeg";

    const typeHint = doc.document_type_hint || "UNKNOWN";
    const handwritingInstructions = typeHint === "HANDWRITTEN" || typeHint === "MIXED"
      ? `\nIMPORTANT HANDWRITING RULES:
- This prescription contains handwriting which may be difficult to read.
- If any text is illegible, mark it as an ILLEGIBLE ambiguity with HIGH severity.
- Set confidence to 0.1-0.3 for illegible fields and set needsHumanReview=true.
- NEVER guess illegible text — always flag it for human review.`
      : "";

    const systemPrompt = `You are a prescription data extraction engine for Southern African medical prescriptions.

CRITICAL RULES:
- Extract ONLY what is explicitly visible in the image.
- NEVER infer, guess, or hallucinate any data.
- If handwriting is unclear, set confidence low and needsHumanReview=true.
- Never provide medical advice or derive dosages.
- Region context: Southern Africa — prescribers use local abbreviations and notation (e.g., 5/7 means 5 days, BD means twice daily).
${handwritingInstructions}

You MUST return valid JSON matching this schema exactly:
{
  "documentId": "${documentId}",
  "extractionVersion": "1.0",
  "patient": {"name": string|null, "dob": string|null, "idNumber": string|null},
  "prescriber": {"name": string|null, "practice": string|null, "signaturePresent": boolean},
  "medications": [{
    "rawTextSpan": string,
    "drug": {"brandName": string|null, "genericName": string|null},
    "form": string|null,
    "strength": {"value": number|null, "unit": string|null},
    "dose": {"amount": number|string|null, "unit": string|null},
    "route": string|null,
    "frequency": {"raw": string|null, "normalized": {"timesPerDay": number|null, "intervalHours": number|null}},
    "duration": {"value": number|null, "unit": string|null, "raw": string|null},
    "quantity": {"value": number|null, "unit": string|null},
    "refills": number|null,
    "instructions": [string],
    "prn": {"isPrn": boolean, "reason": string|null},
    "ambiguities": [{"type": string, "text": string, "severity": "LOW"|"MEDIUM"|"HIGH", "suggestedUserChoices": [string]}],
    "confidence": {"drugName": number, "strength": number, "dose": number, "route": number, "frequency": number, "duration": number, "quantity": number, "refills": number},
    "needsHumanReview": boolean
  }],
  "globalWarnings": [{"type": string, "severity": "LOW"|"MEDIUM"|"HIGH"}]
}

Return ONLY the JSON object, no markdown fences.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // 10-minute timeout for the AI extraction call
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10 * 60 * 1000);

    let aiResponse: Response;
    try {
      aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        signal: controller.signal,
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Document type hint: ${typeHint}. Extract all medication data from this prescription image.`,
              },
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${base64}` },
              },
            ],
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);

      if (aiResponse.status === 429) {
        await supabaseAdmin.from("documents").update({ status: "FAILED", error_message: "Rate limited — please try again in a moment" }).eq("id", documentId);
        return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (aiResponse.status === 402) {
        await supabaseAdmin.from("documents").update({ status: "FAILED", error_message: "AI credits exhausted" }).eq("id", documentId);
        return new Response(JSON.stringify({ error: "Payment required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error("AI gateway error: " + aiResponse.status);
    }

    const aiResult = await aiResponse.json();
    let rawContent = aiResult.choices?.[0]?.message?.content || "";

    // Strip markdown fences if present
    rawContent = rawContent.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    let extracted: ExtractionResult;
    try {
      extracted = JSON.parse(rawContent);
    } catch {
      // JSON repair: send broken output to a second LLM call
      console.warn("Initial JSON parse failed, attempting repair...");
      const repairResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            { role: "system", content: "You are a JSON repair tool. Fix the following broken JSON and return ONLY valid JSON. Do not change any values, only fix syntax errors." },
            { role: "user", content: rawContent },
          ],
        }),
      });

      if (!repairResponse.ok) throw new Error("JSON repair call failed");
      const repairResult = await repairResponse.json();
      let repairedContent = repairResult.choices?.[0]?.message?.content || "";
      repairedContent = repairedContent.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      extracted = JSON.parse(repairedContent);
    }

    // Run deterministic normalization
    const normalizedData = normalizeMedications(extracted);
    const needsReview = normalizedData.medications?.some((m) => m.needsHumanReview) ?? false;

    // Store draft
    await supabaseAdmin.from("extraction_drafts").insert({
      document_id: documentId,
      extraction_version: "1.0",
      llm_model: "google/gemini-2.5-flash",
      prompt_version: "1.0",
      draft_json: extracted,
      normalized_json: normalizedData,
      needs_human_review: needsReview,
    });

    // Update document status
    const newStatus = needsReview ? "NEEDS_REVIEW" : "DRAFT_READY";
    await supabaseAdmin.from("documents").update({ status: newStatus }).eq("id", documentId);

    await supabaseAdmin.from("audit_events").insert({
      document_id: documentId,
      event_type: "EXTRACTION_COMPLETED",
      payload: { status: newStatus, medicationCount: normalizedData.medications?.length ?? 0, needsReview },
    });

    return new Response(JSON.stringify({ success: true, status: newStatus, data: normalizedData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("process-document error:", e);

    // Try to update document status to FAILED
    try {
      const { documentId } = await req.clone().json();
      if (documentId) {
        const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        await supabaseAdmin.from("documents").update({
          status: "FAILED",
          error_message: e instanceof Error ? e.message : "Unknown error",
        }).eq("id", documentId);
      }
    } catch { /* ignore */ }

    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
