import { create } from 'zustand';
import { SliceAnnotation, PatientDiagnosis } from './types';

interface AnnotationStore {
  annotations: Record<string, SliceAnnotation[]>; // patientId -> annotations
  diagnoses: Record<string, PatientDiagnosis>; // patientId -> diagnosis

  addAnnotation: (patientId: string, sliceIndex: number, drawingData: string, imageData?: string) => void;
  removeAnnotation: (patientId: string, sliceIndex: number) => void;
  getAnnotations: (patientId: string) => SliceAnnotation[];
  getAnnotation: (patientId: string, sliceIndex: number) => SliceAnnotation | undefined;

  setDiagnosis: (diagnosis: PatientDiagnosis) => void;
  getDiagnosis: (patientId: string) => PatientDiagnosis | undefined;
}

export const useAnnotationStore = create<AnnotationStore>((set, get) => ({
  annotations: {},
  diagnoses: {},

  addAnnotation: (patientId, sliceIndex, drawingData, imageData) => {
    set((state) => {
      const patientAnnotations = state.annotations[patientId] || [];
      // Remove existing annotation for this slice if any
      const filtered = patientAnnotations.filter(a => a.sliceIndex !== sliceIndex);

      return {
        annotations: {
          ...state.annotations,
          [patientId]: [
            ...filtered,
            { sliceIndex, note: drawingData, imageData, timestamp: Date.now() }
          ].sort((a, b) => a.sliceIndex - b.sliceIndex)
        }
      };
    });
  },

  removeAnnotation: (patientId, sliceIndex) => {
    set((state) => {
      const patientAnnotations = state.annotations[patientId] || [];
      return {
        annotations: {
          ...state.annotations,
          [patientId]: patientAnnotations.filter(a => a.sliceIndex !== sliceIndex)
        }
      };
    });
  },

  getAnnotations: (patientId) => {
    return get().annotations[patientId] || [];
  },

  getAnnotation: (patientId, sliceIndex) => {
    const annotations = get().annotations[patientId] || [];
    return annotations.find(a => a.sliceIndex === sliceIndex);
  },

  setDiagnosis: (diagnosis) => {
    set((state) => ({
      diagnoses: {
        ...state.diagnoses,
        [diagnosis.patientId]: diagnosis
      }
    }));
  },

  getDiagnosis: (patientId) => {
    return get().diagnoses[patientId];
  }
}));
