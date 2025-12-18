export interface ExtractedMedicationData {
  name: string;
  strength?: string;
  strengthUnit?: string;
  form?: string;
  quantity?: number;
  pharmacyCode?: string;
  schedule?: string; // S1, S2, etc.
}

export interface ExtractedDosageInstructions {
  quantityPerDose?: string;
  frequency?: string;
  timing?: string;
  interval?: string;
  condition?: string;
  route?: string;
}

export interface ExtractedMetadata {
  pharmacyName?: string;
  pharmacyAddress?: string;
  pharmacyPhone?: string;
  prescriptionDate?: string;
  prescriptionNumber?: string;
  patientName?: string;
  doctorName?: string;
  dispenserName?: string;
}

export interface ExtractedPrescription {
  medication: ExtractedMedicationData;
  dosage: ExtractedDosageInstructions;
  metadata: ExtractedMetadata;
  rawText?: string;
  confidence: 'low' | 'medium' | 'high';
}

export interface PrescriptionScanResult {
  prescriptions: ExtractedPrescription[];
  imagePreview: string;
}
