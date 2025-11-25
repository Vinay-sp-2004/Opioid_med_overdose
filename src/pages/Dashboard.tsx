import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MedicationForm } from '@/components/MedicationForm';
import { ResultsSection } from '@/components/ResultsSection';
import { Recommendations } from '@/components/Recommendations';
import { toast } from '@/hooks/use-toast';
import { AlertTriangle, PinIcon, ArrowLeft } from 'lucide-react';

const LOCAL_STORAGE_KEY = 'overdose_analysis_form_v1';

const initialPatientData = {
  age: '',
  weight: '',
  height: '',
  gender: '',
  medicalHistory: [] as string[],
  currentMedications: [] as any[],
  has_chronic_pain: false,
  has_mental_health_dx: false,
  history_of_substance_abuse: false,
  liver_disease: false,
  kidney_disease: false,
  respiratory_disease: false,
  treatment_duration_months: 0,
  concurrent_benzos: false,
  concurrent_muscle_relaxants: false,
  concurrent_sleep_meds: false,
  concurrent_antidepressants: false,
  tobacco_use: false,
  previous_overdose: false,
  alcohol_use: 'None',
  primary_opioid: '',
  daily_dosage_mg: 0,
  daily_mme: 0,
  risk_factors_count: 0,
};

const Dashboard = () => {
  const [patientData, setPatientData] = useState(initialPatientData);
  const [activeTab, setActiveTab] = useState<'info' | 'medications' | 'results'>('info');
  const [analysisPackage, setAnalysisPackage] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const navigate = useNavigate();

  // Load saved form state
  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setPatientData(prev => ({
          ...prev,
          ...parsed,
          medicalHistory: parsed.medicalHistory ?? prev.medicalHistory,
          currentMedications: parsed.currentMedications ?? prev.currentMedications,
        }));
      } catch (e) {
        console.error('Failed to parse saved analysis form:', e);
      }
    }
  }, []);

  // Load profile age/gender
  useEffect(() => {
    const userJson = localStorage.getItem('user');
    if (!userJson) {
      navigate('/login');
      return;
    }
    const user = JSON.parse(userJson);

    (async () => {
      try {
        const res = await axios.get(
          `http://localhost:8000/profile/${encodeURIComponent(user.email)}`,
          { headers: { Accept: 'application/json' } }
        );
        if (res.data?.profile) {
          const p = res.data.profile;
          setPatientData(prev => ({
            ...prev,
            age: p.age !== undefined && p.age !== null ? String(p.age) : prev.age,
            gender: p.gender ?? prev.gender,
          }));
        }
      } catch { }
    })();
  }, [navigate]);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(patientData));
  }, [patientData]);

  // Helpers
  const handleInputChange = (field: string, value: any) => {
    setPatientData(prev => ({ ...prev, [field]: value }));
  };

  const handleMedicationChange = (medications: any[]) => {
    setPatientData(prev => ({ ...prev, currentMedications: medications }));
  };

  const handleMedicalHistoryChange = (conditions: string[]) => {
    setPatientData(prev => ({
      ...prev,
      medicalHistory: conditions,
      has_chronic_pain: conditions.includes('Chronic Pain'),
      has_mental_health_dx: conditions.includes('Mental Health Disorders'),
      history_of_substance_abuse: conditions.includes('Substance Abuse History'),
      liver_disease: conditions.includes('Liver Disease'),
      kidney_disease: conditions.includes('Kidney Disease'),
      respiratory_disease: conditions.includes('Respiratory Disease'),
    }));
  };

  const handleLifestyleChange = (field: string, value: boolean | string) => {
    setPatientData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // RUN ANALYSIS
  const analyzeData = async () => {
    if (!patientData.age || !patientData.weight || !patientData.gender) {
      toast({ title: 'Missing Information', description: 'Please fill in all required patient information.', variant: 'destructive' });
      return;
    }
    if (patientData.currentMedications.length === 0) {
      toast({ title: 'No Medications', description: 'Please add at least one opioid medication.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);

    try {
      const processedPatientData = {
        ...patientData,
        age: Number(patientData.age),
        weight: Number(patientData.weight),
        height: Number(patientData.height),
      };

      // Compute Daily MME
      const mme_factors = {
        Morphine: 1.0,
        Hydrocodone: 1.0,
        Oxycodone: 1.5,
        Hydromorphone: 4.0,
        Fentanyl: 100.0,
        Codeine: 0.15,
        Tramadol: 0.1,
      };

      const dailyMME = processedPatientData.currentMedications.reduce((total: number, med: any) => {
        const factor = mme_factors[med.name] || 1;
        const dose = parseFloat(med.dosage || 0);
        const times = med.frequency === 'twice' ? 2 :
          med.frequency === 'three' ? 3 :
            med.frequency === 'four' ? 4 : 1;
        return total + factor * dose * times;
      }, 0);

      processedPatientData.daily_mme = dailyMME;

      const predictPayload: any = {
        ...processedPatientData,
        weight_kg: processedPatientData.weight,
        height_cm: processedPatientData.height
      };
      delete predictPayload.weight;
      delete predictPayload.height;

      const response = await axios.post('http://localhost:8000/predict', predictPayload);
      const result = response.data.prediction;

      const userJson = localStorage.getItem('user');
      if (userJson) {
        const user = JSON.parse(userJson);

        const riskProb = typeof result.risk_probability === 'number' ? result.risk_probability : 0;
        const savePayload = {
          email: user.email,
          input_data: processedPatientData,
          result: { ...result, daily_mme: dailyMME },
          pinned: false,
          summary: `Risk: ${(riskProb * 100).toFixed(2)}%`
        };

        await axios.post('http://localhost:8000/analysis', savePayload);
      }

      setAnalysisPackage({
        results: { ...result, daily_mme: dailyMME },
        patientData: processedPatientData,
      });
      setActiveTab('results');
      toast({ title: 'Analysis Complete', description: 'Your analysis is ready.' });
    } catch (err) {
      toast({ title: 'Analysis Failed', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinAnalysis = async () => {
    if (!analysisPackage?.results?.id) return;

    try {
      await axios.put(
        `http://localhost:8000/analysis/${analysisPackage.results.id}/pin`,
        { pinned: true }
      );
      setIsPinned(true);
      toast({ title: 'Pinned', description: 'Analysis pinned successfully.' });
    } catch { }
  };

  const handleBackFromResults = () => {
    setActiveTab('medications');
  };

  // START NEW ANALYSIS (ONLY RESET — NO RESAVE)
  const handleStartNewAnalysis = () => {
    const savedAge = patientData.age;
    const savedGender = patientData.gender;

    setPatientData({
      ...initialPatientData,
      age: savedAge,
      gender: savedGender,
    });

    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setAnalysisPackage(null);
    setIsPinned(false);
    setActiveTab('info');
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl animate-fade-in">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-6 tracking-tight">
        Opioid Medication Safety Analysis
      </h1>

      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 dark:bg-yellow-900/20 dark:border-yellow-700 rounded-md">
        <div className="flex">
          <AlertTriangle className="h-6 w-6 text-yellow-500 dark:text-yellow-400 mr-3 mt-0.5" />
          <div>
            <p className="font-semibold text-yellow-800 dark:text-yellow-300">Important Safety Information</p>
            <p className="text-sm text-yellow-700 dark:text-yellow-400 leading-relaxed">
              This tool supports clinical decision-making but does not replace medical judgment.
            </p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="info">Patient Information</TabsTrigger>
          <TabsTrigger value="medications">Medications & History</TabsTrigger>
          <TabsTrigger value="results" disabled={!analysisPackage}>Results</TabsTrigger>
        </TabsList>

        {/* Patient Info */}
        <TabsContent value="info">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Patient Details</CardTitle>
              <CardDescription>Enter patient details to personalize the analysis.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Age (years)</label>
                <Input value={patientData.age} type="number" onChange={e => handleInputChange('age', e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Gender</label>
                <Select value={patientData.gender} onValueChange={value => handleInputChange('gender', value)}>
                  <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Weight (kg)</label>
                <Input value={patientData.weight} type="number" onChange={e => handleInputChange('weight', e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Height (cm)</label>
                <Input value={patientData.height} type="number" onChange={e => handleInputChange('height', e.target.value)} />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={() => setActiveTab('medications')} className="bg-cyan-600 hover:bg-cyan-700">
                Continue to Medications
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Medications */}
        <TabsContent value="medications">
          <MedicationForm
            currentMedications={patientData.currentMedications}
            medicalHistory={patientData.medicalHistory}
            onMedicationChange={handleMedicationChange}
            onMedicalHistoryChange={handleMedicalHistoryChange}
            onAnalyze={analyzeData}
            isLoading={isLoading}
            lifestyleData={{
              concurrent_benzos: patientData.concurrent_benzos,
              concurrent_muscle_relaxants: patientData.concurrent_muscle_relaxants,
              concurrent_sleep_meds: patientData.concurrent_sleep_meds,
              concurrent_antidepressants: patientData.concurrent_antidepressants,
              tobacco_use: patientData.tobacco_use,
              previous_overdose: patientData.previous_overdose,
              alcohol_use: patientData.alcohol_use,
            }}
            onLifestyleChange={handleLifestyleChange}
          />
        </TabsContent>

        {/* RESULTS */}
        <TabsContent value="results">
          {analysisPackage && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={handleBackFromResults}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Analysis Results</h2>
                </div>
                <Button variant="outline" size="sm" disabled={isPinned} onClick={handlePinAnalysis} className="flex items-center gap-2">
                  <PinIcon className="h-4 w-4" /> {isPinned ? 'Pinned' : 'Pin this analysis'}
                </Button>
              </div>

              <ResultsSection results={analysisPackage.results} patientData={analysisPackage.patientData} />

              {analysisPackage.results?.recommendations && (
                <Recommendations recommendations={analysisPackage.results.recommendations} />
              )}

              <div className="flex justify-center mt-8 space-x-4">
                <Button variant="outline" onClick={() => navigate('/history')}>
                  View Analysis History
                </Button>
                <Button onClick={handleStartNewAnalysis} className="bg-cyan-600 hover:bg-cyan-700">
                  Start New Analysis
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;
