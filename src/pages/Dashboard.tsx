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
  const [riskResults, setRiskResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const navigate = useNavigate();

  // Load profile and check login
  useEffect(() => {
    const userJson = localStorage.getItem('user');
    if (!userJson) {
      navigate('/login');
      return;
    }
    const user = JSON.parse(userJson);

    const savedProfileKey = `userProfile_${user.email}`;
    const savedProfile = localStorage.getItem(savedProfileKey);
    if (savedProfile) {
      const profile = JSON.parse(savedProfile);
      setPatientData(prev => ({
        ...prev,
        age: profile.age ?? prev.age,
        gender: profile.gender ?? prev.gender,
      }));
    }

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
    setPatientData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleMedicationChange = (medications: any[]) => {
    setPatientData(prev => ({
      ...prev,
      currentMedications: medications,
    }));
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
      const primaryOpioidCombined = patientData.currentMedications
        .map(med => med.name)
        .join("|");

      const payload = {
        ...patientData,
        primary_opioid: primaryOpioidCombined,
        weight_kg: Number(patientData.weight),
        height_cm: Number(patientData.height),
        daily_dosage_mg: Number(patientData.daily_dosage_mg || 0),
        daily_mme: Number(patientData.daily_mme || 0),
        risk_factors_count: Number(patientData.risk_factors_count || 0),
        treatment_duration_months: Number(patientData.treatment_duration_months || 0),
        alcohol_use: patientData.alcohol_use || 'None',
      };

      const response = await axios.post("http://localhost:8000/predict", payload);
      const result = response.data.prediction;

      setRiskResults(result);
      setActiveTab('results');
      setIsPinned(false);

      toast({
        title: 'Analysis Complete',
        description: 'Your opioid medication risk assessment is ready.',
      });
    } catch (err) {
      toast({
        title: 'Analysis Failed',
        description: 'An error occurred while analyzing. Try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinAnalysis = () => {
    if (!riskResults) return;

    const pinnedAnalyses = JSON.parse(localStorage.getItem('pinnedAnalyses') || '[]');
    const pinnedEntry = {
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      medications: patientData.currentMedications,
      riskLevel: riskResults.overallRisk,
      riskCategory: riskResults.overallRisk > 0.6 ? 'High' : riskResults.overallRisk > 0.3 ? 'Moderate' : 'Low',
    };
    localStorage.setItem('pinnedAnalyses', JSON.stringify([pinnedEntry, ...pinnedAnalyses]));
    setIsPinned(true);
    toast({
      title: 'Analysis Pinned',
      description: 'Pinned to your saved results.',
    });
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
            <p className="font-medium text-yellow-700 dark:text-yellow-500">
              Important Safety Information
            </p>
            <p className="text-yellow-600 dark:text-yellow-400">
              Opioid medications carry significant risks including dependence, addiction, and overdose.
              This tool helps assess risk but does not replace professional medical advice.
            </p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="info">Patient Information</TabsTrigger>
          <TabsTrigger value="medications">Medications</TabsTrigger>
          <TabsTrigger value="results" disabled={!riskResults}>
            Results
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-6">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Patient Details</CardTitle>
              <CardDescription>Enter basic patient details for accurate analysis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="age" className="text-sm font-medium">Age (years)</label>
                  <Input
                    id="age"
                    type="number"
                    value={patientData.age}
                    onChange={(e) => handleInputChange('age', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="gender" className="text-sm font-medium">Gender</label>
                  <Select
                    value={patientData.gender}
                    onValueChange={(value) => handleInputChange('gender', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="weight" className="text-sm font-medium">Weight (kg)</label>
                  <Input
                    id="weight"
                    type="number"
                    value={patientData.weight}
                    onChange={(e) => handleInputChange('weight', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="height" className="text-sm font-medium">Height (cm)</label>
                  <Input
                    id="height"
                    type="number"
                    value={patientData.height}
                    onChange={(e) => handleInputChange('height', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex justify-end">
              <Button onClick={() => setActiveTab('medications')} className="bg-cyan-600 hover:bg-cyan-700">
                Continue to Medications
              </Button>
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
          {riskResults && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                  Analysis Results
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPinned}
                  onClick={handlePinAnalysis}
                  className="flex items-center gap-2"
                >
                  <PinIcon className="h-4 w-4" />
                  {isPinned ? 'Pinned' : 'Pin this analysis'}
                </Button>
              </div>

              <ResultsSection results={riskResults} patientData={patientData} />
              <Recommendations recommendations={riskResults.recommendations} />

              <div className="flex justify-center mt-8">
                <Button onClick={() => navigate('/history')} variant="outline" className="mr-4">
                  View Analysis History
                </Button>
                <Button
                  onClick={() => {
                    setActiveTab('info');
                    setRiskResults(null);
                    setPatientData({
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
                  }}
                  className="bg-cyan-600 hover:bg-cyan-700"
                >
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
