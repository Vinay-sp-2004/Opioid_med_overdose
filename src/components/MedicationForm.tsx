import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Trash } from 'lucide-react';
import { useState } from 'react';

interface LifestyleData {
  concurrent_benzos: boolean;
  concurrent_muscle_relaxants: boolean;
  concurrent_sleep_meds: boolean;
  concurrent_antidepressants: boolean;
  tobacco_use: boolean;
  previous_overdose: boolean;
  alcohol_use: string;
}

interface MedicationFormProps {
  currentMedications: any[];
  medicalHistory: string[];
  onMedicationChange: (medications: any[]) => void;
  onMedicalHistoryChange: (conditions: string[]) => void;
  onAnalyze: () => void;
  isLoading: boolean;
  lifestyleData: LifestyleData;
  onLifestyleChange: (field: string, value: boolean | string) => void;
}

const opioidMedications = [
  { name: 'Codeine', potency: 'low' },
  { name: 'Fentanyl', potency: 'very high' },
  { name: 'Hydrocodone', potency: 'moderate' },
  { name: 'Morphine', potency: 'high' },
  { name: 'Oxycodone', potency: 'high' },
  { name: 'Tramadol', potency: 'low' },
];

export const MedicationForm = ({
  currentMedications,
  medicalHistory,
  onMedicationChange,
  onMedicalHistoryChange,
  onAnalyze,
  isLoading,
  lifestyleData,
  onLifestyleChange,
}: MedicationFormProps) => {
  const [newMed, setNewMed] = useState({
    name: '',
    dosage: '',
    frequency: '',
    duration: '',
  });

  const [newCondition, setNewCondition] = useState('');

  const commonConditions = [
    'Chronic Pain',
    'Mental Health Disorders',
    'Substance Abuse History',
    'Liver Disease',
    'Kidney Disease',
    'Respiratory Disease',
    'Acute Pain',
  ];

  const alcoholOptions = [
    { label: 'Heavy', value: 'Heavy' },
    { label: 'Light', value: 'Light' },
    { label: 'Moderate', value: 'Moderate' },
    { label: 'No', value: 'None' },
  ];

  const handleAddMedication = () => {
    if (!newMed.name || !newMed.dosage || !newMed.frequency) return;

    const selectedMed = opioidMedications.find(m => m.name === newMed.name);

    const updatedMeds = [
      ...currentMedications,
      {
        ...newMed,
        id: Date.now(),
        potency: selectedMed?.potency || 'unknown',
      },
    ];
    onMedicationChange(updatedMeds);
    setNewMed({ name: '', dosage: '', frequency: '', duration: '' });
  };

  const handleRemoveMedication = (id: number) => {
    const updatedMeds = currentMedications.filter(med => med.id !== id);
    onMedicationChange(updatedMeds);
  };

  const handleAddCondition = (condition: string) => {
    if (!condition || medicalHistory.includes(condition)) return;
    onMedicalHistoryChange([...medicalHistory, condition]);
    setNewCondition('');
  };

  const handleRemoveCondition = (condition: string) => {
    onMedicalHistoryChange(medicalHistory.filter(c => c !== condition));
  };

  const isDuplicateMed =
    !!newMed.name && currentMedications.some(med => med.name === newMed.name);

  const addMedDisabled =
    !newMed.name || !newMed.dosage || !newMed.frequency || isDuplicateMed;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Current Medications Section */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Current Opioid Medications</CardTitle>
          <CardDescription>
            Add all opioid medications the patient is currently taking.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Medication Dropdown */}
            <div className="space-y-2">
              <label htmlFor="med-name" className="text-sm font-medium">
                Medication Name
              </label>
              <Select
                value={newMed.name}
                onValueChange={value => setNewMed(prev => ({ ...prev, name: value }))}
              >
                <SelectTrigger id="med-name">
                  <SelectValue placeholder="Select opioid" />
                </SelectTrigger>
                <SelectContent>
                  {opioidMedications.map(med => (
                    <SelectItem key={med.name} value={med.name}>
                      {med.name}{' '}
                      <span className="text-xs text-gray-500">({med.potency} potency)</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Dosage */}
            <div className="space-y-2">
              <label htmlFor="med-dosage" className="text-sm font-medium">
                Dosage (mg)
              </label>
              <Input
                id="med-dosage"
                value={newMed.dosage}
                onChange={e => setNewMed(prev => ({ ...prev, dosage: e.target.value }))}
                placeholder="e.g. 10"
              />
            </div>

            {/* Frequency */}
            <div className="space-y-2">
              <label htmlFor="med-frequency" className="text-sm font-medium">
                Frequency
              </label>
              <Select
                value={newMed.frequency}
                onValueChange={value => setNewMed(prev => ({ ...prev, frequency: value }))}
              >
                <SelectTrigger id="med-frequency">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">Once daily</SelectItem>
                  <SelectItem value="twice">Twice daily</SelectItem>
                  <SelectItem value="three">Three times daily</SelectItem>
                  <SelectItem value="four">Four times daily</SelectItem>
                  <SelectItem value="asneeded">As needed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <label htmlFor="med-duration" className="text-sm font-medium">
                Duration
              </label>
              <Input
                id="med-duration"
                value={newMed.duration}
                onChange={e => setNewMed(prev => ({ ...prev, duration: e.target.value }))}
                placeholder="e.g. 7 days"
              />
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleAddMedication}
            disabled={addMedDisabled}
            className="flex items-center"
          >
            <Plus className="h-4 w-4 mr-1" /> Add Medication
          </Button>

          {/* Added Medications List */}
          {currentMedications.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Added Medications</h4>
              <div className="bg-gray-50 dark:bg-gray-900/40 p-3 rounded-md space-y-2">
                {currentMedications.map(med => (
                  <div
                    key={med.id}
                    className="flex items-center justify-between mb-1 p-2 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700"
                  >
                    <div className="space-y-0.5">
                      <span className="font-medium">{med.name}</span>
                      {med.potency && (
                        <Badge
                          className={`ml-2 ${med.potency === 'high' || med.potency === 'very high'
                              ? 'bg-red-500'
                              : med.potency === 'moderate'
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                            }`}
                        >
                          {med.potency} potency
                        </Badge>
                      )}
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {med.dosage},{' '}
                        {med.frequency === 'once'
                          ? 'Once daily'
                          : med.frequency === 'twice'
                            ? 'Twice daily'
                            : med.frequency === 'three'
                              ? 'Three times daily'
                              : med.frequency === 'four'
                                ? 'Four times daily'
                                : 'As needed'}
                        {med.duration && `, ${med.duration}`}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMedication(med.id)}
                      className="h-8 w-8 p-0"
                    >
                      <Trash className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Health & Lifestyle Section */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Health & Lifestyle</CardTitle>
          <CardDescription>Select applicable conditions and habits.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: 'Concurrent Benzodiazepines', field: 'concurrent_benzos' },
              { label: 'Concurrent Muscle Relaxants', field: 'concurrent_muscle_relaxants' },
              { label: 'Concurrent Sleep Medications', field: 'concurrent_sleep_meds' },
              { label: 'Concurrent Antidepressants', field: 'concurrent_antidepressants' },
              { label: 'Tobacco Use', field: 'tobacco_use' },
              { label: 'Previous Overdose History', field: 'previous_overdose' },
            ].map(({ label, field }) => (
              <div
                key={field}
                className="flex items-center justify-between border p-2 rounded-md bg-gray-50 dark:bg-gray-900/40"
              >
                <span className="text-sm font-medium">{label}</span>
                <input
                  type="checkbox"
                  checked={(lifestyleData as any)[field]}
                  onChange={e => onLifestyleChange(field, e.target.checked)}
                  className="w-5 h-5 accent-cyan-600"
                />
              </div>
            ))}

            {/* Alcohol Use Dropdown */}
            <div className="space-y-2">
              <label htmlFor="alcohol" className="text-sm font-medium">
                Alcohol Use
              </label>
              <Select
                value={lifestyleData.alcohol_use}
                onValueChange={value => onLifestyleChange('alcohol_use', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select alcohol use type" />
                </SelectTrigger>
                <SelectContent>
                  {alcoholOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Medical History Section */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Medical History</CardTitle>
          <CardDescription>Select existing medical conditions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2 mb-4">
            {commonConditions.map(condition => (
              <Badge
                key={condition}
                variant={medicalHistory.includes(condition) ? 'default' : 'outline'}
                className={`cursor-pointer ${medicalHistory.includes(condition) ? 'bg-cyan-600 text-white' : ''
                  }`}
                onClick={() =>
                  medicalHistory.includes(condition)
                    ? handleRemoveCondition(condition)
                    : handleAddCondition(condition)
                }
              >
                {condition}
                {medicalHistory.includes(condition) && <X className="h-3 w-3 ml-1" />}
              </Badge>
            ))}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button onClick={onAnalyze} disabled={currentMedications.length === 0 || isLoading}>
            {isLoading ? 'Analyzing...' : 'Analyze Risk'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
