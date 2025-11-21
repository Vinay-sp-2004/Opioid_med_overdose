
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, AlertCircle } from "lucide-react";

interface ResultsSectionProps {
  results: any;
  patientData: any;
}

export const ResultsSection = ({ results, patientData }: ResultsSectionProps) => {
  const prediction = results.prediction[0];
  const riskProbability = results.risk_probability[0][1]; // Probability of high risk

  const riskLevel = riskProbability;
  let riskCategory = "Low";
  let riskColor = "bg-green-500";
  
  if (riskLevel > 0.6) {
    riskCategory = "High";
    riskColor = "bg-red-500";
  } else if (riskLevel > 0.3) {
    riskCategory = "Moderate";
    riskColor = "bg-yellow-500";
  }
  
  // Prepare data for the bar chart
  const medicationRiskData = patientData.currentMedications.map((med: any) => ({
    name: med.name,
    risk: (riskLevel * 100 * (Math.random() * 0.5 + 0.5)).toFixed(2) // Dummy data for now
  }));
  
  // Prepare data for the pie chart
  const conditionData = [
    { name: "Safe", value: 100 - parseFloat((riskLevel * 100).toFixed(2)) },
    { name: "Risk", value: parseFloat((riskLevel * 100).toFixed(2)) },
  ];
  
  const COLORS = ["#4CAF50", "#FFA726"];
  
  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Opioid Overdose Risk Analysis
            <Badge className={`${riskColor} text-white`}>{riskCategory} Risk</Badge>
          </CardTitle>
          <CardDescription>
            Analysis based on patient information and current opioid medications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-1/2">
              <h3 className="text-lg font-medium mb-4">Overall Risk Assessment</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">Overdose Risk</span>
                    <span className="text-sm font-medium">{(riskLevel * 100).toFixed(2)}%</span>
                  </div>
                  <Progress value={riskLevel * 100} className="h-2" />
                </div>
                
                <Alert variant={riskCategory === "High" ? "destructive" : "default"}>
                  {riskCategory === "High" ? <AlertCircle className="h-4 w-4" /> : <Info className="h-4 w-4" />}
                  <AlertTitle>Risk Interpretation</AlertTitle>
                  <AlertDescription>
                    {riskCategory === "Low" && "Current medication regimen appears to have manageable risk. Continue as directed and monitor for any side effects."}
                    {riskCategory === "Moderate" && "Some potential for adverse effects. Follow dosing schedule carefully and be aware of warning signs of overdose."}
                    {riskCategory === "High" && "Significant risk of adverse effects or overdose. Consult healthcare provider immediately about safer pain management options."}
                  </AlertDescription>
                </Alert>
              </div>
            </div>
            
            <div className="w-full md:w-1/2 h-64">
              <h3 className="text-lg font-medium mb-4">Risk Distribution</h3>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={conditionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(2)}%`}
                  >
                    {conditionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-4">Medication-Specific Risks</h3>
            <div className="h-64 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={medicationRiskData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis dataKey="name" type="category" width={120} />
                  <Tooltip formatter={(value) => [`${value}%`, 'Risk Level']} />
                  <Bar dataKey="risk" fill="#33C3F0" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="pt-2">
            <h3 className="text-lg font-medium mb-2">Signs to Monitor</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="font-medium">Respiratory Rate</div>
                <Badge className={riskCategory === "Low" ? "bg-green-500" : "bg-yellow-500"}>
                  {riskCategory === "Low" ? "Normal" : "Monitor"}
                </Badge>
                <p className="text-xs text-gray-600 mt-1">Slow or irregular breathing is a warning sign</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="font-medium">Consciousness Level</div>
                <Badge className={riskCategory === "Low" ? "bg-green-500" : "bg-yellow-500"}>
                  {riskCategory === "Low" ? "Normal" : "Monitor Closely"}
                </Badge>
                <p className="text-xs text-gray-600 mt-1">Excessive drowsiness requires attention</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="font-medium">Oxygen Saturation</div>
                <Badge className={riskCategory === "Low" ? "bg-green-500" : "bg-yellow-500"}>
                {riskCategory === "Low" ? "Normal" : "Monitor"}
                </Badge>
                <p className="text-xs text-gray-600 mt-1">Low oxygen levels are dangerous</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
