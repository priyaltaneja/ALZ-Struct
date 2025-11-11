'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { PatientData } from '@/lib/types';
import { useAnnotationStore } from '@/lib/store';
import { Brain, ArrowLeft, CheckCircle, XCircle, AlertCircle, Save, Home } from 'lucide-react';
import Image from 'next/image';

export default function ResultsPage() {
  const router = useRouter();
  const params = useParams();
  const patientId = params.id as string;

  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSliceIndex, setCurrentSliceIndex] = useState(0);

  // Revision states
  const [isRevising, setIsRevising] = useState(false);
  const [revisedDiagnosis, setRevisedDiagnosis] = useState<'CN' | 'AD' | ''>('');
  const [revisedConfidence, setRevisedConfidence] = useState<'low' | 'medium' | 'high' | ''>('');
  const [revisedNotes, setRevisedNotes] = useState('');

  const { getDiagnosis, getAnnotation, setDiagnosis: saveDiagnosis } = useAnnotationStore();
  const doctorDiagnosis = getDiagnosis(patientId);

  useEffect(() => {
    // Load patient predictions
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
  }, [patientId]);


  const handleRevise = () => {
    if (doctorDiagnosis) {
      setRevisedDiagnosis(doctorDiagnosis.diagnosis || '');
      setRevisedConfidence(doctorDiagnosis.confidence || '');
      setRevisedNotes(doctorDiagnosis.notes);
      setIsRevising(true);
    }
  };

  const handleSaveRevision = () => {
    if (!revisedDiagnosis || !revisedConfidence) {
      alert('Please select both diagnosis and confidence level');
      return;
    }

    saveDiagnosis({
      patientId,
      diagnosis: revisedDiagnosis as 'CN' | 'AD',
      confidence: revisedConfidence as 'low' | 'medium' | 'high',
      notes: revisedNotes,
      timestamp: Date.now()
    });

    setIsRevising(false);
    alert('Diagnosis updated successfully!');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Brain className="w-16 h-16 mx-auto mb-4 animate-pulse" />
          <p className="text-lg">Loading results...</p>
        </div>
      </div>
    );
  }

  if (!patientData || !doctorDiagnosis) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-lg text-muted-foreground">
              {!patientData ? 'Patient not found' : 'No diagnosis found'}
            </p>
            <Button onClick={() => router.push(`/patient/${patientId}`)} className="mt-4">
              Back to Patient
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentSlice = patientData.slice_predictions[currentSliceIndex];
  const imagePath = `/output_predictions/patients/${patientId}/slices/${currentSlice.original}`;

  // Get the GradCAM image based on the slice's prediction (not patient-level)
  const slicePrediction = currentSlice.predicted_label;
  const gradcamPath = slicePrediction === 'AD'
    ? `/output_predictions/patients/${patientId}/slices/${currentSlice.ad_overlay}`
    : `/output_predictions/patients/${patientId}/slices/${currentSlice.cn_overlay}`;

  // Patient-level model prediction
  const modelPrediction = patientData.patient_prediction.predicted_label;

  const doctorCorrect = doctorDiagnosis.diagnosis === patientData.true_diagnosis;
  const modelCorrect = patientData.is_correct;

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push(`/patient/${patientId}`)}
            className="mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Slice Viewer
          </Button>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Brain className="w-8 h-8" />
            S.H.I.A - Results: {patientData.patient_id}
          </h1>
          <p className="text-sm text-muted-foreground">
            Structured Healthcare Intelligence for Alzheimer's
          </p>
        </div>

        {/* Diagnosis Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Doctor's Diagnosis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {doctorCorrect ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                Your Diagnosis
              </CardTitle>
              <CardDescription>
                {doctorCorrect ? 'Correct!' : 'Incorrect'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="text-sm text-muted-foreground">Diagnosis:</span>
                <p className={`font-semibold ${
                  doctorDiagnosis.diagnosis === 'AD' ? 'text-red-500' : 'text-green-500'
                }`}>
                  {doctorDiagnosis.diagnosis === 'AD' ? 'Alzheimer\'s Disease (AD)' : 'Cognitively Normal (CN)'}
                </p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Confidence:</span>
                <p className="font-medium capitalize">{doctorDiagnosis.confidence}</p>
              </div>
              {doctorDiagnosis.notes && (
                <div>
                  <span className="text-sm text-muted-foreground">Notes:</span>
                  <p className="text-sm">{doctorDiagnosis.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Diagnosis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {modelCorrect ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                AI Model Diagnosis
              </CardTitle>
              <CardDescription>
                {modelCorrect ? 'Correct!' : 'Incorrect'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="text-sm text-muted-foreground">Diagnosis:</span>
                <p className={`font-semibold ${
                  modelPrediction === 'AD' ? 'text-red-500' : 'text-green-500'
                }`}>
                  {modelPrediction === 'AD' ? 'Alzheimer\'s Disease (AD)' : 'Cognitively Normal (CN)'}
                </p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Confidence:</span>
                <p className="font-medium">{(patientData.patient_prediction.confidence * 100).toFixed(1)}%</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">AD Votes:</span>
                <p className="font-medium">
                  {patientData.patient_prediction.ad_votes} / {patientData.patient_prediction.total_slices}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* True Diagnosis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                True Diagnosis
              </CardTitle>
              <CardDescription>Ground Truth</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="text-sm text-muted-foreground">Actual:</span>
                <p className="font-semibold text-lg">{patientData.true_label}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Label:</span>
                <p className="font-medium">{patientData.true_diagnosis}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Slice-by-Slice Comparison */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Slice-by-Slice Analysis</CardTitle>
            <CardDescription>
              View original images with annotations and AI GradCAM visualizations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Slider */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <Label>Slice {currentSliceIndex + 1} of {patientData.num_slices}</Label>
                <div className="text-sm text-muted-foreground">
                  AI Prediction: <span className={`font-medium ${
                    currentSlice.predicted_class.toString() === 'AD' ? 'text-red-500' : 'text-green-500'
                  }`}>
                    {currentSlice.predicted_class}
                  </span> ({(currentSlice.confidence * 100).toFixed(1)}%)
                </div>
              </div>
              <Slider
                value={[currentSliceIndex]}
                onValueChange={([value]) => setCurrentSliceIndex(value)}
                max={patientData.num_slices - 1}
                step={1}
                className="w-full"
              />
            </div>

            {/* Side-by-Side Images */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Original with Annotations */}
              <div>
                <h3 className="font-semibold mb-2">Original Scan {getAnnotation(patientId, currentSliceIndex) ? '(with your annotations)' : ''}</h3>
                <div className="relative w-full aspect-square bg-black rounded-lg overflow-hidden">
                  <Image
                    src={imagePath}
                    alt={`Slice ${currentSliceIndex + 1}`}
                    fill
                    className="object-contain"
                  />
                  {getAnnotation(patientId, currentSliceIndex)?.imageData && (
                    <div className="absolute inset-0 pointer-events-none">
                      <Image
                        src={getAnnotation(patientId, currentSliceIndex)!.imageData!}
                        alt="Annotations"
                        fill
                        className="object-contain"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* GradCAM Visualization */}
              <div>
                <h3 className="font-semibold mb-2">AI GradCAM (Model predicted: {currentSlice.predicted_label})</h3>
                <div className="relative w-full aspect-square bg-black rounded-lg overflow-hidden">
                  <Image
                    src={gradcamPath}
                    alt={`GradCAM for Slice ${currentSliceIndex + 1}`}
                    fill
                    className="object-contain"
                  />
                </div>
                <div className="mt-4 space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-green-600">CN Probability</span>
                      <span className="font-semibold">{(currentSlice.cn_prob * 100).toFixed(1)}%</span>
                    </div>
                    <Progress
                      value={currentSlice.cn_prob * 100}
                      className="h-3"
                      indicatorClassName="bg-green-500"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-red-600">AD Probability</span>
                      <span className="font-semibold">{(currentSlice.ad_prob * 100).toFixed(1)}%</span>
                    </div>
                    <Progress
                      value={currentSlice.ad_prob * 100}
                      className="h-3"
                      indicatorClassName="bg-red-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revise Diagnosis Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Revise Your Diagnosis</CardTitle>
            <CardDescription>
              After reviewing the AI analysis, you can update your diagnosis if needed
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isRevising ? (
              <Button onClick={handleRevise} className="w-full">
                Revise Diagnosis
              </Button>
            ) : (
              <div className="space-y-4">
                {/* Diagnosis Selection */}
                <div>
                  <Label className="font-semibold mb-2">Diagnosis</Label>
                  <RadioGroup
                    value={revisedDiagnosis}
                    onValueChange={(value) => setRevisedDiagnosis(value as 'CN' | 'AD')}
                    className="space-y-2 mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="CN" id="revised-cn" />
                      <Label htmlFor="revised-cn" className="cursor-pointer font-normal">
                        Cognitively Normal (CN)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="AD" id="revised-ad" />
                      <Label htmlFor="revised-ad" className="cursor-pointer font-normal">
                        Alzheimer's Disease (AD)
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Confidence Level */}
                <div>
                  <Label className="font-semibold mb-2">Confidence</Label>
                  <RadioGroup
                    value={revisedConfidence}
                    onValueChange={(value) => setRevisedConfidence(value as 'low' | 'medium' | 'high')}
                    className="space-y-2 mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="low" id="revised-low" />
                      <Label htmlFor="revised-low" className="cursor-pointer font-normal">Low</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="medium" id="revised-medium" />
                      <Label htmlFor="revised-medium" className="cursor-pointer font-normal">Medium</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="high" id="revised-high" />
                      <Label htmlFor="revised-high" className="cursor-pointer font-normal">High</Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Notes */}
                <div>
                  <Label htmlFor="revised-notes" className="font-semibold mb-2">Notes (Optional)</Label>
                  <Textarea
                    id="revised-notes"
                    placeholder="Add any notes about your revised diagnosis..."
                    value={revisedNotes}
                    onChange={(e) => setRevisedNotes(e.target.value)}
                    className="mt-2"
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveRevision}
                    className="flex-1"
                    disabled={!revisedDiagnosis || !revisedConfidence}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Revision
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsRevising(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => router.push(`/patient/${patientId}`)}
            className="flex-1"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Slice Viewer
          </Button>
          <Button
            onClick={() => router.push('/')}
            className="flex-1"
          >
            <Home className="w-4 h-4 mr-2" />
            Back to Patients
          </Button>
        </div>
      </div>
    </div>
  );
}
