import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, AlertCircle, TrendingUp, TrendingDown } from "lucide-react";

interface ResultsSectionProps {
  results: any;
  patientData: any;
}

export const ResultsSection = ({ results, patientData }: ResultsSectionProps) => {

  // SAFE risk access
  // SAFE risk extraction
  let riskProbability = 0;

  if (Array.isArray(results?.risk_probability)) {
    riskProbability = results?.risk_probability?.[0]?.[1] ?? 0;
  } else {
    riskProbability = results?.risk_probability ?? 0;
  }

  const riskPercentage = riskProbability * 100;


  let riskCategory = "Low";
  let riskColor = "bg-green-500";

  if (riskProbability > 0.6) {
    riskCategory = "High";
    riskColor = "bg-red-500";
  } else if (riskProbability > 0.3) {
    riskCategory = "Moderate";
    riskColor = "bg-yellow-500";
  }

  // MME CALCULATOR
  const mme_factors: { [key: string]: number } = {
    "Morphine": 1.0,
    "Hydrocodone": 1.0,
    "Oxycodone": 1.5,
    "Hydromorphone": 4.0,
    "Fentanyl": 100.0,
    "Codeine": 0.15,
    "Tramadol": 0.1,
  };

  const meds = patientData?.currentMedications ?? [];

  const medicationMMEData = meds.map((med: any) => {
    const factor = mme_factors[med.name] || 1.0;
    const dose = parseFloat(med.dosage || "0");

    let times = 1;
    if (med.frequency === "twice") times = 2;
    if (med.frequency === "thrice") times = 3;

    return {
      name: med.name,
      mme: dose * factor * times,
    };
  });

  const dailyMME = medicationMMEData.reduce((sum, m) => sum + m.mme, 0);

  const medicineImpact = medicationMMEData.map(m => ({
    name: m.name,
    value: dailyMME > 0 ? (m.mme / dailyMME) * 100 : 0,
  }));

  // PIE CHART
  const pieChartData = [
    { name: "Safe", value: 100 - riskPercentage },
    { name: "Risk", value: riskPercentage },
  ];

  const PIE_COLORS = ["#4CAF50", "#F44336"];

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="shadow-lg border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Opioid Overdose Risk Analysis</span>
            <Badge className={`${riskColor} text-white text-lg px-4 py-2`}>
              {riskPercentage.toFixed(0)}% Risk
            </Badge>
          </CardTitle>
          <CardDescription>
            Generated using patient medical and medication data.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

            {/* LEFT COLUMN */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-800">Overall Risk Assessment</h3>

              <div>
                <div className="flex justify-between mb-1 text-gray-700">
                  <span className="font-medium">Calculated Overdose Risk</span>
                  <span className="font-bold text-lg">{riskPercentage.toFixed(2)}%</span>
                </div>
                <Progress value={riskPercentage} className="h-3" />
              </div>

              <div>
                <div className="flex justify-between mb-1 text-gray-700">
                  <span className="font-medium">Daily MME</span>
                  <span className="font-bold text-lg">{dailyMME.toFixed(2)}</span>
                </div>

                <div className={`text-sm flex items-center ${dailyMME > 50 ? "text-red-600" : "text-green-600"}`}>
                  {dailyMME > 50 ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                  {dailyMME > 90
                    ? "High MME — clinical caution required"
                    : dailyMME > 50
                      ? "Moderate MME — elevated risk"
                      : "Low MME — within recommended limits"}
                </div>
              </div>

              <Alert variant={riskCategory === "High" ? "destructive" : "default"}>
                {riskCategory === "High" ? <AlertCircle className="h-4 w-4" /> : <Info className="h-4 w-4" />}
                <AlertTitle>Risk Interpretation</AlertTitle>
                <AlertDescription>
                  {riskCategory === "Low" && "Risk level is within safe range."}
                  {riskCategory === "Moderate" && "Monitor dosage and symptoms closely."}
                  {riskCategory === "High" && "Seek medical review immediately."}
                </AlertDescription>
              </Alert>
            </div>

            {/* RIGHT COLUMN - PIE CHART */}
            <div className="flex flex-col items-center justify-center h-80">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Risk Contribution</h3>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={110}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieChartData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={v => `${Number(v).toFixed(2)}%`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* MEDICATION CONTRIBUTION */}
          <div>
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Medication MME Contribution</h3>

            {medicineImpact.length > 0 ? (
              <div className="h-64 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={medicineImpact} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis dataKey="name" type="category" width={150} />
                    <Tooltip formatter={v => [`${Number(v).toFixed(2)}%`, "Contribution"]} />
                    <Bar dataKey="value" fill="#FFC658" barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center text-gray-500 p-4 bg-gray-50 rounded-lg">
                No opioid medications provided.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
