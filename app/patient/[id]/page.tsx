'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { PatientData } from '@/lib/types';
import { useAnnotationStore } from '@/lib/store';
import { Brain, ArrowLeft, MessageSquarePlus, Trash2, Save, CheckCircle, Pencil, Eraser, RotateCcw, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { ReactSketchCanvas, ReactSketchCanvasRef } from 'react-sketch-canvas';

export default function PatientViewerPage() {
  const router = useRouter();
  const params = useParams();
  const patientId = params.id as string;

  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSliceIndex, setCurrentSliceIndex] = useState(0);
  const canvasRef = useRef<ReactSketchCanvasRef>(null);
  const [strokeColor, setStrokeColor] = useState('#FF0000');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [eraserMode, setEraserMode] = useState(false);

  // Diagnosis form
  const [diagnosis, setDiagnosis] = useState<'CN' | 'AD' | ''>('');
  const [confidence, setConfidence] = useState<'low' | 'medium' | 'high' | ''>('');
  const [notes, setNotes] = useState('');

  const { addAnnotation, removeAnnotation, getAnnotations, getAnnotation, getDiagnosis, setDiagnosis: saveDiagnosis } = useAnnotationStore();
  const currentAnnotations = getAnnotations(patientId);
  const existingDiagnosis = getDiagnosis(patientId);

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

    // Load existing diagnosis if any
    if (existingDiagnosis) {
      setDiagnosis(existingDiagnosis.diagnosis || '');
      setConfidence(existingDiagnosis.confidence || '');
      setNotes(existingDiagnosis.notes);
    }
  }, [patientId, existingDiagnosis]);

  // Load existing drawing for current slice
  useEffect(() => {
    const loadDrawing = async () => {
      const annotation = getAnnotation(patientId, currentSliceIndex);
      if (annotation?.note && canvasRef.current) {
        try {
          await canvasRef.current.loadPaths(JSON.parse(annotation.note));
        } catch (e) {
          console.error('Failed to load drawing:', e);
        }
      } else if (canvasRef.current) {
        canvasRef.current.clearCanvas();
      }
    };
    loadDrawing();
  }, [currentSliceIndex, patientId, getAnnotation]);

  const handleSaveAnnotation = async () => {
    if (canvasRef.current) {
      const paths = await canvasRef.current.exportPaths();
      if (paths && paths.length > 0) {
        // Export canvas as image data URL
        const imageData = await canvasRef.current.exportImage('png');
        addAnnotation(patientId, currentSliceIndex, JSON.stringify(paths), imageData);
      }
    }
  };

  const handleClearAnnotation = () => {
    if (canvasRef.current) {
      canvasRef.current.clearCanvas();
      removeAnnotation(patientId, currentSliceIndex);
    }
  };

  const handleUndo = () => {
    if (canvasRef.current) {
      canvasRef.current.undo();
    }
  };

  const handleRedo = () => {
    if (canvasRef.current) {
      canvasRef.current.redo();
    }
  };

  const handleSubmitDiagnosis = () => {
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

    // Navigate to results page
    router.push(`/patient/${patientId}/results`);
  };

  const currentAnnotation = getAnnotation(patientId, currentSliceIndex);

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

  const currentSlice = patientData.slice_predictions[currentSliceIndex];
  const imagePath = `/output_predictions/patients/${patientId}/slices/${currentSlice.original}`;

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/')}
            className="mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Patients
          </Button>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Brain className="w-8 h-8" />
            S.H.I.A - Patient: {patientData.patient_id}
          </h1>
          <p className="text-muted-foreground">
            {patientData.num_slices} MRI slices available
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Viewer */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>
                  Slice {currentSliceIndex + 1} of {patientData.num_slices}
                </CardTitle>
                <CardDescription>
                  Use the slider below to navigate through slices
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* MRI Image with Canvas Overlay */}
                <div className="relative w-full aspect-square bg-black rounded-lg overflow-hidden mb-4">
                  <Image
                    src={imagePath}
                    alt={`Slice ${currentSliceIndex + 1}`}
                    fill
                    className="object-contain"
                    priority
                  />
                  <div className="absolute inset-0">
                    <ReactSketchCanvas
                      ref={canvasRef}
                      strokeWidth={strokeWidth}
                      strokeColor={eraserMode ? 'transparent' : strokeColor}
                      canvasColor="transparent"
                      style={{
                        width: '100%',
                        height: '100%',
                      }}
                      eraserWidth={strokeWidth * 2}
                    />
                  </div>
                </div>

                {/* Drawing Controls */}
                <div className="flex flex-wrap gap-2 mb-4 items-center">
                  <Button
                    variant={eraserMode ? "outline" : "default"}
                    size="sm"
                    onClick={() => setEraserMode(false)}
                  >
                    <Pencil className="w-4 h-4 mr-1" />
                    Draw
                  </Button>
                  <Button
                    variant={eraserMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEraserMode(true)}
                  >
                    <Eraser className="w-4 h-4 mr-1" />
                    Erase
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUndo}
                  >
                    Undo
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRedo}
                  >
                    Redo
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearAnnotation}
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Clear
                  </Button>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Color:</Label>
                    <input
                      type="color"
                      value={strokeColor}
                      onChange={(e) => setStrokeColor(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Size:</Label>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      value={strokeWidth}
                      onChange={(e) => setStrokeWidth(Number(e.target.value))}
                      className="w-20"
                    />
                    <span className="text-xs">{strokeWidth}px</span>
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleSaveAnnotation}
                  >
                    <Save className="w-4 h-4 mr-1" />
                    Save Drawing
                  </Button>
                </div>

                {/* Slider */}
                <div className="space-y-2">
                  <Label>Slice Navigator</Label>
                  <Slider
                    value={[currentSliceIndex]}
                    onValueChange={([value]) => setCurrentSliceIndex(value)}
                    max={patientData.num_slices - 1}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Slice 1</span>
                    <span>Slice {patientData.num_slices}</span>
                  </div>
                </div>

                {/* Slice Info */}
                <div className="mt-4 p-4 bg-muted rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">
                    Slice {currentSliceIndex + 1} of {patientData.num_slices}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Make Diagnosis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Make Diagnosis
                </CardTitle>
                <CardDescription>
                  Review the scans and provide your diagnosis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Diagnosis Selection */}
                <div>
                  <Label className="font-semibold mb-2">Diagnosis</Label>
                  <RadioGroup value={diagnosis} onValueChange={(value) => setDiagnosis(value as 'CN' | 'AD')} className="space-y-2 mt-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="CN" id="cn" />
                      <Label htmlFor="cn" className="cursor-pointer font-normal">
                        No Dementia (CN)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="AD" id="ad" />
                      <Label htmlFor="ad" className="cursor-pointer font-normal">
                        Dementia (AD)
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Confidence Level */}
                <div>
                  <Label className="font-semibold mb-2">Confidence</Label>
                  <RadioGroup value={confidence} onValueChange={(value) => setConfidence(value as 'low' | 'medium' | 'high')} className="space-y-2 mt-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="low" id="low" />
                      <Label htmlFor="low" className="cursor-pointer font-normal">Low</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="medium" id="medium" />
                      <Label htmlFor="medium" className="cursor-pointer font-normal">Medium</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="high" id="high" />
                      <Label htmlFor="high" className="cursor-pointer font-normal">High</Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Notes */}
                <div>
                  <Label htmlFor="diagnosis-notes" className="font-semibold mb-2">Notes (Optional)</Label>
                  <Textarea
                    id="diagnosis-notes"
                    placeholder="Add any notes about your diagnosis..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-2"
                    rows={3}
                  />
                </div>

                {/* Submit Button */}
                <Button
                  onClick={handleSubmitDiagnosis}
                  className="w-full"
                  disabled={!diagnosis || !confidence}
                >
                  Next: View Results
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            {/* Annotations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Pencil className="w-5 h-5" />
                  Drawings
                </CardTitle>
                <CardDescription>
                  {currentAnnotations.length} slice(s) with drawings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  {currentAnnotation ? (
                    <p className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      This slice has a saved drawing
                    </p>
                  ) : (
                    <p>Draw on the image above and click "Save Drawing"</p>
                  )}
                </div>

                {/* List of annotated slices */}
                {currentAnnotations.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold text-sm mb-2">Annotated Slices</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {currentAnnotations.map((ann) => (
                        <div
                          key={ann.sliceIndex}
                          className={`p-2 rounded text-sm cursor-pointer transition-colors flex items-center justify-between ${
                            ann.sliceIndex === currentSliceIndex
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted hover:bg-muted/80'
                          }`}
                          onClick={() => setCurrentSliceIndex(ann.sliceIndex)}
                        >
                          <div className="font-medium">Slice {ann.sliceIndex + 1}</div>
                          <Pencil className="w-3 h-3" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
