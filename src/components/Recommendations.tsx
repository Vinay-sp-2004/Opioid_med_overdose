import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, AlertCircle, Info, Phone } from "lucide-react";

interface RecommendationsProps {
  recommendations?: string[];
}

export const Recommendations = ({ recommendations = [] }: RecommendationsProps) => {
  return (
    <Card className="shadow-md animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Info className="h-5 w-5 mr-2 text-medical-600" />
          Opioid Safety Recommendations
        </CardTitle>
        <CardDescription>
          Based on your medication profile, we recommend the following safety measures
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendations.map((rec, index) => (
              <div
                key={index}
                className="flex items-start p-4 rounded-md bg-medical-100/50 card-hover"
              >
                <CheckCircle className="h-5 w-5 text-medical-600 mr-3 mt-0.5 flex-shrink-0" />
                <p>{rec}</p>
              </div>
            ))}
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-md mt-6">
            <div className="flex">
              <Phone className="h-5 w-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-blue-800">Overdose Emergency</h4>
                <p className="text-blue-700 mt-1">
                  If you suspect an overdose (slow/stopped breathing, unresponsiveness, blue/gray skin),
                  call 911 immediately, administer naloxone if available, and perform rescue breathing
                  if needed.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md mt-2">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-yellow-500 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-yellow-800">Important Reminder</h4>
                <p className="text-yellow-700 mt-1">
                  This analysis is for informational purposes only and should not replace professional medical advice.
                  Always consult your healthcare provider before making any changes to your medication regimen.
                </p>
              </div>
            </div>
          </div>

        </div>
      </CardContent>
    </Card>
  );
};
