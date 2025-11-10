'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GlobalPredictions } from '@/lib/types';
import { useAnnotationStore } from '@/lib/store';
import { Brain, User, CheckCircle2, XCircle, FileCheck } from 'lucide-react';

export default function PatientSelectionPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<GlobalPredictions['patients']>([]);
  const [loading, setLoading] = useState(true);
  const { getDiagnosis } = useAnnotationStore();

  useEffect(() => {
    // Load predictions.json
    fetch('/output_predictions/predictions.json')
      .then(res => res.json())
      .then((data: GlobalPredictions) => {
        setPatients(data.patients);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load predictions:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Brain className="w-16 h-16 mx-auto mb-4 animate-pulse" />
          <p className="text-lg">Loading patients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <Brain className="w-10 h-10" />
            S.H.I.A
          </h1>
          <p className="text-xl font-semibold text-muted-foreground mb-1">
            Structured Healthcare Intelligence for Alzheimer's
          </p>
          <p className="text-muted-foreground">
            Select a patient to review their MRI scans and make a diagnosis
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {patients.map((patient) => {
            const diagnosis = getDiagnosis(patient.patient_id);
            const hasCompleted = !!diagnosis;

            return (
              <Card
                key={patient.patient_id}
                className={`hover:shadow-lg transition-shadow cursor-pointer ${
                  hasCompleted ? 'border-green-500 border-2' : ''
                }`}
                onClick={() => router.push(`/patient/${patient.patient_id}`)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    {patient.patient_id}
                  </CardTitle>
                  <CardDescription>
                    {patient.num_slices} MRI slices
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {hasCompleted && (
                    <div className="mb-2 p-2 bg-green-50 dark:bg-green-950 rounded-md">
                      <div className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-300 mb-1">
                        <FileCheck className="w-4 h-4" />
                        Diagnosis Complete
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium">Your diagnosis: </span>
                        <span className={diagnosis.diagnosis === 'AD' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                          {diagnosis.diagnosis === 'AD' ? 'AD' : 'CN'}
                        </span>
                        {' '}({diagnosis.confidence})
                      </div>
                    </div>
                  )}
                  <Button className="w-full">
                    {hasCompleted ? 'Review Again' : 'Review Patient'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {patients.length === 0 && !loading && (
          <Card>
            <CardContent className="p-12 text-center">
              <Brain className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg text-muted-foreground">
                No patient data found. Please run the prediction script first.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
