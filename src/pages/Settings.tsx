import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { PinIcon, TrashIcon } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface Analysis {
  id: string;
  input_data: {
    currentMedications: { name: string }[];
  };
  result: {
    overallRisk?: number;
    totalMME?: number;
  };
  created_at: { seconds: number };
}

const Settings = () => {
  const [pinnedAnalyses, setPinnedAnalyses] = useState<Analysis[]>([]);
  const [darkMode, setDarkMode] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    const userJson = localStorage.getItem('user');
    if (!userJson) {
      navigate('/login');
      return;
    }

    const user = JSON.parse(userJson);

    const fetchPinnedAnalyses = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(
          `http://localhost:8000/analysis/pinned/${encodeURIComponent(user.email)}`
        );

        if (response.data?.analyses) {
          const validPinned = response.data.analyses.filter(
            (a: any) => a.result?.overallRisk !== undefined
          );
          setPinnedAnalyses(validPinned);
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to fetch pinned analyses.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchPinnedAnalyses();

    const isDark = localStorage.getItem('darkMode') === 'true';
    setDarkMode(isDark);
    document.documentElement.classList.toggle('dark', isDark);
  }, [navigate]);

  const toggleDarkMode = () => {
    const newDark = !darkMode;
    setDarkMode(newDark);
    localStorage.setItem('darkMode', String(newDark));
    document.documentElement.classList.toggle('dark', newDark);

    toast({ title: `${newDark ? 'Dark' : 'Light'} mode activated` });
  };

  const toggleNotifications = () => {
    setNotificationsEnabled(prev => !prev);
    toast({
      title: `Notifications ${!notificationsEnabled ? 'enabled' : 'disabled'}`,
    });
  };

  const unpinAnalysis = async (analysisId: string) => {
    try {
      await axios.put(`http://localhost:8000/analysis/${analysisId}/pin`, { pinned: false });
      setPinnedAnalyses(prev => prev.filter(a => a.id !== analysisId));

      toast({
        title: 'Analysis unpinned',
        description: 'Removed from your pinned items.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to unpin analysis.',
        variant: 'destructive',
      });
    }
  };

  const getRiskCategory = (risk: number) => {
    if (risk > 0.6) return 'High';
    if (risk > 0.3) return 'Moderate';
    return 'Low';
  };

  const getRiskColor = (risk: number) => {
    if (risk > 0.6) return 'text-red-500';
    if (risk > 0.3) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl animate-fade-in">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-6">Settings</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT PANEL — SETTINGS */}
        <div className="lg:col-span-1">
          <Card className="shadow-md h-full">
            <CardHeader>
              <CardTitle>App Settings</CardTitle>
              <CardDescription>Customize your experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <Label htmlFor="dark-mode" className="font-medium">Dark Mode</Label>
                <Switch id="dark-mode" checked={darkMode} onCheckedChange={toggleDarkMode} />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="notifications" className="font-medium">Notifications</Label>
                <Switch id="notifications" checked={notificationsEnabled} onCheckedChange={toggleNotifications} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT PANEL — PINNED ANALYSES */}
        <div className="lg:col-span-2">
          <Card className="shadow-md h-full">
            <CardHeader>
              <CardTitle className="flex items-center">
                <PinIcon className="h-5 w-5 mr-2 text-cyan-600" />
                Pinned Analyses
              </CardTitle>
              <CardDescription>Your saved medication analyses</CardDescription>
            </CardHeader>

            <CardContent>
              {isLoading ? (
                <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                  Loading...
                </div>
              ) : pinnedAnalyses.length > 0 ? (
                <div className="space-y-4">
                  {pinnedAnalyses.map((analysis) => {
                    const riskValue = analysis.result.overallRisk ?? 0;
                    const meds = analysis.input_data.currentMedications
                      ?.map(m => m.name)
                      .join(', ') || 'Unknown Medications';

                    return (
                      <div
                        key={analysis.id}
                        className="flex items-center justify-between p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg border border-cyan-100 dark:border-cyan-800"
                      >
                        <div className="flex-1">
                          <h3 className="font-medium dark:text-gray-100">
                            {new Date(analysis.created_at.seconds * 1000).toLocaleDateString()}
                            {' — '}
                            {meds}
                          </h3>

                          <p className={`text-sm ${getRiskColor(riskValue)}`}>
                            Risk Level: <span className="font-medium">{getRiskCategory(riskValue)}</span>
                          </p>
                        </div>

                        <Button variant="ghost" size="icon" onClick={() => unpinAnalysis(analysis.id)}>
                          <TrashIcon className="h-4 w-4 text-gray-500" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                  <PinIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No pinned analyses yet.</p>
                  <p className="text-sm mt-2">
                    Pin analyses from the history page for quick access.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;
