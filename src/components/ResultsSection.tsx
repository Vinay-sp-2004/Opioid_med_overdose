import React, { useMemo, useState } from "react";
import axios from "axios";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Info,
  ShieldCheck,
  ArrowLeft,
  Save,
  ClipboardList,
  Stethoscope,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { toast } from "@/hooks/use-toast";

interface ResultsSectionProps {
  results: any;
  patientData: any;
  onBack?: () => void;
  onStartNewAnalysis?: () => void;
}

const PIE_COLORS = ["#22c55e", "#f97373"]; // Safe (green), Risk (red)

export const ResultsSection: React.FC<ResultsSectionProps> = ({
  results,
  patientData,
  onBack,
  onStartNewAnalysis,
}) => {
  const [saving, setSaving] = useState(false);

  // --- Core numbers ---------------------------------------------------------
  const rawRisk: number =
    typeof results?.risk_probability === "number"
      ? results.risk_probability
      : 0;

  const riskPercentage = Math.min(100, Math.max(0, rawRisk * 100));

  const dailyMME: number =
    typeof results?.daily_mme === "number"
      ? results.daily_mme
      : typeof patientData?.daily_mme === "number"
        ? patientData.daily_mme
        : 0;

  // --- Risk category + colours ---------------------------------------------
  const riskCategory: "Low" | "Moderate" | "High" = useMemo(() => {
    if (riskPercentage > 60) return "High";
    if (riskPercentage > 30) return "Moderate";
    return "Low";
  }, [riskPercentage]);

  const riskColor =
    riskCategory === "High"
      ? "bg-red-500"
      : riskCategory === "Moderate"
        ? "bg-amber-500"
        : "bg-emerald-500";

  const pieChartData = [
    {
      name: "Safe",
      value: Math.max(0, Math.min(100, 100 - riskPercentage)),
    },
    {
      name: "Risk",
      value: Math.max(0, Math.min(100, riskPercentage)),
    },
  ];

  // --- Medication MME contribution -----------------------------------------
  const medicineImpact = useMemo(() => {
    const meds: any[] = Array.isArray(patientData?.currentMedications)
      ? patientData.currentMedications
      : [];

    if (!meds.length) return [];

    // Same MME factors used everywhere in the app
    const MME_FACTORS: Record<string, number> = {
      Morphine: 1.0,
      Hydrocodone: 1.0,
      Oxycodone: 1.5,
      Hydromorphone: 4.0,
      Fentanyl: 100.0,
      Codeine: 0.15,
      Tramadol: 0.1,
    };

    // First compute per-med MME (fallback if m.mme isn’t present)
    const perMed = meds.map((m) => {
      const name = m.name || "Medication";
      const factor = MME_FACTORS[name] ?? 1.0;

      const doseMg = parseFloat(m.dosage ?? "0");
      let times = 1;
      if (m.frequency === "twice") times = 2;
      else if (m.frequency === "thrice") times = 3;
      else if (m.frequency === "asneeded") times = 1; // conservative

      // If backend ever sends m.mme, prefer it; otherwise compute here
      const medMME =
        m.mme != null && !Number.isNaN(Number(m.mme))
          ? Number(m.mme)
          : doseMg * factor * times;

      return { name, mme: medMME };
    });

    // Use backend dailyMME if present, else sum from perMed
    const total =
      dailyMME && dailyMME > 0
        ? dailyMME
        : perMed.reduce((sum, m) => sum + (m.mme || 0), 0);

    if (!total) return [];

    return perMed.map((m) => ({
      name: m.name,
      value: Number(((m.mme / total) * 100).toFixed(2)),
    }));
  }, [patientData, dailyMME]);

  // --- Monitoring severity --------------------------------------------------
  const monitorSeverity =
    riskCategory === "High"
      ? "high"
      : riskCategory === "Moderate"
        ? "moderate"
        : "low";

  const monitorBadgeClasses =
    monitorSeverity === "high"
      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
      : monitorSeverity === "moderate"
        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";

  const monitorTextPrefix =
    monitorSeverity === "high"
      ? "Close Monitoring"
      : monitorSeverity === "moderate"
        ? "Regular Monitoring"
        : "Routine Monitoring";

  const signsToMonitor = [
    {
      title: "Respiratory Rate",
      description:
        monitorSeverity === "high"
          ? "Watch for slow, shallow, or irregular breathing. Seek emergency care if breathing is severely reduced."
          : monitorSeverity === "moderate"
            ? "Check for changes in breathing pattern, snoring, or pauses in breathing during sleep."
            : "Ensure breathing remains steady and comfortable during rest and sleep.",
    },
    {
      title: "Consciousness Level",
      description:
        monitorSeverity === "high"
          ? "Excessive drowsiness, confusion, or unresponsiveness may indicate overdose. Treat as an emergency."
          : monitorSeverity === "moderate"
            ? "Look for increasing sleepiness, difficulty staying awake, or slurred speech."
            : "Monitor usual alertness and avoid combining opioids with alcohol or sedatives.",
    },
    {
      title: "Oxygen Saturation & Colour",
      description:
        monitorSeverity === "high"
          ? "Bluish lips or fingertips, or very low oxygen saturations, require immediate emergency care."
          : monitorSeverity === "moderate"
            ? "If available, use a pulse oximeter and watch for drops in oxygen saturation."
            : "Be aware of any unusual shortness of breath on exertion or at rest.",
    },
  ];

  const tipsList = [
    "Never change your opioid dose without medical advice.",
    "Avoid combining opioids with alcohol, sedatives, or sleep medicines unless specifically instructed.",
    "Store opioids safely and away from children or others at risk.",
    "Do not share your prescription medicines with anyone else.",
    "If you feel unusually drowsy, dizzy, or breathless, seek urgent medical help.",
    "Always follow follow-up appointments and review your regimen regularly.",
  ];

  const recommendationsList = [
    "Use the lowest effective opioid dose and reassess regularly.",
    "Avoid rapid dose escalations, especially when risk factors are present.",
    "Take extra care when opioids are combined with benzodiazepines or other sedatives.",
    "Educate patients and families about overdose signs and when to seek emergency help.",
    "Consider non-opioid and non-pharmacological options for chronic pain where possible.",
  ];

  // --- Save & Start New handlers -------------------------------------------
  const handleSaveAnalysis = async () => {
    if (saving) return;

    try {
      const userJson = localStorage.getItem("user");
      if (!userJson) {
        toast({
          title: "Not logged in",
          description: "Please log in before saving an analysis.",
          variant: "destructive",
        });
        return;
      }

      const user = JSON.parse(userJson);
      const email = user?.email;

      if (!email) {
        toast({
          title: "Missing email",
          description: "Unable to detect user email for saving analysis.",
          variant: "destructive",
        });
        return;
      }

      const simplifiedMeds = Array.isArray(patientData?.currentMedications)
        ? patientData.currentMedications.map((m: any) => ({
          name: m.name,
          dosage: m.dosage,
        }))
        : [];

      const payload = {
        email,
        input_data: {
          ...patientData,
          currentMedications: simplifiedMeds,
          age:
            patientData?.age !== undefined
              ? String(patientData.age)
              : "",
          gender: patientData?.gender ?? "",
        },
        result: {
          risk_probability: rawRisk,
          overallRisk: rawRisk,
          totalMME: dailyMME,
          daily_mme: dailyMME,
        },
        pinned: false,
        summary: `${riskCategory} risk — ${dailyMME.toFixed(2)} MME/day`,
      };

      setSaving(true);
      await axios.post("http://localhost:8000/analysis", payload);

      toast({
        title: "Analysis saved",
        description: "This analysis is now available in your history.",
      });
    } catch (error: any) {
      console.error("Error saving analysis:", error);
      toast({
        title: "Save failed",
        description:
          error?.response?.data?.detail ??
          "Could not save this analysis. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleStartNewAnalysis = () => {
    if (onStartNewAnalysis) {
      onStartNewAnalysis();
    }
  };

  // -------------------------------------------------------------------------
  return (
    <div className="space-y-6 animate-fade-in">
      {/* CARD 1: Risk & Medication Analysis */}
      <Card className="shadow-lg border-gray-200 dark:border-gray-800">
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-3">
            {onBack && (
              <Button
                variant="ghost"
                size="icon"
                className="mt-1 mr-1"
                onClick={onBack}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <CardTitle className="flex flex-wrap items-center gap-3">
                <span>Opioid Overdose Risk Analysis</span>
                <Badge
                  className={`${riskColor} text-white text-sm px-3 py-1`}
                >
                  {riskPercentage.toFixed(2)}% Risk
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveAnalysis}
                  disabled={saving}
                  className="flex items-center gap-2 border-cyan-500 text-cyan-600 dark:text-cyan-300 dark:border-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/30"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Saving..." : "Save"}
                </Button>
              </CardTitle>
              <CardDescription className="mt-2">
                Analysis generated using the patient&apos;s medical profile,
                lifestyle factors, and current opioid regimen.
              </CardDescription>
            </div>
          </div>

          <div className="flex flex-col items-end space-y-1">
            <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Activity className="h-4 w-4" />
              Model output (probability)
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              0 = lowest risk, 1 = highest risk
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* Top grid: Left = risk summary, Right = risk pie */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* LEFT: overall risk + MME + alert */}
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">
                  Overall Risk Assessment
                </h3>
                <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 p-4 space-y-4">
                  <div>
                    <div className="flex justify-between mb-1 text-gray-700 dark:text-gray-200">
                      <span className="font-medium">
                        Predicted Overdose Risk
                      </span>
                      <span className="font-bold text-lg">
                        {riskPercentage.toFixed(2)}%
                      </span>
                    </div>
                    <Progress value={riskPercentage} className="h-3" />
                  </div>

                  <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex justify-between mb-1 text-gray-700 dark:text-gray-200">
                      <span className="font-medium">
                        Daily MME (Morphine Milligram Equivalent)
                      </span>
                      <span className="font-bold text-lg">
                        {dailyMME.toFixed(2)}
                      </span>
                    </div>
                    <div
                      className={`text-sm flex items-center ${dailyMME > 90
                        ? "text-red-600 dark:text-red-400"
                        : dailyMME > 50
                          ? "text-orange-600 dark:text-orange-400"
                          : "text-green-600 dark:text-green-400"
                        }`}
                    >
                      {dailyMME > 50 ? (
                        <TrendingUp className="h-4 w-4 mr-1" />
                      ) : (
                        <TrendingDown className="h-4 w-4 mr-1" />
                      )}
                      {dailyMME > 90
                        ? "High MME — clinical caution required. Doses above 90 MME/day carry increased risk."
                        : dailyMME > 50
                          ? "Moderate MME — elevated risk; review with a clinician."
                          : "Low MME — within commonly referenced safety thresholds. Continue to monitor clinically."}
                    </div>
                  </div>
                </div>
              </div>

              <Alert
                variant={riskCategory === "High" ? "destructive" : "default"}
              >
                {riskCategory === "High" ? (
                  <AlertCircle className="h-4 w-4" />
                ) : (
                  <Info className="h-4 w-4" />
                )}
                <AlertTitle>Risk Interpretation</AlertTitle>
                <AlertDescription>
                  {riskCategory === "Low" &&
                    "Current risk appears relatively low based on the model. Continue to monitor and follow prescribed instructions strictly."}
                  {riskCategory === "Moderate" &&
                    "There is a moderate level of risk. Review dose, monitor symptoms, and consider closer follow-up."}
                  {riskCategory === "High" &&
                    "This profile suggests high overdose risk. Urgent clinical review and possible regimen change are advised."}
                </AlertDescription>
              </Alert>
            </div>

            {/* RIGHT: risk balance pie */}
            <div className="flex flex-col items-center justify-center lg:h-80">
              <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-4">
                Risk Balance
              </h3>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    dataKey="value"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {pieChartData.map((entry, i) => (
                      <Cell key={i} fill={PIE_COLORS[i]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(v) => `${Number(v).toFixed(2)}%`}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Medication-specific bar chart */}
          <div>
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-3">
              Medication-Specific Risks
            </h3>
            <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 p-4">
              {medicineImpact.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={medicineImpact} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={140}
                      />
                      <RechartsTooltip
                        formatter={(v) => [
                          `${Number(v).toFixed(2)}%`,
                          "Contribution to daily MME",
                        ]}
                      />
                      <Bar dataKey="value" barSize={50} fill="#38BDF8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400 py-6">
                  No opioid medications were provided for this analysis.
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CARD 2: Clinical Monitoring (Signs to Monitor) */}
      <Card className="shadow-md border-gray-200 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-cyan-600 dark:text-cyan-300" />
            <span>Clinical Monitoring</span>
          </CardTitle>
          <CardDescription>
            Key clinical signs to monitor while the patient is on opioid
            therapy.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {signsToMonitor.map((sign) => (
              <div
                key={sign.title}
                className="border rounded-xl p-4 bg-gray-50 dark:bg-gray-900 flex flex-col gap-2 justify-between shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-800 dark:text-gray-100">
                    {sign.title}
                  </span>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${monitorBadgeClasses}`}
                  >
                    {monitorTextPrefix}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  {sign.description}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* CARD 3: Safety Guidance (Tips + Recommendations) */}
      <Card className="shadow-md border-gray-200 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
            <span>Safety Guidance</span>
          </CardTitle>
          <CardDescription>
            General opioid safety tips and practice-based recommendations. These
            do not replace a clinician&apos;s judgment.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Practical Safety Tips */}
            <div className="rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/70 dark:bg-slate-900/60 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="h-4 w-4 text-blue-700 dark:text-blue-300" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Practical Safety Tips
                </h3>
              </div>
              <ul className="list-disc list-inside space-y-1.5 text-sm text-gray-700 dark:text-gray-200">
                {tipsList.map((tip, idx) => (
                  <li key={idx}>{tip}</li>
                ))}
              </ul>
            </div>

            {/* Opioid Safety Recommendations */}
            <div className="rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/70 dark:bg-slate-900/60 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <ClipboardList className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Opioid Safety Recommendations
                </h3>
              </div>
              <ul className="list-disc list-inside space-y-1.5 text-sm text-gray-700 dark:text-gray-200">
                {recommendationsList.map((rec, idx) => (
                  <li key={idx}>{rec}</li>
                ))}
              </ul>
            </div>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Model output is probabilistic and does not replace clinical
            judgment. Always confirm with a licensed healthcare professional.
          </p>
        </CardContent>
      </Card>

      {/* Bottom actions: back + start new */}
      {/* <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Use this tool as a decision-support aid only. Final clinical decisions
          must be made by qualified healthcare professionals.
        </div>
        <div className="flex gap-3">
          {onBack && (
            <Button variant="outline" onClick={onBack}>
              Back to Form
            </Button>
          )}
          <Button onClick={handleStartNewAnalysis}>Start New Analysis</Button>
        </div>
      </div> */}
    </div>
  );
};

export default ResultsSection;
