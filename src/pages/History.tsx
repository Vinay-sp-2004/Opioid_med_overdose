import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { toast } from "@/hooks/use-toast";
import { Pin, PinOff, AlertCircle } from "lucide-react";
import { Trash2 } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { useToast } from "@/components/ui/use-toast";

// Unified Analysis type (Option C)
interface Analysis {
  id: string;
  email: string;
  input_data: {
    currentMedications: { name: string; dosage?: string }[];
    age?: string | number;
    gender?: string;
    [key: string]: any;
  };
  result: {
    overallRisk?: number;          // 0–1
    totalMME?: number;             // numeric
    risk_probability?: number;     // 0–1 (fallback)
    daily_mme?: number;            // numeric (fallback)
    [key: string]: any;
  };
  pinned: boolean;
  summary?: string;
  created_at: {
    seconds: number;
  };
}

const History = () => {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<Analysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // ------------------------------
  // Fetch All Analyses
  // ------------------------------
  useEffect(() => {
    const fetchAnalyses = async () => {
      const userJson = localStorage.getItem("user");
      if (!userJson) {
        navigate("/login");
        return;
      }

      try {
        setIsLoading(true);
        const user = JSON.parse(userJson);

        const response = await axios.get(
          `http://localhost:8000/analysis/${encodeURIComponent(user.email)}`
        );

        if (response.data?.analyses) {
          const validAnalyses: Analysis[] = response.data.analyses.filter(
            (a: any) =>
              a &&
              a.result &&
              a.input_data &&
              a.created_at &&
              (typeof a.result.overallRisk === "number" ||
                typeof a.result.risk_probability === "number")
          );
          setAnalyses(validAnalyses);
        } else {
          setAnalyses([]);
        }
      } catch (error: any) {
        console.error("Fetch error:", error);
        toast({
          title: "Error",
          description:
            error.response?.data?.detail || "Failed to fetch analysis history",
          variant: "destructive",
        });
        setAnalyses([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalyses();
  }, [navigate]);

  // ------------------------------
  // Pin / Unpin Analysis
  // ------------------------------
  const handlePinToggle = async (analysisId: string, currentPinStatus: boolean) => {
    try {
      await axios.put(`http://localhost:8000/analysis/${analysisId}/pin`, {
        pinned: !currentPinStatus,
      });

      setAnalyses((prev) =>
        prev.map((a) =>
          a.id === analysisId ? { ...a, pinned: !currentPinStatus } : a
        )
      );

      if (selectedEntry && selectedEntry.id === analysisId) {
        setSelectedEntry({ ...selectedEntry, pinned: !currentPinStatus });
      }

      toast({
        title: "Success",
        description: `Analysis ${!currentPinStatus ? "pinned" : "unpinned"}.`,
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to update pin status.",
        variant: "destructive",
      });
    }
  };

  // ------------------------------
  // Risk Helpers (Option C – unified)
  // ------------------------------
  const getRiskValue = (analysis: Analysis | null): number => {
    if (!analysis || !analysis.result) return 0;
    const r = analysis.result.overallRisk;
    if (typeof r === "number") return r;
    const rp = analysis.result.risk_probability;
    if (typeof rp === "number") return rp;
    return 0;
  };

  const getRiskCategory = (risk: number) => {
    if (risk > 0.6) return "High";
    if (risk > 0.3) return "Moderate";
    return "Low";
  };

  const getRiskColor = (risk: number) => {
    if (risk > 0.6) return "bg-red-500";
    if (risk > 0.3) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getTotalMME = (analysis: Analysis | null): number | null => {
    if (!analysis || !analysis.result) return null;
    if (typeof analysis.result.totalMME === "number")
      return analysis.result.totalMME;
    if (typeof analysis.result.daily_mme === "number")
      return analysis.result.daily_mme;
    return null;
  };
  //-------------------------------
  //delete Analysis
  //-------------------------------
  const handleDelete = async (id: string) => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (!user.email) return;

      await axios.delete(`http://localhost:8000/analysis/${id}`);


      setAnalyses((prev) => prev.filter((a) => a.id !== id));

      // 🎉 SUCCESS TOAST — bottom right
      toast({
        title: "Delete Successful",
        description: "Successfully deleted the analysis record.",
        duration: 3000,
        variant: "default",
      });

      // Unselect if deleted item was opened
      if (selectedEntry?.id === id) {
        setSelectedEntry(null);
      }
    } catch (error) {
      console.error("Deletion failed:", error);

      toast({
        title: "Delete failed",
        description: "Something went wrong while deleting.",
        duration: 3000,
        variant: "destructive",
      });
    }
  };


  // ------------------------------
  // Selected Entry Chart Data
  // ------------------------------
  const selectedRiskValue = getRiskValue(selectedEntry);
  const chartData = [
    { name: "Safe", value: 100 - Math.round(selectedRiskValue * 100) },
    { name: "Risk", value: Math.round(selectedRiskValue * 100) },
  ];
  const COLORS = ["#4CAF50", "#FF5252"];

  // ------------------------------
  // Loading Screen
  // ------------------------------
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  // ------------------------------
  // Render UI
  // ------------------------------
  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl animate-fade-in">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-6">
        Analysis History
      </h1>

      {/* FLEX LAYOUT (Fixes Sticky Panel Behavior) */}
      <div className="flex gap-6">

        {/* LEFT SIDE TABLE — scrollable */}
        <div className="w-full md:w-2/3">
          <Card className="shadow-md max-h-[80vh] overflow-y-auto pr-2">
            <CardHeader>
              <CardTitle>Previous Analyses</CardTitle>
              <CardDescription>
                View and pin your previous medication risk assessments
              </CardDescription>
            </CardHeader>

            <CardContent>
              {analyses.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Medications</TableHead>
                      <TableHead>Risk</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {analyses.map((analysis) => {
                      const riskVal = getRiskValue(analysis);

                      return (
                        <TableRow
                          key={analysis.id}
                          onClick={() => setSelectedEntry(analysis)}
                          className="cursor-pointer"
                        >
                          <TableCell>
                            {new Date(
                              analysis.created_at.seconds * 1000
                            ).toLocaleDateString()}
                          </TableCell>

                          <TableCell>
                            {analysis.input_data.currentMedications?.map(
                              (med, index) => (
                                <Badge
                                  key={`${analysis.id}-${index}`}
                                  variant="outline"
                                  className="mr-1 mb-1"
                                >
                                  {med.name}
                                </Badge>
                              )
                            )}
                          </TableCell>

                          <TableCell>
                            <Badge className={getRiskColor(riskVal)}>
                              {getRiskCategory(riskVal)}
                            </Badge>
                          </TableCell>

                          {/* ACTION BUTTONS */}
                          <TableCell className="text-center flex items-center justify-center gap-2">

                            {/* VIEW */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEntry(analysis);
                              }}
                            >
                              View
                            </Button>

                            {/* PIN */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePinToggle(analysis.id, analysis.pinned);
                              }}
                            >
                              {analysis.pinned ? (
                                <PinOff className="h-4 w-4" />
                              ) : (
                                <Pin className="h-4 w-4" />
                              )}
                            </Button>

                            {/* DELETE — Trash-2 + popover */}
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500 hover:text-red-600" />
                                </Button>
                              </PopoverTrigger>

                              <PopoverContent
                                side="left"
                                align="center"
                                className="p-3 w-40 space-y-2"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <p className="text-xs text-gray-700 dark:text-gray-300">
                                  Delete this record?
                                </p>

                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-gray-600 dark:text-gray-300"
                                  >
                                    Cancel
                                  </Button>

                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleDelete(analysis.id)}
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>

                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium">No Analyses Found</h3>
                  <p className="mt-1 text-sm">
                    You have no saved analysis records.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT SIDE PANEL — always fixed */}
        <div className="w-full md:w-1/3 sticky top-24 h-fit">
          {selectedEntry ? (
            <Card className="shadow-md p-4">
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>Analysis Details</span>
                  <Badge className={getRiskColor(selectedRiskValue)}>
                    {getRiskCategory(selectedRiskValue)} Risk
                  </Badge>
                </CardTitle>

                <CardDescription>
                  {new Date(
                    selectedEntry.created_at.seconds * 1000
                  ).toLocaleString()}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">

                {/* PIE CHART */}
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {chartData.map((entry, i) => (
                          <Cell key={i} fill={COLORS[i]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* MED LIST */}
                <div>
                  <h3 className="text-sm font-medium mb-2">Medications</h3>
                  {selectedEntry.input_data.currentMedications?.map(
                    (med, index) => (
                      <div
                        key={index}
                        className="p-2 bg-gray-50 dark:bg-gray-800 rounded mb-1"
                      >
                        {med.name} ({med.dosage ?? "N/A"})
                      </div>
                    )
                  )}
                </div>

                {/* MME */}
                <div>
                  <h3 className="text-sm font-medium mb-2">Total Daily MME</h3>
                  <Badge variant="outline" className="text-lg">
                    {(() => {
                      const mme = getTotalMME(selectedEntry);
                      return mme !== null ? mme.toFixed(1) : "N/A";
                    })()}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-md flex items-center justify-center p-4 h-fit">
              <CardContent className="text-center text-gray-500 dark:text-gray-400">
                <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium">Select an Analysis</h3>
                <p className="mt-1 text-sm">
                  Click on a record to view its details here.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

      </div>
    </div>
  );

};

export default History;
