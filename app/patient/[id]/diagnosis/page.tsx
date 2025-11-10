'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { PatientData } from '@/lib/types';
import { useAnnotationStore } from '@/lib/store';
import { Brain, ArrowLeft, CheckCircle, Save } from 'lucide-react';

export default function DiagnosisPage() {
  const router = useRouter();
  const params = useParams();
  const patientId = params.id as string;

  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [loading, setLoading] = useState(true);

  // Diagnosis form
  const [diagnosis, setDiagnosis] = useState<'CN' | 'AD' | ''>('');
  const [confidence, setConfidence] = useState<'low' | 'medium' | 'high' | ''>('');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const { getAnnotations, setDiagnosis: saveDiagnosis, getDiagnosis } = useAnnotationStore();
  const annotations = getAnnotations(patientId);
  const existingDiagnosis = getDiagnosis(patientId);

  useEffect(() => {
    // Load patient data
    fetch(`/output_predictions/patients/${patientId}/predictions.json`)
      .then(res => res.json())
      .then((data: PatientData) => {
        setPatientData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load patient data:', err);
        setLoading(false);
      });

    // Load existing diagnosis if any
    if (existingDiagnosis) {
      setDiagnosis(existingDiagnosis.diagnosis || '');
      setConfidence(existingDiagnosis.confidence || '');
      setNotes(existingDiagnosis.notes);
    }
  }, [patientId, existingDiagnosis]);

  const handleSubmit = () => {
    if (!diagnosis || !confidence) {
      alert('Please select both diagnosis and confidence level');
      return;
    }

    saveDiagnosis({
      patientId,
      diagnosis: diagnosis as 'CN' | 'AD',
      confidence: confidence as 'low' | 'medium' | 'high',
      notes,
      timestamp: Date.now()
    });

    setSubmitted(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Brain className="w-16 h-16 mx-auto mb-4 animate-pulse" />
          <p className="text-lg">Loading patient data...</p>
        </div>
      </div>
    );
  }

  if (!patientData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-lg text-muted-foreground">Patient not found</p>
            <Button onClick={() => router.push('/')} className="mt-4">
              Back to Patients
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    const isCorrect = diagnosis === patientData.true_diagnosis;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <Card className="max-w-2xl w-full">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <CheckCircle className="w-16 h-16 text-green-500" />
            </div>
            <CardTitle className="text-center text-2xl">Diagnosis Submitted</CardTitle>
            <CardDescription className="text-center">
              Your diagnosis has been saved successfully
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-6 rounded-lg space-y-3">
              <h3 className="font-semibold text-lg">Your Diagnosis:</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Diagnosis:</span>{' '}
                  <span className={`font-medium ${
                    diagnosis === 'AD' ? 'text-red-500' : 'text-green-500'
                  }`}>
                    {diagnosis === 'AD' ? 'Alzheimer's Disease' : 'Cognitively Normal'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Confidence:</span>{' '}
                  <span className="font-medium capitalize">{confidence}</span>
                </div>
              </div>
              {notes && (
                <div>
                  <span className="text-muted-foreground">Notes:</span>
                  <p className="mt-1">{notes}</p>
                </div>
              )}
            </div>

            <div className="bg-muted p-6 rounded-lg space-y-3">
              <h3 className="font-semibold text-lg">True Diagnosis:</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Actual:</span>{' '}
                  <span className="font-medium">{patientData.true_label}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Your diagnosis:</span>{' '}
                  <span className={`font-medium ${isCorrect ? 'text-green-500' : 'text-red-500'}`}>
                    {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-muted p-6 rounded-lg space-y-3">
              <h3 className="font-semibold text-lg">Model Prediction:</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Predicted:</span>{' '}
                  <span className={`font-medium ${
                    patientData.patient_prediction.predicted_label === 'AD' ? 'text-red-500' : 'text-green-500'
                  }`}>
                    {patientData.patient_prediction.predicted_label === 'AD' ? 'Dementia' : 'No Dementia'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Confidence:</span>{' '}
                  <span className="font-medium">{(patientData.patient_prediction.confidence * 100).toFixed(1)}%</span>
                </div>
                <div>
                  <span className="text-muted-foreground">AD Votes:</span>{' '}
                  <span>{patientData.patient_prediction.ad_votes}/{patientData.patient_prediction.total_slices}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Model was:</span>{' '}
                  <span className={`font-medium ${
                    patientData.is_correct ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {patientData.is_correct ? '✓ Correct' : '✗ Incorrect'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => router.push(`/patient/${patientId}`)}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Review Slices
              </Button>
              <Button
                className="flex-1"
                onClick={() => router.push('/')}
              >
                Back to Patients
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => router.push(`/patient/${patientId}`)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Slice Viewer
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl">
              <Brain className="w-8 h-8" />
              Make Diagnosis: {patientData.patient_id}
            </CardTitle>
            <CardDescription>
              Review the patient information and make your diagnosis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Patient Summary */}
            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-semibold mb-3">Patient Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Slices:</span>{' '}
                  <span className="font-medium">{patientData.num_slices}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Annotations:</span>{' '}
                  <span className="font-medium">{annotations.length}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Model Pred:</span>{' '}
                  <span className={`font-medium ${
                    patientData.patient_prediction.predicted_label === 'AD' ? 'text-red-500' : 'text-green-500'
                  }`}>
                    {patientData.patient_prediction.predicted_label}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Model Conf:</span>{' '}
                  <span className="font-medium">{(patientData.patient_prediction.confidence * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* Diagnosis Form */}
            <div className="space-y-6">
              {/* Diagnosis Selection */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Select Diagnosis *</Label>
                <RadioGroup value={diagnosis} onValueChange={(value) => setDiagnosis(value as 'CN' | 'AD')}>
                  <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-accent cursor-pointer">
                    <RadioGroupItem value="CN" id="cn" />
                    <Label htmlFor="cn" className="flex-1 cursor-pointer">
                      <div className="font-medium">Cognitively Normal (CN)</div>
                      <div className="text-sm text-muted-foreground">No signs of Alzheimer's Disease</div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-accent cursor-pointer">
                    <RadioGroupItem value="AD" id="ad" />
                    <Label htmlFor="ad" className="flex-1 cursor-pointer">
                      <div className="font-medium">Alzheimer's Disease (AD)</div>
                      <div className="text-sm text-muted-foreground">Signs of Alzheimer's Disease detected</div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Confidence Level */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Confidence Level *</Label>
                <RadioGroup value={confidence} onValueChange={(value) => setConfidence(value as 'low' | 'medium' | 'high')}>
                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2 flex-1 p-4 border rounded-lg hover:bg-accent cursor-pointer">
                      <RadioGroupItem value="low" id="low" />
                      <Label htmlFor="low" className="cursor-pointer">Low</Label>
                    </div>
                    <div className="flex items-center space-x-2 flex-1 p-4 border rounded-lg hover:bg-accent cursor-pointer">
                      <RadioGroupItem value="medium" id="medium" />
                      <Label htmlFor="medium" className="cursor-pointer">Medium</Label>
                    </div>
                    <div className="flex items-center space-x-2 flex-1 p-4 border rounded-lg hover:bg-accent cursor-pointer">
                      <RadioGroupItem value="high" id="high" />
                      <Label htmlFor="high" className="cursor-pointer">High</Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              {/* Notes */}
              <div className="space-y-3">
                <Label htmlFor="notes" className="text-base font-semibold">Additional Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any additional observations, reasoning, or comments about your diagnosis..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                />
              </div>

              {/* Annotations Summary */}
              {annotations.length > 0 && (
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Your Annotations ({annotations.length})</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {annotations.map((ann) => (
                      <div key={ann.sliceIndex} className="text-sm p-2 bg-background rounded">
                        <span className="font-medium">Slice {ann.sliceIndex + 1}:</span> {ann.note}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => router.push(`/patient/${patientId}`)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleSubmit}
                disabled={!diagnosis || !confidence}
              >
                <Save className="w-4 h-4 mr-2" />
                Submit Diagnosis
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
