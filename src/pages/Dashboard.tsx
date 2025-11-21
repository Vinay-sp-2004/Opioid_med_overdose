
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
import { AlertTriangle, PinIcon } from 'lucide-react';

const Dashboard = () => {
  const [patientData, setPatientData] = useState({
    age: '',
    weight: '',
    height: '',
    gender: '',
    medicalHistory: [],
    currentMedications: [],
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
  });

  const [activeTab, setActiveTab] = useState('info');
  const [analysisPackage, setAnalysisPackage] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const userJson = localStorage.getItem('user');
    if (!userJson) {
      navigate('/login');
      return;
    }
    const user = JSON.parse(userJson);

    (async () => {
      try {
        const res = await axios.get(`http://localhost:8000/profile/${encodeURIComponent(user.email)}`, {
          headers: { Accept: 'application/json' },
        });
        if (res.data?.profile) {
          const p = res.data.profile;
          setPatientData(prev => ({
            ...prev,
            age: p.age !== undefined && p.age !== null ? String(p.age) : prev.age,
            gender: p.gender ?? prev.gender,
          }));
        }
      } catch (err) {
        console.warn('Profile fetch failed:', err?.message ?? err);
      }
    })();
  }, [navigate]);

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
      has_chronic_pain: conditions.includes("Chronic Pain"),
      has_mental_health_dx: conditions.includes("Mental Health Disorders"),
      history_of_substance_abuse: conditions.includes("Substance Abuse History"),
      liver_disease: conditions.includes("Liver Disease"),
      kidney_disease: conditions.includes("Kidney Disease"),
      respiratory_disease: conditions.includes("Respiratory Disease"),
    }));
  };

  const analyzeData = async () => {
  if (!patientData.age || !patientData.weight || !patientData.gender) {
    toast({
      title: 'Missing Information',
      description: 'Please fill in all required patient information.',
      variant: 'destructive',
    });
    return;
  }

  if (patientData.currentMedications.length === 0) {
    toast({
      title: 'No Medications',
      description: 'Please add at least one opioid medication to analyze.',
      variant: 'destructive',
    });
    return;
  }

  setIsLoading(true);

  try {
    // =============================
    // 1️⃣ Process basic patient data
    // =============================
    const processedPatientData = {
      ...patientData,
      age: Number(patientData.age),
      weight: Number(patientData.weight),
      height: Number(patientData.height),
      treatment_duration_months: Number(patientData.treatment_duration_months || 0),
      alcohol_use: patientData.alcohol_use || 'None',
    };

    // =============================
    // 2️⃣ FRONTEND — ACTUAL MME CALC
    // =============================
    const mme_factors: { [key: string]: number } = {
      Morphine: 1.0,
      Hydrocodone: 1.0,
      Oxycodone: 1.5,
      Hydromorphone: 4.0,
      Fentanyl: 100.0,
      Codeine: 0.15,
      Tramadol: 0.1,
    };

    const dailyMME = processedPatientData.currentMedications.reduce((total: number, med: any) => {
      const factor = mme_factors[med.name] || 1.0;
      const dose = parseFloat(med.dosage || "0");

      let times = 1;
      if (med.frequency === "twice") times = 2;
      else if (med.frequency === "thrice") times = 3;
      else if (med.frequency === "three") times = 3; // Just in case

      return total + (factor * dose * times);
    }, 0);

    // Inject correct MME
    processedPatientData.daily_mme = dailyMME;

    // =============================
    // 3️⃣ Prepare ML prediction payload
    // =============================
    const predictPayload = {
      ...processedPatientData,
      weight_kg: processedPatientData.weight,
      height_cm: processedPatientData.height,
    };

    delete predictPayload.weight;
    delete predictPayload.height;

    // =============================
    // 4️⃣ Call /predict
    // =============================
    const response = await axios.post("http://localhost:8000/predict", predictPayload);
    const result = response.data.prediction;

    // Safeguard
    const riskProbability =
      result?.risk_probability?.[0]?.[1] ??
      result?.overallRisk ??
      0;

    const riskPercentage = riskProbability * 100;

    // =============================
    // 5️⃣ Save analysis to history
    // =============================
    const userJson = localStorage.getItem('user');
    if (userJson) {
      const user = JSON.parse(userJson);

      const analysisPayload = {
        email: user.email,
        input_data: processedPatientData,
        result: {
          ...result,
          overallRisk: riskProbability,
          dailyMME: dailyMME,
        },
        pinned: false,
        summary: `Risk: ${riskPercentage.toFixed(2)}%`,
      };

      await axios.post("http://localhost:8000/analysis", analysisPayload);
    }

    // =============================
    // 6️⃣ Display results in UI
    // =============================
    setAnalysisPackage({
      results: {
        ...result,
        overallRisk: riskProbability,
        dailyMME: dailyMME,
      },
      patientData: processedPatientData,
    });

    setActiveTab('results');
    setIsPinned(false);

    toast({
      title: 'Analysis Complete',
      description: 'Your opioid medication risk assessment is ready.',
    });

  } catch (err) {
    console.error("Analysis failed:", err);
    toast({
      title: 'Analysis Failed',
      description: 'An error occurred while analyzing. Please check the console and try again.',
      variant: 'destructive',
    });
  } finally {
    setIsLoading(false);
  }
};


  const handlePinAnalysis = async () => {
    if (!analysisPackage?.results?.id) return;

    try {
      await axios.put(`http://localhost:8000/analysis/${analysisPackage.results.id}/pin`, { pinned: true });
      setIsPinned(true);
      toast({ title: 'Analysis Pinned', description: 'Pinned to your saved results.' });
    } catch (err) {
      toast({ title: 'Pinning Failed', description: 'Could not pin analysis.', variant: 'destructive' });
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl animate-fade-in">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-6">
        Opioid Medication Safety Analysis
      </h1>

      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 dark:bg-yellow-900/20 dark:border-yellow-700">
        <div className="flex">
          <AlertTriangle className="h-6 w-6 text-yellow-400 dark:text-yellow-600 mr-3" />
          <div>
            <p className="font-medium text-yellow-700 dark:text-yellow-500">Important Safety Information</p>
            <p className="text-yellow-600 dark:text-yellow-400">Opioid medications carry significant risks. This tool is for informational purposes only.</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="info">Patient Information</TabsTrigger>
          <TabsTrigger value="medications">Medications</TabsTrigger>
          <TabsTrigger value="results" disabled={!analysisPackage}>Results</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Patient Details</CardTitle>
              <CardDescription>Enter basic patient details for accurate analysis</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="age" className="text-sm font-medium">Age (years)</label>
                <Input id="age" type="number" value={patientData.age} onChange={(e) => handleInputChange('age', e.target.value)} />
              </div>
              <div className="space-y-2">
                <label htmlFor="gender" className="text-sm font-medium">Gender</label>
                <Select value={patientData.gender} onValueChange={(value) => handleInputChange('gender', value)}>
                  <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label htmlFor="weight" className="text-sm font-medium">Weight (kg)</label>
                <Input id="weight" type="number" value={patientData.weight} onChange={(e) => handleInputChange('weight', e.target.value)} />
              </div>
              <div className="space-y-2">
                <label htmlFor="height" className="text-sm font-medium">Height (cm)</label>
                <Input id="height" type="number" value={patientData.height} onChange={(e) => handleInputChange('height', e.target.value)} />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={() => setActiveTab('medications')} className="bg-cyan-600 hover:bg-cyan-700">Continue to Medications</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="medications">
          <MedicationForm
            currentMedications={patientData.currentMedications}
            onMedicationChange={handleMedicationChange}
            onMedicalHistoryChange={handleMedicalHistoryChange}
            medicalHistory={patientData.medicalHistory}
            onAnalyze={analyzeData}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="results">
          {analysisPackage && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Analysis Results</h2>
                <Button variant="outline" size="sm" disabled={isPinned} onClick={handlePinAnalysis} className="flex items-center gap-2">
                  <PinIcon className="h-4 w-4" />
                  {isPinned ? 'Pinned' : 'Pin this analysis'}
                </Button>
              </div>
              <ResultsSection results={analysisPackage.results} patientData={analysisPackage.patientData} />
              <Recommendations recommendations={analysisPackage.results.recommendations} />
              <div className="flex justify-center mt-8 space-x-4">
                <Button onClick={() => navigate('/history')} variant="outline">View Analysis History</Button>
                <Button onClick={() => { setActiveTab('info'); setAnalysisPackage(null); }} className="bg-cyan-600 hover:bg-cyan-700">Start New Analysis</Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;
