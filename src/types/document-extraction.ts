// Shared types for the prescription document extraction pipeline

export interface MedConfidence {
  drugName: number;
  strength: number;
  dose: number;
  route: number;
  frequency: number;
  duration: number;
  quantity: number;
  refills: number;
}

export interface AmbiguityItem {
  type: string;
  text: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "BLOCKING";
  suggestedUserChoices?: string[];
  resolvedChoice?: string;
}

export interface ExtractedMedication {
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
  confidence?: Partial<MedConfidence>;
  needsHumanReview?: boolean;
}

export interface ExtractionResult {
  documentId?: string;
  extractionVersion?: string;
  patient?: { name?: string; dob?: string; idNumber?: string };
  prescriber?: { name?: string; practice?: string; signaturePresent?: boolean };
  medications?: ExtractedMedication[];
  globalWarnings?: { type?: string; severity?: string }[];
}

export type DocumentStatus =
  | "UPLOADED"
  | "PREPROCESSING"
  | "OCR_RUNNING"
  | "EXTRACTION_RUNNING"
  | "DRAFT_READY"
  | "NEEDS_REVIEW"
  | "CONFIRMED"
  | "FAILED";

export type DocumentTypeHint = "PRINTED" | "HANDWRITTEN" | "MIXED" | "UNKNOWN";

export interface DocumentRow {
  id: string;
  user_id: string;
  original_file_url: string;
  status: DocumentStatus;
  document_type_hint: DocumentTypeHint;
  page_count: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExtractionDraftRow {
  id: string;
  document_id: string;
  extraction_version: string;
  llm_model: string | null;
  prompt_version: string | null;
  draft_json: ExtractionResult;
  normalized_json: ExtractionResult;
  needs_human_review: boolean;
  created_at: string;
}

export const HIGH_ALERT_DRUGS = [
  "warfarin", "heparin", "insulin", "methotrexate", "digoxin",
  "morphine", "fentanyl", "oxycodone", "potassium chloride", "lithium",
  "phenytoin", "theophylline", "gentamicin", "vancomycin", "colchicine",
];
