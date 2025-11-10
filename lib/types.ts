export interface SliceAnnotation {
  sliceIndex: number;
  note: string; // JSON stringified paths data
  imageData?: string; // Data URL of the exported canvas image
  timestamp: number;
}

export interface PatientDiagnosis {
  patientId: string;
  diagnosis: 'CN' | 'AD' | null;
  confidence: 'low' | 'medium' | 'high' | null;
  notes: string;
  timestamp: number;
}

export interface SlicePrediction {
  slice_index: number;
  slice_number: number;
  predicted_class: number;
  predicted_label: string;
  confidence: number;
  cn_prob: number;
  ad_prob: number;
  original: string;
  overlay: string;
  cn_overlay: string;
  ad_overlay: string;
}

export interface PatientPrediction {
  prediction: number;
  predicted_label: string;
  ad_votes: number;
  cn_votes: number;
  total_slices: number;
  confidence: number;
  avg_ad_prob: number;
  max_ad_prob: number;
  min_ad_prob: number;
  std_ad_prob: number;
}

export interface PatientData {
  patient_id: string;
  true_diagnosis: string;
  true_label: string;
  num_slices: number;
  patient_prediction: PatientPrediction;
  is_correct: boolean;
  slice_predictions: SlicePrediction[];
}

export interface GlobalPredictions {
  total_patients: number;
  threshold: number;
  patients: Array<{
    patient_id: string;
    true_diagnosis: string;
    true_label: string;
    num_slices: number;
    prediction: string;
    confidence: number;
    ad_votes: number;
    cn_votes: number;
    is_correct: boolean;
    avg_ad_prob: number;
  }>;
}
